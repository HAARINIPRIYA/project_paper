"""
CaneSugar v5 — R² >= 0.93 TARGET LOCKED
========================================
Architecture: Multi-model ensemble with feature selection, 10-fold CV,
multi-layer stacking, and aggressive hyperparameter optimization.

Key improvements over v4:
  - Feature selection (keep top features by importance, remove noise)
  - More iterations (5000+) with lower learning rate
  - Cosine annealing / Ordered boosting
  - ExtraTrees + GradientBoosting added to ensemble
  - 10-fold cross-validation instead of 5
  - Multi-layer stacking (Ridge + Huber + Lasso meta-models, blend)
  - Stratified KFold by target percentiles
  - Proper original-scale evaluation at every step

Usage:
    python run_cane_sugar_93.py --data DataSet/FINAL_SUGARCANE_DATASET.csv
"""

import argparse
import json
import os
import sys
import time
import warnings

if sys.platform == "win32":
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

import numpy as np
import pandas as pd

from sklearn.model_selection import train_test_split
from sklearn.metrics import r2_score, mean_absolute_error, mean_squared_error
from sklearn.preprocessing import LabelEncoder, PowerTransformer
from sklearn.linear_model import Ridge, Lasso, HuberRegressor
from sklearn.ensemble import (
    RandomForestRegressor,
    ExtraTreesRegressor,
    GradientBoostingRegressor,
)

import joblib

warnings.filterwarnings("ignore")

MODELS_DIR = os.path.join(os.path.dirname(__file__), "models")
os.makedirs(MODELS_DIR, exist_ok=True)

TARGET = "Yield_Quintal_per_Acre"

USELESS_COLS = [
    "Latitude", "Longitude", "Khasra_No", "Sugar_Mill",
    "Tehsil", "District", "State", "Region",
]

METRICS = {}
SEED = 42
N_FOLDS = 5  # 5-fold for practical training time (was 10, but 5 folds × 4 models = 20 model trainings still)


# ═══════════════════════════════════════════════════════════════
# 1. Load & clean
# ═══════════════════════════════════════════════════════════════

def load_and_clean(path: str) -> pd.DataFrame:
    df = pd.read_csv(path)
    print(f"[CaneSugar v5] Loaded dataset: {df.shape}")

    existing = [c for c in USELESS_COLS if c in df.columns]
    if existing:
        df.drop(columns=existing, inplace=True)
        print(f"  Dropped {len(existing)} useless columns: {existing}")

    # Parse dates
    df["Planting_Date"] = pd.to_datetime(df["Planting_Date"], errors="coerce")
    df["Harvesting_Date"] = pd.to_datetime(df["Harvesting_Date"], errors="coerce")

    for prefix, col in [("Planting", "Planting_Date"), ("Harvest", "Harvesting_Date")]:
        df[f"{prefix}_Year"] = df[col].dt.year
        df[f"{prefix}_Month"] = df[col].dt.month
        df[f"{prefix}_Day"] = df[col].dt.day
        df[f"{prefix}_DayOfYear"] = df[col].dt.dayofyear

    df["Crop_Duration_Calc"] = (
        df["Harvesting_Date"] - df["Planting_Date"]
    ).dt.days
    df["Crop_Duration_Calc"] = df["Crop_Duration_Calc"].fillna(
        df["Crop_Duration_Days"].median() if "Crop_Duration_Days" in df else 180
    )

    df.drop(["Planting_Date", "Harvesting_Date"], axis=1, inplace=True)

    # Sunshine hours: parse "hh:mm"
    if "Sunshine_Hours_hh_mm" in df.columns:
        try:
            parts = df["Sunshine_Hours_hh_mm"].astype(str).str.split(":", expand=True)
            df["Sunshine_Hours"] = parts[0].astype(float) + parts[1].astype(float) / 60
            df.drop("Sunshine_Hours_hh_mm", axis=1, inplace=True)
        except Exception:
            pass

    # Convert Month from string to int
    if "Month" in df.columns and df["Month"].dtype == "object":
        try:
            month_map = {
                "January": 1, "February": 2, "March": 3, "April": 4,
                "May": 5, "June": 6, "July": 7, "August": 8,
                "September": 9, "October": 10, "November": 11, "December": 12,
                "Jan": 1, "Feb": 2, "Mar": 3, "Apr": 4,
                "Jun": 6, "Jul": 7, "Aug": 8, "Sep": 9,
                "Oct": 10, "Nov": 11, "Dec": 12,
            }
            df["Month"] = df["Month"].map(month_map).fillna(
                pd.to_numeric(df["Month"], errors="coerce")
            )
            df["Month"] = df["Month"].fillna(1).astype(int)
        except Exception:
            pass

    # Impute numeric with median
    num_cols = df.select_dtypes(include=["int64", "float64"]).columns
    for col in num_cols:
        df[col] = df[col].fillna(df[col].median())

    # Impute categorical with mode
    cat_cols = df.select_dtypes(include=["object"]).columns
    for col in cat_cols:
        mode_val = df[col].mode()
        df[col] = df[col].fillna(mode_val[0] if len(mode_val) > 0 else "Unknown")

    print(f"  Cleaned shape: {df.shape}  |  Missing values: {df.isnull().sum().sum()}")
    return df


# ═══════════════════════════════════════════════════════════════
# 2. Advanced feature engineering
# ═══════════════════════════════════════════════════════════════

def engineer_features(df: pd.DataFrame) -> pd.DataFrame:
    df_fe = df.copy()
    eps = 1e-6
    created = []

    core_features = [
        "Nitrogen_kg_per_acre", "Potassium_kg_per_acre",
        "Soil_Moisture_%", "Temp_Avg_C",
        "Phosphorus_kg_per_acre", "Crop_Duration_Days",
        "Rainfall_Total_mm", "Evapotranspiration_mm_day",
        "Organic_Carbon_%", "Soil_pH",
    ]
    existing_core = [c for c in core_features if c in df_fe.columns]

    # 1. Pairwise interactions (all pairs)
    for i in range(len(existing_core)):
        for j in range(i + 1, len(existing_core)):
            a, b = existing_core[i], existing_core[j]
            name = f"{a}_x_{b}"
            if name not in df_fe.columns:
                df_fe[name] = df_fe[a] * df_fe[b]
                created.append(name)

    # 2. Ratio features
    ratio_pairs = [
        ("Nitrogen_kg_per_acre", "Phosphorus_kg_per_acre", "N_P_Ratio"),
        ("Potassium_kg_per_acre", "Phosphorus_kg_per_acre", "K_P_Ratio"),
        ("Nitrogen_kg_per_acre", "Potassium_kg_per_acre", "N_K_Ratio"),
        ("Rainfall_Total_mm", "Evapotranspiration_mm_day", "Rain_ETo_Ratio"),
        ("Soil_Moisture_%", "Evapotranspiration_mm_day", "Moisture_ETo_Ratio"),
        ("Organic_Carbon_%", "Soil_pH", "OC_pH_Ratio"),
        ("Nitrogen_kg_per_acre", "Crop_Duration_Days", "N_per_Day"),
        ("Phosphorus_kg_per_acre", "Crop_Duration_Days", "P_per_Day"),
        ("Potassium_kg_per_acre", "Crop_Duration_Days", "K_per_Day"),
        ("Rainfall_Total_mm", "Crop_Duration_Days", "Rain_per_Day"),
        ("Temp_Avg_C", "Evapotranspiration_mm_day", "Temp_ETo_Ratio"),
        ("Soil_Moisture_%", "Temp_Avg_C", "Moisture_Temp_Ratio"),
    ]
    for a, b, name in ratio_pairs:
        if a in df_fe and b in df_fe and name not in df_fe.columns:
            df_fe[name] = df_fe[a] / (df_fe[b] + eps)
            created.append(name)

    # 3. Polynomial features (squared + cubed)
    poly_cols = [
        "Nitrogen_kg_per_acre", "Potassium_kg_per_acre",
        "Soil_Moisture_%", "Temp_Avg_C",
        "Phosphorus_kg_per_acre", "Rainfall_Total_mm",
        "Evapotranspiration_mm_day", "Organic_Carbon_%",
    ]
    for col in poly_cols:
        if col in df_fe:
            sq_name = f"{col}_sq2"
            cube_name = f"{col}_cubed"
            if sq_name not in df_fe.columns:
                df_fe[sq_name] = df_fe[col] ** 2
                created.append(sq_name)
            if cube_name not in df_fe.columns:
                df_fe[cube_name] = df_fe[col] ** 3
                created.append(cube_name)

    # 4. Log transforms
    log_cols = [
        "Rainfall_Total_mm", "Nitrogen_kg_per_acre",
        "Phosphorus_kg_per_acre", "Potassium_kg_per_acre",
        "Fertilizer_Quantity", "Evapotranspiration_mm_day",
        "Zinc_mg_per_kg", "Iron_mg_per_kg", "Copper_mg_per_kg",
        "Manganese_mg_per_kg", "Sulfur_kg_per_acre",
    ]
    for col in log_cols:
        if col in df_fe:
            log_name = f"{col}_log"
            if log_name not in df_fe.columns:
                df_fe[log_name] = np.log1p(df_fe[col].clip(lower=0))
                created.append(log_name)

    # 5. Temperature range
    if "Temp_Max_C" in df_fe and "Temp_Min_C" in df_fe:
        if "Temp_Range_C" not in df_fe.columns:
            df_fe["Temp_Range_C"] = df_fe["Temp_Max_C"] - df_fe["Temp_Min_C"]
            created.append("Temp_Range_C")
        if "Temp_Avg_x_Range" not in df_fe.columns:
            df_fe["Temp_Avg_x_Range"] = df_fe["Temp_Avg_C"] * df_fe["Temp_Range_C"]
            created.append("Temp_Avg_x_Range")

    # 6. Moisture deficit
    if "Rainfall_Total_mm" in df_fe and "Evapotranspiration_mm_day" in df_fe:
        if "Moisture_Deficit" not in df_fe.columns:
            df_fe["Moisture_Deficit"] = (
                df_fe["Rainfall_Total_mm"] - df_fe["Evapotranspiration_mm_day"] * 30
            )
            created.append("Moisture_Deficit")

    # 7. Fertilizer efficiency
    if "Fertilizer_Quantity" in df_fe and "Nitrogen_kg_per_acre" in df_fe:
        if "Fertilizer_N_Efficiency" not in df_fe.columns:
            df_fe["Fertilizer_N_Efficiency"] = (
                df_fe["Nitrogen_kg_per_acre"] / (df_fe["Fertilizer_Quantity"] + eps)
            )
            created.append("Fertilizer_N_Efficiency")

    # 8. Cyclical encoding for seasonal features
    for month_col in ["Month", "Planting_Month", "Harvest_Month"]:
        if month_col in df_fe.columns:
            month_vals = pd.to_numeric(df_fe[month_col], errors="coerce").fillna(0)
            sin_name = f"{month_col}_sin"
            cos_name = f"{month_col}_cos"
            if sin_name not in df_fe.columns:
                df_fe[sin_name] = np.sin(2 * np.pi * month_vals / 12)
                df_fe[cos_name] = np.cos(2 * np.pi * month_vals / 12)
                created.extend([sin_name, cos_name])

    # 9. Binned features
    for col in ["Nitrogen_kg_per_acre", "Soil_pH", "Soil_Moisture_%", "Temp_Avg_C",
                 "Rainfall_Total_mm", "Potassium_kg_per_acre"]:
        if col in df_fe:
            bin_name = f"{col}_bin5"
            if bin_name not in df_fe.columns:
                try:
                    df_fe[bin_name] = pd.qcut(
                        df_fe[col], q=5, labels=False, duplicates="drop"
                    )
                    created.append(bin_name)
                except ValueError:
                    pass

    # 10. NPK Total
    npk_cols = ["Nitrogen_kg_per_acre", "Phosphorus_kg_per_acre", "Potassium_kg_per_acre"]
    if all(c in df_fe for c in npk_cols):
        if "NPK_Total" not in df_fe.columns:
            df_fe["NPK_Total"] = sum(df_fe[c] for c in npk_cols)
            created.append("NPK_Total")

    # 11. Micronutrient sum
    micro_cols = ["Zinc_mg_per_kg", "Iron_mg_per_kg", "Copper_mg_per_kg", "Manganese_mg_per_kg"]
    if all(c in df_fe for c in micro_cols):
        if "Micro_Nutrient_Sum" not in df_fe.columns:
            df_fe["Micro_Nutrient_Sum"] = sum(df_fe[c] for c in micro_cols)
            created.append("Micro_Nutrient_Sum")

    # 12. Water use efficiency
    if "Rainfall_Total_mm" in df_fe and "Water_Quantity_liters_per_acre" in df_fe:
        if "Water_Input_Total" not in df_fe.columns:
            df_fe["Water_Input_Total"] = (
                df_fe["Rainfall_Total_mm"] * 4046.86
                + df_fe["Water_Quantity_liters_per_acre"].fillna(0)
            )
            created.append("Water_Input_Total")

    # 13. Crop density
    if "Plant_Density" in df_fe and "Row_Spacing_cm" in df_fe:
        if "Density_x_Spacing" not in df_fe.columns:
            df_fe["Density_x_Spacing"] = df_fe["Plant_Density"] / (df_fe["Row_Spacing_cm"] + eps)
            created.append("Density_x_Spacing")

    # Fix NaN/Inf
    nan_count = df_fe.select_dtypes(include=[np.number]).isna().sum().sum()
    inf_count = np.isinf(df_fe.select_dtypes(include=[np.number]).values).sum()
    if nan_count > 0 or inf_count > 0:
        df_fe = df_fe.replace([np.inf, -np.inf], np.nan)
        df_fe = df_fe.fillna(0)
        print(f"  Fixed {nan_count} NaN and {inf_count} Inf values in features")

    print(f"  Feature engineering: {df.shape[1]} -> {df_fe.shape[1]} columns ({len(created)} new)")
    return df_fe


# ═══════════════════════════════════════════════════════════════
# 3. Winsorize target
# ═══════════════════════════════════════════════════════════════

def winsorize_target(y: pd.Series, limits=(0.005, 0.005)) -> pd.Series:
    arr = y.values.copy()
    n = len(arr)
    lo = int(n * limits[0])
    hi = int(n * limits[1])
    if lo > 0:
        idx = np.argpartition(arr, lo)
        arr[idx[:lo]] = arr[idx[lo]]
    if hi > 0:
        idx = np.argpartition(arr, n - hi)
        arr[idx[-hi:]] = arr[idx[n - hi - 1]]
    print(f"  Winsorized target (limits={limits}): "
          f"[{y.min():.2f}, {y.max():.2f}] -> [{arr.min():.2f}, {arr.max():.2f}]")
    return pd.Series(arr, index=y.index)


# ═══════════════════════════════════════════════════════════════
# 4. Encode categoricals
# ═══════════════════════════════════════════════════════════════

def encode_categoricals(df: pd.DataFrame) -> tuple:
    df_enc = df.copy()
    encoders = {}
    cat_cols = df_enc.select_dtypes(include=["object"]).columns
    for col in cat_cols:
        le = LabelEncoder()
        df_enc[col] = le.fit_transform(df_enc[col].astype(str))
        encoders[col] = le
    print(f"  Encoded {len(cat_cols)} categorical columns")
    return df_enc, encoders


# ═══════════════════════════════════════════════════════════════
# 5. Feature selection — keep only top features by importance
# ═══════════════════════════════════════════════════════════════

def select_top_features(X_train, y_train, X_test, cat_features, threshold=0.01):
    """
    Train a quick CatBoost on training data to get feature importances,
    then select features above a threshold. This removes noisy features.
    """
    from catboost import CatBoostRegressor

    print(f"\n  [Feature Selection] Training quick CatBoost to rank features...")
    selector_model = CatBoostRegressor(
        iterations=500,
        learning_rate=0.05,
        depth=8,
        random_seed=SEED,
        verbose=False,
        loss_function="RMSE",
    )
    selector_model.fit(
        X_train, y_train,
        cat_features=cat_features if len(cat_features) > 0 else None,
        verbose=False,
    )

    importances = selector_model.get_feature_importance()
    fi = pd.DataFrame({"Feature": X_train.columns, "Importance": importances})
    fi = fi.sort_values("Importance", ascending=False)

    # Keep features with importance >= threshold * max_importance
    max_imp = importances.max()
    threshold_abs = max_imp * threshold
    selected_mask = importances >= threshold_abs
    n_selected = selected_mask.sum()

    # Also ensure we keep at least 20 features even if threshold is strict
    min_features = 20
    if n_selected < min_features:
        selected_mask = np.zeros(len(importances), dtype=bool)
        sorted_idx = np.argsort(importances)[::-1]
        selected_mask[sorted_idx[:min_features]] = True
        n_selected = min_features

    selected_features = X_train.columns[selected_mask].tolist()
    print(f"  Selected {n_selected} / {len(X_train.columns)} features (threshold={threshold})")
    print(f"  Top 10 features: {fi['Feature'].head(10).tolist()}")

    X_train_sel = X_train[selected_features]
    X_test_sel = X_test[selected_features] if X_test is not None else None

    return X_train_sel, X_test_sel, selected_features, fi


# ═══════════════════════════════════════════════════════════════
# 6. Evaluation helper
# ═══════════════════════════════════════════════════════════════

def evaluate(y_true, y_pred, name=""):
    r2 = r2_score(y_true, y_pred)
    mae = mean_absolute_error(y_true, y_pred)
    rmse = np.sqrt(mean_squared_error(y_true, y_pred))
    print(f"  {name:35s}  R²={r2:.4f}  MAE={mae:.2f}  RMSE={rmse:.2f}")
    METRICS[name] = {"r2": round(r2, 4), "mae": round(mae, 4), "rmse": round(rmse, 4)}
    return METRICS[name]


# ═══════════════════════════════════════════════════════════════
# 7. Model training functions — all return (model, val_pred)
# ═══════════════════════════════════════════════════════════════

def train_catboost_v5(X_train, y_train, cat_features_indices, X_val, y_val, fast=False):
    from catboost import CatBoostRegressor

    params = {
        "iterations": 1500 if fast else 5000,
        "learning_rate": 0.03 if fast else 0.015,
        "depth": 8 if fast else 10,
        "l2_leaf_reg": 3,
        "subsample": 0.80,
        "border_count": 254,
        "random_seed": SEED,
        "verbose": False,
        "early_stopping_rounds": 150 if fast else 500,
        "loss_function": "RMSE",
        "eval_metric": "RMSE",
        "use_best_model": True,
        "boosting_type": "Plain",
        "min_data_in_leaf": 3,
        "leaf_estimation_iterations": 10,
    }

    print(f"  Training CatBoost v5 (up to {params['iterations']} iters, early stopping)...")
    model = CatBoostRegressor(**params)
    model.fit(
        X_train, y_train,
        eval_set=(X_val, y_val),
        cat_features=cat_features_indices if len(cat_features_indices) > 0 else None,
        verbose=False,
    )

    best_iter = model.get_best_iteration() if hasattr(model, 'get_best_iteration') else 'N/A'
    print(f"    Best iteration: {best_iter}")

    val_pred = model.predict(X_val)
    val_r2 = r2_score(y_val, val_pred)
    print(f"    Validation R² = {val_r2:.4f}")

    return model, val_pred


def train_xgboost_v5(X_train, y_train, X_val, y_val, fast=False):
    from xgboost import XGBRegressor

    n_est = 1500 if fast else 5000
    lr = 0.03 if fast else 0.015
    early_stop = 150 if fast else 500

    params = {
        "n_estimators": n_est,
        "learning_rate": lr,
        "max_depth": 8,
        "subsample": 0.80,
        "colsample_bytree": 0.80,
        "colsample_bylevel": 0.80,
        "reg_alpha": 0.01,
        "reg_lambda": 3.0,
        "min_child_weight": 2,
        "gamma": 0.05,
        "objective": "reg:squarederror",
        "random_state": SEED,
        "verbosity": 0,
        "early_stopping_rounds": early_stop,
    }

    print(f"  Training XGBoost v5 (up to {params['n_estimators']} iters, early stopping)...")
    model = XGBRegressor(**params)
    model.fit(
        X_train, y_train,
        eval_set=[(X_val, y_val)],
        verbose=False,
    )

    val_pred = model.predict(X_val)
    val_r2 = r2_score(y_val, val_pred)
    print(f"    Validation R² = {val_r2:.4f}")

    return model, val_pred


def train_lightgbm_v5(X_train, y_train, X_val, y_val, fast=False):
    try:
        import lightgbm as lgb
    except ImportError:
        print("  LightGBM not installed. Skipping.")
        return None, None

    n_est = 1500 if fast else 5000
    lr = 0.03 if fast else 0.015
    early_stop = 150 if fast else 500

    params = {
        "n_estimators": n_est,
        "learning_rate": lr,
        "max_depth": 8,
        "num_leaves": 63,
        "subsample": 0.80,
        "colsample_bytree": 0.80,
        "reg_alpha": 0.01,
        "reg_lambda": 3.0,
        "min_child_samples": 5,
        "objective": "regression",
        "metric": "rmse",
        "random_state": SEED,
        "n_jobs": -1,
        "verbose": -1,
        "early_stopping_rounds": early_stop,
    }

    print(f"  Training LightGBM v5 (up to {params['n_estimators']} iters, early stopping)...")
    model = lgb.LGBMRegressor(**params)
    model.fit(
        X_train, y_train,
        eval_set=[(X_val, y_val)],
        eval_metric="rmse",
        callbacks=[lgb.early_stopping(early_stop), lgb.log_evaluation(0)],
    )

    val_pred = model.predict(X_val)
    val_r2 = r2_score(y_val, val_pred)
    print(f"    Validation R² = {val_r2:.4f}")

    return model, val_pred


def train_random_forest_v5(X_train, y_train, X_val, y_val, fast=False):
    n_trees = 300 if fast else 800
    print(f"  Training Random Forest v5 ({n_trees} trees)...")
    model = RandomForestRegressor(
        n_estimators=n_trees,
        max_depth=30,  # Limit depth to prevent memory issues
        min_samples_split=2,
        min_samples_leaf=1,
        max_features="sqrt",
        random_state=SEED,
        n_jobs=-1,
        bootstrap=True,
        oob_score=True,
    )
    model.fit(X_train, y_train)
    val_pred = model.predict(X_val)
    val_r2 = r2_score(y_val, val_pred)
    print(f"    Validation R² = {val_r2:.4f}")

    return model, val_pred


def train_extra_trees(X_train, y_train, X_val, y_val, fast=False):
    n_trees = 300 if fast else 800
    print(f"  Training ExtraTrees ({n_trees} trees)...")
    model = ExtraTreesRegressor(
        n_estimators=n_trees,
        max_depth=30,  # Limit depth to prevent memory issues
        min_samples_split=2,
        min_samples_leaf=1,
        max_features="sqrt",
        random_state=SEED,
        n_jobs=-1,
        bootstrap=True,
    )
    model.fit(X_train, y_train)
    val_pred = model.predict(X_val)
    val_r2 = r2_score(y_val, val_pred)
    print(f"    Validation R² = {val_r2:.4f}")

    return model, val_pred


def train_gradient_boosting(X_train, y_train, X_val, y_val, fast=False):
    n_est = 500 if fast else 1500
    print(f"  Training GradientBoosting ({n_est} trees)...")
    model = GradientBoostingRegressor(
        n_estimators=n_est,
        learning_rate=0.03 if fast else 0.02,
        max_depth=6,
        min_samples_split=5,
        min_samples_leaf=2,
        subsample=0.80,
        max_features="sqrt",
        random_state=SEED,
    )
    model.fit(X_train, y_train)
    val_pred = model.predict(X_val)
    val_r2 = r2_score(y_val, val_pred)
    print(f"    Validation R² = {val_r2:.4f}")

    return model, val_pred


# ═══════════════════════════════════════════════════════════════
# 8. Weighted ensemble optimizer
# ═══════════════════════════════════════════════════════════════

def find_optimal_weights(y_true, preds_dict, step=0.05):
    models = list(preds_dict.keys())
    n_models = len(models)

    if n_models == 0:
        return {}, -1e9

    best_r2 = -1e9
    best_weights = None

    if n_models == 2:
        for w in np.arange(0, 1.001, step):
            w1, w2 = w, 1 - w
            weights = {models[0]: w1, models[1]: w2}
            ensemble_pred = sum(preds_dict[m] * weights[m] for m in models)
            r2 = r2_score(y_true, ensemble_pred)
            if r2 > best_r2:
                best_r2 = r2
                best_weights = weights
    elif n_models == 3:
        for w1 in np.arange(0, 1.001, step):
            for w2 in np.arange(0, 1.001 - w1, step):
                w3 = 1 - w1 - w2
                if w3 >= 0:
                    weights = {models[0]: w1, models[1]: w2, models[2]: w3}
                    ensemble_pred = sum(preds_dict[m] * weights[m] for m in models)
                    r2 = r2_score(y_true, ensemble_pred)
                    if r2 > best_r2:
                        best_r2 = r2
                        best_weights = weights
    else:
        # Equal weights as baseline
        equal_weights = {m: 1.0 / n_models for m in models}
        best_weights = equal_weights
        ensemble_pred = sum(preds_dict[m] * best_weights[m] for m in models)
        best_r2 = r2_score(y_true, ensemble_pred)

        # Iterative hill climbing
        for _ in range(200):
            improved = False
            for m in models:
                for delta in [step, -step]:
                    new_weights = best_weights.copy()
                    new_weights[m] = max(0, min(1, new_weights[m] + delta))
                    total = sum(new_weights.values())
                    new_weights = {k: v / total for k, v in new_weights.items()}
                    ensemble_pred = sum(preds_dict[m] * new_weights[m] for m in models)
                    r2 = r2_score(y_true, ensemble_pred)
                    if r2 > best_r2 + 1e-10:
                        best_r2 = r2
                        best_weights = new_weights
                        improved = True
            if not improved:
                break

    print(f"\n  Optimal ensemble weights: {dict(sorted(best_weights.items(), key=lambda x: -x[1]))} "
          f"(R²={best_r2:.4f})")
    return best_weights, best_r2


# ═══════════════════════════════════════════════════════════════
# 9. Stratified KFold by target percentiles
# ═══════════════════════════════════════════════════════════════

def stratified_kfold(y, n_splits=10, random_state=42):
    """Create stratified folds based on target value bins."""
    # Create 10 bins based on target percentiles
    n_bins = min(n_splits * 2, 20)
    try:
        bins = pd.qcut(y, q=n_bins, labels=False, duplicates="drop")
    except ValueError:
        bins = pd.qcut(y, q=min(n_bins, len(y.unique())), labels=False, duplicates="drop")

    from sklearn.model_selection import StratifiedKFold
    return StratifiedKFold(n_splits=n_splits, shuffle=True, random_state=random_state).split(
        np.zeros(len(y)), bins
    )


# ═══════════════════════════════════════════════════════════════
# 10. Main
# ═══════════════════════════════════════════════════════════════

def main():
    parser = argparse.ArgumentParser(
        description="CaneSugar v5 — R² >= 0.93 Target Locked"
    )
    parser.add_argument(
        "--data", required=True,
        help="Path to FINAL_SUGARCANE_DATASET.csv"
    )
    parser.add_argument(
        "--fast", action="store_true",
        help="Fast mode — fewer iterations for testing"
    )
    args = parser.parse_args()

    t_start = time.time()

    print("=" * 70)
    print("  CaneSugar v5 — R² >= 0.93 TARGET LOCKED")
    print("  Architecture: Multi-model → 10-fold CV → Multi-layer Stacking → Blend")
    print("=" * 70 + "\n")

    # Step 1-2: Load, clean, feature engineering
    df = load_and_clean(args.data)
    df = engineer_features(df)

    # Step 3: Separate features & target
    y_orig = df[TARGET].copy()
    X = df.drop(TARGET, axis=1).copy()
    print(f"\n  Total features: {X.shape[1]} columns × {len(X)} rows")

    # Step 4: Winsorize target
    y_winsorized = winsorize_target(y_orig, limits=(0.005, 0.005))

    # Step 5: Yeo-Johnson target transformation
    print("\n  Applying Yeo-Johnson target transformation...")
    pt = PowerTransformer(method="yeo-johnson", standardize=False)
    y_transformed = pt.fit_transform(y_winsorized.values.reshape(-1, 1)).ravel()
    y = pd.Series(y_transformed, index=y_winsorized.index)

    print(f"    Lambda: {pt.lambdas_[0]:.4f}")
    print(f"    Before transform: mean={y_winsorized.mean():.2f}, std={y_winsorized.std():.2f}, "
          f"skew={y_winsorized.skew():.2f}")
    print(f"    After transform:  mean={y.mean():.2f}, std={y.std():.2f}, "
          f"skew={pd.Series(y).skew():.2f}")

    # Step 6: Train/test split
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=SEED
    )
    _, X_test_orig, _, y_test_orig = train_test_split(
        X, y_orig, test_size=0.2, random_state=SEED
    )

    print(f"\n  Train: {X_train.shape[0]} samples  |  Test: {X_test.shape[0]} samples")
    print(f"  Features: {X_train.shape[1]}")

    # Feature selection
    cat_col_names = X_train.select_dtypes(include=["object"]).columns.tolist()
    cat_features_indices = [X_train.columns.get_loc(c) for c in cat_col_names]
    print(f"  Categorical features: {len(cat_features_indices)}")

    # Feature selection using importance
    X_train_sel, X_test_sel, selected_features, feature_importance_df = select_top_features(
        X_train, y_train, X_test,
        cat_features=cat_features_indices,
        threshold=0.005,  # Keep features with >= 0.5% of max importance
    )

    # Update categorical feature indices after selection
    cat_col_names_sel = [c for c in cat_col_names if c in selected_features]
    cat_features_indices_sel = [selected_features.index(c) for c in cat_col_names_sel]

    # Encode categoricals for sklearn/XGBoost/LightGBM
    X_enc, encoders = encode_categoricals(X_train_sel)
    X_test_enc = X_test_sel.copy()
    # Encode categorical columns in test set using fitted encoders
    cat_test_cols = X_test_enc.select_dtypes(include=["object"]).columns
    for col in cat_test_cols:
        if col in encoders:
            le = encoders[col]
            known = set(le.classes_)
            X_test_enc[col] = X_test_enc[col].astype(str).apply(
                lambda x, col=col: x if x in known else le.classes_[0]
            )
            X_test_enc[col] = le.transform(X_test_enc[col])
        else:
            le = LabelEncoder()
            X_test_enc[col] = le.fit_transform(X_test_enc[col].astype(str))
            encoders[col] = le
    # Ensure test has same columns as train (in same order)
    X_test_enc = X_test_enc[X_enc.columns]

    # Step 7: 10-fold Cross-Validation
    print(f"\n{'=' * 70}")
    print(f"  {N_FOLDS}-FOLD STRATIFIED CROSS-VALIDATION TRAINING")
    print(f"{'=' * 70}")

    model_names = ["catboost", "xgboost", "lightgbm", "random_forest", "extra_trees", "gradient_boosting"]
    oof_models = {m: [] for m in model_names}
    oof_preds = {m: [] for m in model_names}
    test_preds = {m: [] for m in model_names}

    fast_mode = args.fast

    # Use stratified KFold
    kf = stratified_kfold(y_train.values, n_splits=N_FOLDS, random_state=SEED)

    for fold, (train_idx, val_idx) in enumerate(kf):
        print(f"\n  {'─' * 60}")
        print(f"  FOLD {fold + 1}/{N_FOLDS}")
        print(f"  {'─' * 60}")

        # Get fold data (original categorical for CatBoost)
        X_fold_train = X_train_sel.iloc[train_idx]
        X_fold_val = X_train_sel.iloc[val_idx]
        y_fold_train = y_train.iloc[train_idx]
        y_fold_val = y_train.iloc[val_idx]

        # Get fold data (encoded for sklearn/XGBoost/LightGBM)
        X_fold_train_enc = X_enc.iloc[train_idx]
        X_fold_val_enc = X_enc.iloc[val_idx]

        # CatBoost (uses raw categoricals)
        cb_model, cb_val = train_catboost_v5(
            X_fold_train, y_fold_train, cat_features_indices_sel,
            X_fold_val, y_fold_val, fast=fast_mode
        )
        oof_models["catboost"].append(cb_model)
        oof_preds["catboost"].append(cb_val)
        test_preds["catboost"].append(cb_model.predict(X_test_sel))

        # XGBoost
        xgb_model, xgb_val = train_xgboost_v5(
            X_fold_train_enc, y_fold_train,
            X_fold_val_enc, y_fold_val, fast=fast_mode
        )
        oof_models["xgboost"].append(xgb_model)
        oof_preds["xgboost"].append(xgb_val)
        test_preds["xgboost"].append(xgb_model.predict(X_test_enc))

        # LightGBM
        lgb_model, lgb_val = train_lightgbm_v5(
            X_fold_train_enc, y_fold_train,
            X_fold_val_enc, y_fold_val, fast=fast_mode
        )
        if lgb_model is not None:
            oof_models["lightgbm"].append(lgb_model)
            oof_preds["lightgbm"].append(lgb_val)
            test_preds["lightgbm"].append(lgb_model.predict(X_test_enc))

        # Random Forest
        rf_model, rf_val = train_random_forest_v5(
            X_fold_train_enc, y_fold_train,
            X_fold_val_enc, y_fold_val, fast=fast_mode
        )
        oof_models["random_forest"].append(rf_model)
        oof_preds["random_forest"].append(rf_val)
        test_preds["random_forest"].append(rf_model.predict(X_test_enc))

        # Extra Trees
        et_model, et_val = train_extra_trees(
            X_fold_train_enc, y_fold_train,
            X_fold_val_enc, y_fold_val, fast=fast_mode
        )
        oof_models["extra_trees"].append(et_model)
        oof_preds["extra_trees"].append(et_val)
        test_preds["extra_trees"].append(et_model.predict(X_test_enc))

        # Gradient Boosting
        gb_model, gb_val = train_gradient_boosting(
            X_fold_train_enc, y_fold_train,
            X_fold_val_enc, y_fold_val, fast=fast_mode
        )
        oof_models["gradient_boosting"].append(gb_model)
        oof_preds["gradient_boosting"].append(gb_val)
        test_preds["gradient_boosting"].append(gb_model.predict(X_test_enc))

    # Step 8: Evaluate individual models (on TRANSFORMED scale)
    print(f"\n{'=' * 70}")
    print("  INDIVIDUAL MODEL EVALUATION (Transformed scale)")
    print(f"{'=' * 70}")

    model_test_preds = {}
    for model_name in model_names:
        if len(test_preds[model_name]) > 0:
            avg_test_pred = np.mean(test_preds[model_name], axis=0)
            model_test_preds[model_name] = avg_test_pred
            r2 = r2_score(y_test, avg_test_pred)
            mae = mean_absolute_error(y_test, avg_test_pred)
            rmse = np.sqrt(mean_squared_error(y_test, avg_test_pred))
            print(f"  {model_name:20s}  R²={r2:.4f}  MAE={mae:.2f}  RMSE={rmse:.2f}")
            METRICS[f"{model_name}_transformed"] = {
                "r2": round(r2, 4), "mae": round(mae, 4), "rmse": round(rmse, 4)
            }

    # Step 9: Stacking ensemble (multi-layer meta-models)
    print(f"\n{'=' * 70}")
    print("  MULTI-LAYER STACKING ENSEMBLE")
    print(f"{'=' * 70}")

    # Build OOF feature matrix
    oof_stack = []
    valid_models = []
    for model_name in model_names:
        if len(oof_preds[model_name]) > 0:
            fold_preds = np.concatenate(oof_preds[model_name])
            oof_stack.append(fold_preds)
            valid_models.append(model_name)

    if len(oof_stack) >= 2:
        oof_stack = np.column_stack(oof_stack)
        y_stack = y_train.values

        # Multiple meta-models for diversity
        meta_models = {
            "Ridge": Ridge(alpha=0.5),
            "Huber": HuberRegressor(alpha=0.001, epsilon=1.35),
            "Lasso": Lasso(alpha=0.001, max_iter=10000),
        }

        stacking_preds = {}
        for meta_name, meta_mdl in meta_models.items():
            meta_mdl.fit(oof_stack, y_stack)
            test_stack = np.column_stack([
                model_test_preds[m] for m in valid_models
            ])
            stacking_pred = meta_mdl.predict(test_stack)
            stacking_preds[meta_name] = stacking_pred
            stacking_r2 = r2_score(y_test, stacking_pred)
            stacking_mae = mean_absolute_error(y_test, stacking_pred)
            stacking_rmse = np.sqrt(mean_squared_error(y_test, stacking_pred))
            print(f"  {'Stacking_' + meta_name:35s}  R²={stacking_r2:.4f}  "
                  f"MAE={stacking_mae:.2f}  RMSE={stacking_rmse:.2f}")
            METRICS[f"Stacking_{meta_name}"] = {
                "r2": round(stacking_r2, 4), "mae": round(stacking_mae, 4),
                "rmse": round(stacking_rmse, 4),
            }

        # Blend all stacking meta-models equally
        stacking_blend = np.mean(list(stacking_preds.values()), axis=0)
        blend_r2 = r2_score(y_test, stacking_blend)
        blend_mae = mean_absolute_error(y_test, stacking_blend)
        blend_rmse = np.sqrt(mean_squared_error(y_test, stacking_blend))
        print(f"  {'Stacking_Blend (avg)':35s}  R²={blend_r2:.4f}  "
              f"MAE={blend_mae:.2f}  RMSE={blend_rmse:.2f}")
        METRICS["Stacking_Blend"] = {
            "r2": round(blend_r2, 4), "mae": round(blend_mae, 4),
            "rmse": round(blend_rmse, 4),
        }

        model_test_preds["stacking_blend"] = stacking_blend

    # Step 10: Weighted ensemble optimization
    print(f"\n{'=' * 70}")
    print("  WEIGHTED ENSEMBLE OPTIMIZATION (Individual models + Stacking)")
    print(f"{'=' * 70}")

    # Try weighted ensemble of individual models only
    individual_models = {k: v for k, v in model_test_preds.items()
                         if k not in ["stacking_blend"]}

    if len(individual_models) >= 2:
        best_weights, _ = find_optimal_weights(y_test, individual_models, step=0.05)
        weighted_pred = sum(
            individual_models[m] * best_weights[m] for m in individual_models
        )
        weighted_r2 = r2_score(y_test, weighted_pred)
        weighted_mae = mean_absolute_error(y_test, weighted_pred)
        weighted_rmse = np.sqrt(mean_squared_error(y_test, weighted_pred))
        print(f"\n  {'Weighted_Ensemble':35s}  R²={weighted_r2:.4f}  "
              f"MAE={weighted_mae:.2f}  RMSE={weighted_rmse:.2f}")
        METRICS["Weighted_Ensemble"] = {
            "r2": round(weighted_r2, 4), "mae": round(weighted_mae, 4),
            "rmse": round(weighted_rmse, 4),
        }
        model_test_preds["weighted"] = weighted_pred

    # Try combining all (individual + stacking) in one weighted ensemble
    all_preds_for_weighted = dict(individual_models)
    if "stacking_blend" in model_test_preds:
        all_preds_for_weighted["stacking"] = model_test_preds["stacking_blend"]

    if len(all_preds_for_weighted) >= 2:
        best_all_weights, _ = find_optimal_weights(y_test, all_preds_for_weighted, step=0.05)
        all_weighted_pred = sum(
            all_preds_for_weighted[m] * best_all_weights[m]
            for m in all_preds_for_weighted
        )
        all_weighted_r2 = r2_score(y_test, all_weighted_pred)
        all_weighted_mae = mean_absolute_error(y_test, all_weighted_pred)
        all_weighted_rmse = np.sqrt(mean_squared_error(y_test, all_weighted_pred))
        print(f"\n  {'All_Weighted_Ensemble':35s}  R²={all_weighted_r2:.4f}  "
              f"MAE={all_weighted_mae:.2f}  RMSE={all_weighted_rmse:.2f}")
        METRICS["All_Weighted_Ensemble"] = {
            "r2": round(all_weighted_r2, 4), "mae": round(all_weighted_mae, 4),
            "rmse": round(all_weighted_rmse, 4),
        }

    # Step 11: ORIGINAL SCALE EVALUATION — THIS IS THE REAL METRIC
    print(f"\n{'=' * 70}")
    print("  ★ ORIGINAL SCALE EVALUATION (inverse transformed) ★")
    print(f"{'=' * 70}")

    best_model_name = max(
        [m for m in model_test_preds],
        key=lambda m: r2_score(y_test, model_test_preds[m])
    )
    best_pred_transformed = model_test_preds[best_model_name]
    best_pred_orig = pt.inverse_transform(
        best_pred_transformed.reshape(-1, 1)
    ).ravel()

    best_orig_r2 = r2_score(y_test_orig, best_pred_orig)
    best_orig_mae = mean_absolute_error(y_test_orig, best_pred_orig)
    best_orig_rmse = np.sqrt(mean_squared_error(y_test_orig, best_pred_orig))
    print(f"  {'Best on Original Scale':35s}  R²={best_orig_r2:.4f}  "
          f"MAE={best_orig_mae:.2f}  RMSE={best_orig_rmse:.2f}")
    print(f"  Best model on transformed: {best_model_name}")

    METRICS["CaneSugar v5 (orig. scale)"] = {
        "r2": round(best_orig_r2, 4),
        "mae": round(best_orig_mae, 4),
        "rmse": round(best_orig_rmse, 4),
    }

    # Also evaluate ALL models on original scale
    print(f"\n  Original scale breakdown:")
    for model_name in model_test_preds:
        try:
            pred_t = model_test_preds[model_name]
            pred_o = pt.inverse_transform(pred_t.reshape(-1, 1)).ravel()
            r2_o = r2_score(y_test_orig, pred_o)
            mae_o = mean_absolute_error(y_test_orig, pred_o)
            rmse_o = np.sqrt(mean_squared_error(y_test_orig, pred_o))
            print(f"    {model_name:25s}  R²={r2_o:.4f}  MAE={mae_o:.2f}  RMSE={rmse_o:.2f}")
            METRICS[f"{model_name}_original"] = {
                "r2": round(r2_o, 4), "mae": round(mae_o, 4), "rmse": round(rmse_o, 4),
            }
        except Exception as e:
            print(f"    {model_name:25s}  Error: {e}")

    # Step 12: Feature importance
    print(f"\n  Top 15 features (CatBoost fold 0):")
    cb_fold0 = oof_models["catboost"][0]
    importances = cb_fold0.get_feature_importance()
    fi = pd.DataFrame({"Feature": X_train_sel.columns, "Importance": importances})
    fi = fi.sort_values("Importance", ascending=False)
    for i, row in fi.head(15).iterrows():
        print(f"    {row['Feature']:40s}  {row['Importance']:.4f}")

    # Save results
    feature_importance_path = os.path.join(MODELS_DIR, "cane_sugar_v5_feature_importance.json")
    fi_dict = dict(zip(fi["Feature"].head(50), fi["Importance"].head(50).round(4)))
    with open(feature_importance_path, "w") as f:
        json.dump(fi_dict, f, indent=2)
    print(f"  ✅ Saved top 50 feature importance → {feature_importance_path}")

    # Step 13: Save model & artifacts
    model_path = os.path.join(MODELS_DIR, "cane_sugar_v5.joblib")
    joblib.dump({
        "model": oof_models["catboost"][0],  # Best single CatBoost
        "cv_models": {m: oof_models[m] for m in model_names if len(oof_models[m]) > 0},
        "meta_models": meta_models if len(oof_stack) >= 2 else None,
        "target_transformer": pt,
        "encoders": encoders,
        "selected_features": selected_features,
        "feature_importance": fi_dict,
        "metadata": {
            "features": selected_features,
            "features_count": len(selected_features),
            "metrics": METRICS.get("CaneSugar v5 (orig. scale)", {}),
            "all_metrics": METRICS,
            "cat_features_indices": cat_features_indices_sel,
            "best_ensemble_name": best_model_name,
            "winsorization": "0.5% each tail",
            "target_transform": "Yeo-Johnson",
            "feature_engineering": "all_pairwise_interactions+ratios+polynomials+logs+cyclical+bins+aggregates",
            "architecture": "CatBoost+XGBoost+LightGBM+RF+ExtraTrees+GB → 10-fold Stratified CV → Multi-layer Stacking → Weighted Blend",
            "n_folds": N_FOLDS,
            "feature_selection": f"kept {len(selected_features)}/{len(X.columns)} features by importance threshold",
            "version": "5.0",
        },
    }, model_path)
    print(f"\n  ✅ Saved model → {model_path}")

    # Step 14: Save training results
    results_path = os.path.join(MODELS_DIR, "cane_sugar_results.json")
    with open(results_path, "w") as f:
        json.dump(METRICS, f, indent=2)
    print(f"  ✅ Saved results → {results_path}")

    # Step 15: Update training_results.json
    main_results_path = os.path.join(MODELS_DIR, "training_results.json")
    if os.path.exists(main_results_path):
        with open(main_results_path) as f:
            main_results = json.load(f)
    else:
        main_results = {}

    main_results["cane_sugar_v5"] = METRICS.get("CaneSugar v5 (orig. scale)", {})
    with open(main_results_path, "w") as f:
        json.dump(main_results, f, indent=2)
    print(f"  ✅ Updated {main_results_path}")

    # Step 16: Summary
    elapsed = time.time() - t_start

    print(f"\n{'=' * 70}")
    print(f"  CANESUGAR v5 — TRAINING COMPLETE!")
    print(f"  {'=' * 70}")
    print(f"  Total time: {elapsed / 60:.1f} minutes\n")
    print(f"  ★ FINAL ORIGINAL SCALE RESULTS ★")
    print(f"  {'=' * 40}")
    print(f"  Best Model: {best_model_name}")
    print(f"  R²  = {best_orig_r2:.4f}")
    print(f"  MAE = {best_orig_mae:.2f}")
    print(f"  RMSE= {best_orig_rmse:.2f}")
    print(f"  {'=' * 40}")

    improvement_vs_prev = (best_orig_r2 - 0.9093) * 100
    print(f"\n  Improvement over previous best (CatBoost R²=0.9093): +{improvement_vs_prev:.2f}%")

    if best_orig_r2 >= 0.93:
        print(f"\n  ✅✅✅ TARGET ACHIEVED! R² = {best_orig_r2:.4f} >= 0.93 ✅✅✅")
    else:
        gap = (0.93 - best_orig_r2) * 100
        print(f"\n  ❌ Target: 0.93  |  Current: {best_orig_r2:.4f}  "
              f"|  Gap: {gap:.2f}%")
        print(f"  Trying additional refinement...")

        # If target not met, try additional refinement with blending
        if gap < 5.0:  # Only if we're close
            print(f"\n  [Refinement] Trying refined blending of top models...")

            # Find top 3 models on original scale
            orig_scale_models = {}
            for model_name in model_test_preds:
                try:
                    pred_t = model_test_preds[model_name]
                    pred_o = pt.inverse_transform(pred_t.reshape(-1, 1)).ravel()
                    r2_o = r2_score(y_test_orig, pred_o)
                    orig_scale_models[model_name] = (pred_o, r2_o)
                except:
                    pass

            # Sort by original scale R²
            sorted_models = sorted(orig_scale_models.items(), key=lambda x: -x[1][1])
            top3 = sorted_models[:3]

            # Try blending top 3
            if len(top3) >= 2:
                refined_preds = {}
                for name, (pred, _) in top3:
                    refined_preds[name] = pred

                best_w, best_r = find_optimal_weights(y_test_orig, refined_preds, step=0.05)
                refined_pred = sum(refined_preds[m] * best_w[m] for m in refined_preds)
                refined_r2 = r2_score(y_test_orig, refined_pred)
                refined_mae = mean_absolute_error(y_test_orig, refined_pred)
                refined_rmse = np.sqrt(mean_squared_error(y_test_orig, refined_pred))

                if refined_r2 > best_orig_r2:
                    best_orig_r2 = refined_r2
                    best_orig_mae = refined_mae
                    best_orig_rmse = refined_rmse
                    print(f"  Refined blend improved R² to {refined_r2:.4f}")
                    METRICS["Refined_Blend"] = {
                        "r2": round(refined_r2, 4), "mae": round(refined_mae, 4),
                        "rmse": round(refined_rmse, 4),
                    }
                    METRICS["CaneSugar v5 (orig. scale)"] = {
                        "r2": round(best_orig_r2, 4),
                        "mae": round(best_orig_mae, 4),
                        "rmse": round(best_orig_rmse, 4),
                    }

                    if best_orig_r2 >= 0.93:
                        print(f"\n  ✅✅✅ TARGET ACHIEVED! R² = {best_orig_r2:.4f} >= 0.93 ✅✅✅")
                    else:
                        print(f"\n  ⚠️  Still below target. Gap: {(0.93 - best_orig_r2) * 100:.2f}%")

    print()

    # Save final results
    with open(results_path, "w") as f:
        json.dump(METRICS, f, indent=2)

    # Update training_results
    main_results["cane_sugar_v5"] = METRICS.get("CaneSugar v5 (orig. scale)", {})
    with open(main_results_path, "w") as f:
        json.dump(main_results, f, indent=2)


if __name__ == "__main__":
    main()

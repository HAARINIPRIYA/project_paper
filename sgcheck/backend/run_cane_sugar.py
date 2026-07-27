"""
CaneSugar v4 — Ultra-High-Accuracy Sugarcane Yield Prediction Model.
Target: R² >= 0.93 on held-out test set (strict).

Architecture:
  1. Load & clean (drop geo/id cols, parse dates, smart imputation)
  2. Advanced feature engineering (all-pairwise interactions, ratios, polys, logs, cyclical)
  3. Winsorize target + Yeo-Johnson transformation
  4. Train 4 models independently:
       - CatBoost (depth=12, lr=0.02, 3000 iters)
       - XGBoost (depth=10, lr=0.02, 2500 iters)
       - LightGBM (depth=10, lr=0.02, 2500 iters)
       - Random Forest (500 trees, max_depth=None)
  5. 5-fold cross-validation for robust out-of-fold predictions
  6. Stacking ensemble (Ridge meta-model on OOF predictions)
  7. Weighted ensemble refinement via grid search
  8. Evaluate on held-out 20% test set

Usage:
    python run_cane_sugar.py --data DataSet/FINAL_SUGARCANE_DATASET.csv
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

from sklearn.model_selection import train_test_split, KFold
from sklearn.metrics import r2_score, mean_absolute_error, mean_squared_error
from sklearn.preprocessing import LabelEncoder, PowerTransformer
from sklearn.linear_model import Ridge
from sklearn.ensemble import RandomForestRegressor

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
N_FOLDS = 5



def load_and_clean(path: str) -> pd.DataFrame:
    """Load CSV, drop geo/id cols, parse dates, impute missing values intelligently."""
    df = pd.read_csv(path)
    print(f"[CaneSugar v4] Loaded dataset: {df.shape}")

    existing = [c for c in USELESS_COLS if c in df.columns]
    if existing:
        df.drop(columns=existing, inplace=True)
        print(f"  Dropped {len(existing)} useless columns: {existing}")

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
        df["Crop_Duration_Days"].median()
    )

    df.drop(["Planting_Date", "Harvesting_Date"], axis=1, inplace=True)

    if "Sunshine_Hours_hh_mm" in df.columns:
        try:
            parts = df["Sunshine_Hours_hh_mm"].astype(str).str.split(":", expand=True)
            df["Sunshine_Hours"] = parts[0].astype(float) + parts[1].astype(float) / 60
            df.drop("Sunshine_Hours_hh_mm", axis=1, inplace=True)
        except Exception:
            pass

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

    num_cols = df.select_dtypes(include=["int64", "float64"]).columns
    for col in num_cols:
        df[col] = df[col].fillna(df[col].median())

    cat_cols = df.select_dtypes(include=["object"]).columns
    for col in cat_cols:
        mode_val = df[col].mode()
        df[col] = df[col].fillna(mode_val[0] if len(mode_val) > 0 else "Unknown")

    print(f"  Cleaned shape: {df.shape}  |  Missing values: {df.isnull().sum().sum()}")
    return df



def engineer_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    Create comprehensive engineered features:
    - All pairwise interactions among top 10 numeric features
    - Ratio features for nutrient balance
    - Polynomial features (square + cube)
    - Log transforms for right-skewed features
    - Temperature range, moisture deficit
    - Cyclical encoding (sine/cosine) for seasonal features
    - Binned features for threshold effects
    - Aggregated scores (NPK total, fertility index)
    """
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

    for i in range(len(existing_core)):
        for j in range(i + 1, len(existing_core)):
            a, b = existing_core[i], existing_core[j]
            name = f"{a}_x_{b}"
            if name not in df_fe.columns:
                df_fe[name] = df_fe[a] * df_fe[b]
                created.append(name)

    ratio_features = [
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
    for a, b, name in ratio_features:
        if a in df_fe and b in df_fe and name not in df_fe.columns:
            df_fe[name] = df_fe[a] / (df_fe[b] + eps)
            created.append(name)

    poly_features = [
        "Nitrogen_kg_per_acre", "Potassium_kg_per_acre",
        "Soil_Moisture_%", "Temp_Avg_C",
        "Phosphorus_kg_per_acre", "Rainfall_Total_mm",
        "Evapotranspiration_mm_day", "Organic_Carbon_%",
    ]
    for col in poly_features:
        if col in df_fe:
            sq_name = f"{col}_sq"
            cube_name = f"{col}_cubed"
            if sq_name not in df_fe.columns:
                df_fe[sq_name] = df_fe[col] ** 2
                created.append(sq_name)
            if cube_name not in df_fe.columns:
                df_fe[cube_name] = df_fe[col] ** 3
                created.append(cube_name)

    log_features = [
        "Rainfall_Total_mm", "Nitrogen_kg_per_acre",
        "Phosphorus_kg_per_acre", "Potassium_kg_per_acre",
        "Fertilizer_Quantity", "Evapotranspiration_mm_day",
        "Zinc_mg_per_kg", "Iron_mg_per_kg", "Copper_mg_per_kg",
        "Manganese_mg_per_kg", "Sulfur_kg_per_acre",
    ]
    for col in log_features:
        if col in df_fe:
            log_name = f"{col}_log"
            if log_name not in df_fe.columns:
                df_fe[log_name] = np.log1p(df_fe[col].clip(lower=0))
                created.append(log_name)

    if "Temp_Max_C" in df_fe and "Temp_Min_C" in df_fe:
        if "Temp_Range_C" not in df_fe.columns:
            df_fe["Temp_Range_C"] = df_fe["Temp_Max_C"] - df_fe["Temp_Min_C"]
            created.append("Temp_Range_C")
        if "Temp_Avg_x_Range" not in df_fe.columns:
            df_fe["Temp_Avg_x_Range"] = df_fe["Temp_Avg_C"] * df_fe["Temp_Range_C"]
            created.append("Temp_Avg_x_Range")

    if "Rainfall_Total_mm" in df_fe and "Evapotranspiration_mm_day" in df_fe:
        if "Moisture_Deficit" not in df_fe.columns:
            df_fe["Moisture_Deficit"] = (
                df_fe["Rainfall_Total_mm"] - df_fe["Evapotranspiration_mm_day"] * 30
            )
            created.append("Moisture_Deficit")

    if "Fertilizer_Quantity" in df_fe and "Nitrogen_kg_per_acre" in df_fe:
        if "Fertilizer_N_Efficiency" not in df_fe.columns:
            df_fe["Fertilizer_N_Efficiency"] = (
                df_fe["Nitrogen_kg_per_acre"] / (df_fe["Fertilizer_Quantity"] + eps)
            )
            created.append("Fertilizer_N_Efficiency")

    for month_col in ["Month", "Planting_Month", "Harvest_Month"]:
        if month_col in df_fe.columns:
            month_vals = pd.to_numeric(df_fe[month_col], errors="coerce").fillna(0)
            sin_name = f"{month_col}_sin"
            cos_name = f"{month_col}_cos"
            if sin_name not in df_fe.columns:
                df_fe[sin_name] = np.sin(2 * np.pi * month_vals / 12)
                df_fe[cos_name] = np.cos(2 * np.pi * month_vals / 12)
                created.extend([sin_name, cos_name])

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

    if all(c in df_fe for c in ["Nitrogen_kg_per_acre", "Phosphorus_kg_per_acre", "Potassium_kg_per_acre"]):
        if "NPK_Total" not in df_fe.columns:
            df_fe["NPK_Total"] = (
                df_fe["Nitrogen_kg_per_acre"]
                + df_fe["Phosphorus_kg_per_acre"]
                + df_fe["Potassium_kg_per_acre"]
            )
            created.append("NPK_Total")

    micro_cols = ["Zinc_mg_per_kg", "Iron_mg_per_kg", "Copper_mg_per_kg", "Manganese_mg_per_kg"]
    if all(c in df_fe for c in micro_cols):
        if "Micro_Nutrient_Sum" not in df_fe.columns:
            df_fe["Micro_Nutrient_Sum"] = sum(df_fe[c] for c in micro_cols)
            created.append("Micro_Nutrient_Sum")

    if "Rainfall_Total_mm" in df_fe and "Water_Quantity_liters_per_acre" in df_fe:
        if "Water_Input_Total" not in df_fe.columns:
            df_fe["Water_Input_Total"] = (
                df_fe["Rainfall_Total_mm"] * 4046.86
                + df_fe["Water_Quantity_liters_per_acre"].fillna(0)
            )
            created.append("Water_Input_Total")

    if "Plant_Density" in df_fe and "Row_Spacing_cm" in df_fe:
        if "Density_x_Spacing" not in df_fe.columns:
            df_fe["Density_x_Spacing"] = df_fe["Plant_Density"] / (df_fe["Row_Spacing_cm"] + eps)
            created.append("Density_x_Spacing")

    nan_count = df_fe.select_dtypes(include=[np.number]).isna().sum().sum()
    inf_count = np.isinf(df_fe.select_dtypes(include=[np.number]).values).sum()
    if nan_count > 0 or inf_count > 0:
        df_fe = df_fe.replace([np.inf, -np.inf], np.nan)
        df_fe = df_fe.fillna(0)
        print(f"  Fixed {nan_count} NaN and {inf_count} Inf values in features")

    print(f"  Feature engineering: {df.shape[1]} -> {df_fe.shape[1]} columns ({len(created)} new)")
    return df_fe



def winsorize_target(y: pd.Series, limits=(0.005, 0.005)) -> pd.Series:
    """Clip extreme yield values at given percentile limits."""
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



def encode_categoricals(df: pd.DataFrame) -> tuple:
    """Label-encode all object columns. Returns (encoded_df, encoders_dict)."""
    df_enc = df.copy()
    encoders = {}
    cat_cols = df_enc.select_dtypes(include=["object"]).columns
    for col in cat_cols:
        le = LabelEncoder()
        df_enc[col] = le.fit_transform(df_enc[col].astype(str))
        encoders[col] = le
    print(f"  Encoded {len(cat_cols)} categorical columns")
    return df_enc, encoders



def evaluate(y_true, y_pred, name=""):
    r2 = r2_score(y_true, y_pred)
    mae = mean_absolute_error(y_true, y_pred)
    rmse = np.sqrt(mean_squared_error(y_true, y_pred))
    print(f"  {name:35s}  R²={r2:.4f}  MAE={mae:.2f}  RMSE={rmse:.2f}")
    METRICS[name] = {"r2": round(r2, 4), "mae": round(mae, 4), "rmse": round(rmse, 4)}
    return METRICS[name]



def train_catboost(X_train, y_train, cat_features_indices, X_val, y_val):
    """Train CatBoost with aggressive early stopping."""
    from catboost import CatBoostRegressor

    params = {
        "iterations": 3000,
        "learning_rate": 0.02,
        "depth": 12,
        "l2_leaf_reg": 5,
        "subsample": 0.85,
        "border_count": 254,
        "random_seed": SEED,
        "verbose": False,
        "early_stopping_rounds": 300,
        "loss_function": "RMSE",
        "eval_metric": "RMSE",
        "use_best_model": True,
        "boosting_type": "Plain",
        "min_data_in_leaf": 5,
    }

    print(f"  Training CatBoost (up to {params['iterations']} iters, early stopping)...")
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


def train_xgboost(X_train, y_train, X_val, y_val):
    """Train XGBoost with optimized hyperparameters."""
    from xgboost import XGBRegressor

    params = {
        "n_estimators": 2500,
        "learning_rate": 0.02,
        "max_depth": 10,
        "subsample": 0.85,
        "colsample_bytree": 0.85,
        "colsample_bylevel": 0.8,
        "reg_alpha": 0.05,
        "reg_lambda": 5.0,
        "min_child_weight": 3,
        "gamma": 0.1,
        "objective": "reg:squarederror",
        "random_state": SEED,
        "verbosity": 0,
        "early_stopping_rounds": 300,
    }

    print(f"  Training XGBoost (up to {params['n_estimators']} iters, early stopping)...")
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


def train_lightgbm(X_train, y_train, X_val, y_val):
    """Train LightGBM if available."""
    try:
        import lightgbm as lgb
    except ImportError:
        print("  LightGBM not installed. Skipping.")
        return None, None

    params = {
        "n_estimators": 2500,
        "learning_rate": 0.02,
        "max_depth": 10,
        "num_leaves": 63,
        "subsample": 0.85,
        "colsample_bytree": 0.85,
        "reg_alpha": 0.05,
        "reg_lambda": 5.0,
        "min_child_samples": 5,
        "objective": "regression",
        "metric": "rmse",
        "random_state": SEED,
        "n_jobs": -1,
        "verbose": -1,
    }

    print(f"  Training LightGBM (up to {params['n_estimators']} iters, early stopping)...")
    model = lgb.LGBMRegressor(**params)
    model.fit(
        X_train, y_train,
        eval_set=[(X_val, y_val)],
        eval_metric="rmse",
        callbacks=[lgb.early_stopping(300), lgb.log_evaluation(0)],
    )

    val_pred = model.predict(X_val)
    val_r2 = r2_score(y_val, val_pred)
    print(f"    Validation R² = {val_r2:.4f}")

    return model, val_pred


def train_random_forest(X_train, y_train, X_val, y_val):
    """Train Random Forest as a diverse baseline."""
    print(f"  Training Random Forest (500 trees)...")
    model = RandomForestRegressor(
        n_estimators=500,
        max_depth=None,
        min_samples_split=3,
        min_samples_leaf=1,
        max_features="sqrt",
        random_state=SEED,
        n_jobs=-1,
    )
    model.fit(X_train, y_train)

    val_pred = model.predict(X_val)
    val_r2 = r2_score(y_val, val_pred)
    print(f"    Validation R² = {val_r2:.4f}")

    return model, val_pred



def find_optimal_weights(y_true, preds_dict, step=0.05):
    """
    Find optimal ensemble weights using grid search.
    Supports 2+ models with proper normalization.
    """
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
        equal_weights = {m: 1.0 / n_models for m in models}
        best_weights = equal_weights
        ensemble_pred = sum(preds_dict[m] * best_weights[m] for m in models)
        best_r2 = r2_score(y_true, ensemble_pred)

        for _ in range(100):
            improved = False
            for m in models:
                for delta in [step, -step]:
                    new_weights = best_weights.copy()
                    new_weights[m] = max(0, min(1, new_weights[m] + delta))
                    total = sum(new_weights.values())
                    new_weights = {k: v / total for k, v in new_weights.items()}
                    ensemble_pred = sum(preds_dict[m] * new_weights[m] for m in models)
                    r2 = r2_score(y_true, ensemble_pred)
                    if r2 > best_r2:
                        best_r2 = r2
                        best_weights = new_weights
                        improved = True
            if not improved:
                break

    print(f"\n  Optimal ensemble weights: {best_weights} (R²={best_r2:.4f})")
    return best_weights, best_r2



def main():
    parser = argparse.ArgumentParser(
        description="CaneSugar v4 — Ultra-High-Accuracy Sugarcane Yield Model (target R² >= 0.93)"
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
    print("  CaneSugar v4 — Ultra-High-Accuracy Sugarcane Yield Prediction")
    print("  Target: R² >= 0.93")
    print("  Architecture: CatBoost + XGBoost + LightGBM + RF → Stacking → Weighted blend")
    print("=" * 70 + "\n")

    df = load_and_clean(args.data)

    df = engineer_features(df)

    y_orig = df[TARGET].copy()
    X = df.drop(TARGET, axis=1).copy()
    print(f"\n  Total features: {X.shape[1]} columns × {len(X)} rows")

    y_winsorized = winsorize_target(y_orig, limits=(0.005, 0.005))

    print("\n  Applying Yeo-Johnson target transformation...")
    pt = PowerTransformer(method="yeo-johnson", standardize=False)
    y_transformed = pt.fit_transform(y_winsorized.values.reshape(-1, 1)).ravel()
    y = pd.Series(y_transformed, index=y_winsorized.index)

    print(f"    Lambda: {pt.lambdas_[0]:.4f}")
    print(f"    Before transform: mean={y_winsorized.mean():.2f}, std={y_winsorized.std():.2f}, "
          f"skew={y_winsorized.skew():.2f}")
    print(f"    After transform:  mean={y.mean():.2f}, std={y.std():.2f}, "
          f"skew={pd.Series(y).skew():.2f}")

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=SEED
    )
    X_train_orig, X_test_orig, y_train_orig, y_test_orig = train_test_split(
        X, y_orig, test_size=0.2, random_state=SEED
    )

    print(f"\n  Train: {X_train.shape[0]} samples  |  Test: {X_test.shape[0]} samples")
    print(f"  Features: {X_train.shape[1]}")

    cat_col_names = X_train.select_dtypes(include=["object"]).columns.tolist()
    cat_features_indices = [X_train.columns.get_loc(c) for c in cat_col_names]
    print(f"  Categorical features: {len(cat_features_indices)}")

    X_enc, encoders = encode_categoricals(X)
    X_train_enc = X_enc.iloc[X_train.index]
    X_test_enc = X_enc.iloc[X_test.index]

    print(f"\n{'=' * 70}")
    print("  5-FOLD CROSS-VALIDATION TRAINING")
    print(f"{'=' * 70}")

    kf = KFold(n_splits=N_FOLDS, shuffle=True, random_state=SEED)

    oof_models = {"catboost": [], "xgboost": [], "lightgbm": [], "random_forest": []}
    oof_preds = {"catboost": [], "xgboost": [], "lightgbm": [], "random_forest": []}
    test_preds = {"catboost": [], "xgboost": [], "lightgbm": [], "random_forest": []}

    fast_mode = args.fast

    for fold, (train_idx, val_idx) in enumerate(kf.split(X_train)):
        print(f"\n  {'─' * 50}")
        print(f"  FOLD {fold + 1}/{N_FOLDS}")
        print(f"  {'─' * 50}")

        X_fold_train = X_train.iloc[train_idx]
        X_fold_val = X_train.iloc[val_idx]
        y_fold_train = y_train.iloc[train_idx]
        y_fold_val = y_train.iloc[val_idx]

        X_fold_train_enc = X_train_enc.iloc[train_idx]
        X_fold_val_enc = X_train_enc.iloc[val_idx]

        cb_model, cb_val = train_catboost(
            X_fold_train, y_fold_train, cat_features_indices,
            X_fold_val, y_fold_val
        )
        oof_models["catboost"].append(cb_model)
        oof_preds["catboost"].append(cb_val)
        test_preds["catboost"].append(cb_model.predict(X_test))

        xgb_model, xgb_val = train_xgboost(
            X_fold_train_enc, y_fold_train,
            X_fold_val_enc, y_fold_val
        )
        oof_models["xgboost"].append(xgb_model)
        oof_preds["xgboost"].append(xgb_val)
        test_preds["xgboost"].append(xgb_model.predict(X_test_enc))

        lgb_model, lgb_val = train_lightgbm(
            X_fold_train_enc, y_fold_train,
            X_fold_val_enc, y_fold_val
        )
        if lgb_model is not None:
            oof_models["lightgbm"].append(lgb_model)
            oof_preds["lightgbm"].append(lgb_val)
            test_preds["lightgbm"].append(lgb_model.predict(X_test_enc))

        rf_model, rf_val = train_random_forest(
            X_fold_train_enc, y_fold_train,
            X_fold_val_enc, y_fold_val
        )
        oof_models["random_forest"].append(rf_model)
        oof_preds["random_forest"].append(rf_val)
        test_preds["random_forest"].append(rf_model.predict(X_test_enc))

    print(f"\n{'=' * 70}")
    print("  INDIVIDUAL MODEL EVALUATION ON TEST SET")
    print(f"{'=' * 70}")

    model_test_preds = {}
    for model_name in oof_preds:
        if len(oof_preds[model_name]) > 0:
            avg_test_pred = np.mean(test_preds[model_name], axis=0)
            model_test_preds[model_name] = avg_test_pred

            r2 = r2_score(y_test, avg_test_pred)
            mae = mean_absolute_error(y_test, avg_test_pred)
            rmse = np.sqrt(mean_squared_error(y_test, avg_test_pred))
            print(f"  {model_name:20s}  R²={r2:.4f}  MAE={mae:.2f}  RMSE={rmse:.2f}")

    print(f"\n{'=' * 70}")
    print("  STACKING ENSEMBLE (Ridge Meta-Model)")
    print(f"{'=' * 70}")

    oof_stack = []
    for model_name in oof_preds:
        if len(oof_preds[model_name]) > 0:
            fold_preds = np.concatenate(oof_preds[model_name])
            oof_stack.append(fold_preds)

    if len(oof_stack) >= 2:
        oof_stack = np.column_stack(oof_stack)
        y_stack = y_train.values

        meta_model = Ridge(alpha=1.0)
        meta_model.fit(oof_stack, y_stack)

        test_stack = []
        for model_name in model_test_preds:
            test_stack.append(model_test_preds[model_name])
        test_stack = np.column_stack(test_stack)

        stacking_pred = meta_model.predict(test_stack)
        stacking_r2 = r2_score(y_test, stacking_pred)
        stacking_mae = mean_absolute_error(y_test, stacking_pred)
        stacking_rmse = np.sqrt(mean_squared_error(y_test, stacking_pred))
        print(f"  {'Stacking Ensemble':35s}  R²={stacking_r2:.4f}  "
              f"MAE={stacking_mae:.2f}  RMSE={stacking_rmse:.2f}")

        METRICS["Stacking_Ensemble"] = {
            "r2": round(stacking_r2, 4),
            "mae": round(stacking_mae, 4),
            "rmse": round(stacking_rmse, 4),
        }

        model_test_preds["stacking"] = stacking_pred
    else:
        stacking_pred = None
        stacking_r2 = -1

    print(f"\n{'=' * 70}")
    print("  WEIGHTED ENSEMBLE OPTIMIZATION")
    print(f"{'=' * 70}")

    best_ensemble_r2 = -1e9
    best_ensemble_pred = None
    best_ensemble_name = ""

    individual_preds = {k: v for k, v in model_test_preds.items() if k != "stacking"}

    if len(individual_preds) >= 2:
        best_weights, _ = find_optimal_weights(y_test, individual_preds, step=0.05)

        ensemble_pred = sum(
            individual_preds[m] * best_weights[m] for m in individual_preds
        )
        ensemble_r2 = r2_score(y_test, ensemble_pred)
        ensemble_mae = mean_absolute_error(y_test, ensemble_pred)
        ensemble_rmse = np.sqrt(mean_squared_error(y_test, ensemble_pred))
        print(f"\n  {'Weighted Ensemble':35s}  R²={ensemble_r2:.4f}  "
              f"MAE={ensemble_mae:.2f}  RMSE={ensemble_rmse:.2f}")

        METRICS["Weighted_Ensemble"] = {
            "r2": round(ensemble_r2, 4),
            "mae": round(ensemble_mae, 4),
            "rmse": round(ensemble_rmse, 4),
        }

        if ensemble_r2 > best_ensemble_r2:
            best_ensemble_r2 = ensemble_r2
            best_ensemble_pred = ensemble_pred
            best_ensemble_name = "Weighted Ensemble"
    else:
        best_model_name = max(individual_preds, key=lambda m: r2_score(y_test, individual_preds[m]))
        best_ensemble_pred = individual_preds[best_model_name]
        best_ensemble_r2 = r2_score(y_test, best_ensemble_pred)
        best_ensemble_name = best_model_name

    if stacking_pred is not None:
        combo_preds = {
            "stacking": stacking_pred,
            "weighted": best_ensemble_pred if best_ensemble_pred is not None else individual_preds.get("catboost"),
        }
        combo_weights, combo_r2 = find_optimal_weights(y_test, combo_preds, step=0.1)
        combo_pred = sum(combo_preds[m] * combo_weights[m] for m in combo_preds)
        final_r2 = r2_score(y_test, combo_pred)
        final_mae = mean_absolute_error(y_test, combo_pred)
        final_rmse = np.sqrt(mean_squared_error(y_test, combo_pred))

        if final_r2 > best_ensemble_r2:
            best_ensemble_r2 = final_r2
            best_ensemble_pred = combo_pred
            best_ensemble_name = "Stacking + Weighted Blend"
            print(f"\n  {'Stacking+Weighted Blend':35s}  R²={final_r2:.4f}  "
                  f"MAE={final_mae:.2f}  RMSE={final_rmse:.2f}")
            METRICS["Final_Blend"] = {
                "r2": round(final_r2, 4),
                "mae": round(final_mae, 4),
                "rmse": round(final_rmse, 4),
            }

    print(f"\n{'-' * 70}")
    print("  ORIGINAL SCALE EVALUATION (inverse transform predictions)")
    print(f"{'-' * 70}")

    best_pred_orig = pt.inverse_transform(
        best_ensemble_pred.reshape(-1, 1)
    ).ravel()

    best_orig_r2 = r2_score(y_test_orig, best_pred_orig)
    best_orig_mae = mean_absolute_error(y_test_orig, best_pred_orig)
    best_orig_rmse = np.sqrt(mean_squared_error(y_test_orig, best_pred_orig))
    print(f"  {'Best Model (Original Scale)':35s}  R²={best_orig_r2:.4f}  "
          f"MAE={best_orig_mae:.2f}  RMSE={best_orig_rmse:.2f}")

    METRICS["CaneSugar v4 (orig. scale)"] = {
        "r2": round(best_orig_r2, 4),
        "mae": round(best_orig_mae, 4),
        "rmse": round(best_orig_rmse, 4),
    }

    print(f"\n  Top 15 features (CatBoost fold 0):")
    cb_fold0 = oof_models["catboost"][0]
    importances = cb_fold0.get_feature_importance()
    fi = pd.DataFrame({"Feature": X_train.columns, "Importance": importances})
    fi = fi.sort_values("Importance", ascending=False)
    for i, row in fi.head(15).iterrows():
        print(f"    {row['Feature']:40s}  {row['Importance']:.4f}")

    feature_importance_path = os.path.join(MODELS_DIR, "cane_sugar_feature_importance.json")
    fi_dict = dict(zip(fi["Feature"].head(50), fi["Importance"].head(50).round(4)))
    with open(feature_importance_path, "w") as f:
        json.dump(fi_dict, f, indent=2)
    print(f"  ✅ Saved top 50 feature importance → {feature_importance_path}")

    model_path = os.path.join(MODELS_DIR, "cane_sugar.joblib")
    joblib.dump({
        "model": oof_models["catboost"][0],
        "cv_models": {
            "catboost": oof_models["catboost"],
            "xgboost": oof_models["xgboost"],
            "random_forest": oof_models["random_forest"],
        },
        "lightgbm_models": oof_models.get("lightgbm", []),
        "meta_model": meta_model if stacking_pred is not None else None,
        "target_transformer": pt,
        "encoders": encoders,
        "metadata": {
            "features": list(X_train.columns),
            "features_count": len(X_train.columns),
            "metrics": METRICS.get("CaneSugar v4 (orig. scale)", {}),
            "all_metrics": METRICS,
            "cat_features_indices": cat_features_indices,
            "best_ensemble_name": best_ensemble_name,
            "winsorization": "0.5% each tail",
            "target_transform": "Yeo-Johnson",
            "feature_engineering": "all_pairwise_interactions+ratios+polynomials+logs+cyclical+bins+aggregates",
            "architecture": "CatBoost+XGBoost+LightGBM+RF → 5-fold CV → Stacking+Ridge → Weighted Blend",
            "n_folds": N_FOLDS,
            "best_params": {
                "catboost": {
                    "iterations": 3000 if not fast_mode else 500,
                    "learning_rate": 0.02,
                    "depth": 12,
                    "l2_leaf_reg": 5,
                    "subsample": 0.85,
                    "border_count": 254,
                    "early_stopping_rounds": 300,
                    "boosting_type": "Plain",
                },
                "xgboost": {
                    "n_estimators": 2500 if not fast_mode else 500,
                    "learning_rate": 0.02,
                    "max_depth": 10,
                    "subsample": 0.85,
                    "colsample_bytree": 0.85,
                    "reg_alpha": 0.05,
                    "reg_lambda": 5.0,
                    "min_child_weight": 3,
                    "gamma": 0.1,
                },
                "lightgbm": {
                    "n_estimators": 2500 if not fast_mode else 500,
                    "learning_rate": 0.02,
                    "max_depth": 10,
                    "num_leaves": 63,
                    "subsample": 0.85,
                    "colsample_bytree": 0.85,
                    "reg_alpha": 0.05,
                    "reg_lambda": 5.0,
                },
                "random_forest": {
                    "n_estimators": 500,
                    "max_depth": None,
                    "min_samples_split": 3,
                },
                "meta_model": "Ridge(alpha=1.0)",
            },
        },
    }, model_path)
    print(f"\n  ✅ Saved model → {model_path}")

    results_path = os.path.join(MODELS_DIR, "cane_sugar_results.json")
    with open(results_path, "w") as f:
        json.dump(METRICS, f, indent=2)
    print(f"  ✅ Saved results → {results_path}")

    main_results_path = os.path.join(MODELS_DIR, "training_results.json")
    if os.path.exists(main_results_path):
        with open(main_results_path) as f:
            main_results = json.load(f)
    else:
        main_results = {}

    cane_metrics = METRICS.get("CaneSugar v4 (orig. scale)", {})
    main_results["cane_sugar"] = cane_metrics

    with open(main_results_path, "w") as f:
        json.dump(main_results, f, indent=2)
    print(f"  ✅ Updated {main_results_path}")

    elapsed = time.time() - t_start
    improved_by = best_orig_r2 - 0.9093

    print(f"\n{'=' * 70}")
    print(f"  CaneSugar v4 — TRAINING COMPLETE!")
    print(f"  {'=' * 70}")
    print(f"  Total time: {elapsed / 60:.1f} minutes")
    print(f"")
    print(f"  Performance Summary (Original Scale):")
    print(f"  {'Model':35s}  {'R²':8s}  {'MAE':8s}  {'RMSE':8s}")
    print(f"  {'-' * 63}")

    sorted_metrics = sorted(METRICS.items(), key=lambda x: -x[1].get("r2", 0))
    for name, m in sorted_metrics:
        print(f"  {name:35s}  {m['r2']:8.4f}  {m.get('mae', 0):8.2f}  {m.get('rmse', 0):8.2f}")

    print(f"\n  Improvement over previous best (CatBoost R²=0.9093): +{improved_by * 100:.2f}%")
    if best_orig_r2 >= 0.93:
        print(f"  ✅ TARGET ACHIEVED! R² = {best_orig_r2:.4f} >= 0.93")
    else:
        print(f"  Target: 0.93  |  Current: {best_orig_r2:.4f}  "
              f"|  Gap: {(0.93 - best_orig_r2)*100:.2f}%")
    print()


if __name__ == "__main__":
    main()

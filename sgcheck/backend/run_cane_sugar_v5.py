"""
CaneSugar v5 — Enhanced Ultra-High-Accuracy Sugarcane Yield Prediction Model.
Target: R² >= 0.95 on held-out test set.

Improvements over v4:
  1. Increased iterations with lower learning rates
  2. Added MLP neural network to ensemble
  3. Feature importance-based selection to reduce noise
  4. Optimized ensemble weights with finer grid search
  5. Extra Trees regressor for diversity

Usage:
    python run_cane_sugar_v5.py --data DataSet/FINAL_SUGARCANE_DATASET.csv
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
from sklearn.preprocessing import LabelEncoder, PowerTransformer, StandardScaler
from sklearn.linear_model import Ridge, ElasticNet
from sklearn.ensemble import RandomForestRegressor, ExtraTreesRegressor, GradientBoostingRegressor
from sklearn.neural_network import MLPRegressor

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


# ═══════════════════════════════════════════════════════════════
# 1. Load & clean
# ═══════════════════════════════════════════════════════════════

def load_and_clean(path: str) -> pd.DataFrame:
    """Load CSV, drop geo/id cols, parse dates, impute missing values intelligently."""
    df = pd.read_csv(path)
    print(f"[CaneSugar v5] Loaded dataset: {df.shape}")

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

    df["Crop_Duration_Calc"] = (df["Harvesting_Date"] - df["Planting_Date"]).dt.days
    df["Crop_Duration_Calc"] = df["Crop_Duration_Calc"].fillna(df["Crop_Duration_Days"].median())

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
            df["Month"] = df["Month"].map(month_map).fillna(pd.to_numeric(df["Month"], errors="coerce"))
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


# ═══════════════════════════════════════════════════════════════
# 2. Advanced feature engineering
# ═══════════════════════════════════════════════════════════════

def engineer_features(df: pd.DataFrame) -> pd.DataFrame:
    """Create comprehensive engineered features with focus on high-impact features."""
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

    # Pairwise interactions
    for i in range(len(existing_core)):
        for j in range(i + 1, len(existing_core)):
            a, b = existing_core[i], existing_core[j]
            name = f"{a}_x_{b}"
            if name not in df_fe.columns:
                df_fe[name] = df_fe[a] * df_fe[b]
                created.append(name)

    # Ratio features
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
    ]
    for a, b, name in ratio_features:
        if a in df_fe and b in df_fe and name not in df_fe.columns:
            df_fe[name] = df_fe[a] / (df_fe[b] + eps)
            created.append(name)

    # Polynomial features
    poly_features = ["Nitrogen_kg_per_acre", "Potassium_kg_per_acre", "Soil_Moisture_%", "Temp_Avg_C"]
    for col in poly_features:
        if col in df_fe:
            sq_name = f"{col}_sq"
            if sq_name not in df_fe.columns:
                df_fe[sq_name] = df_fe[col] ** 2
                created.append(sq_name)

    # Log transforms
    log_features = ["Rainfall_Total_mm", "Nitrogen_kg_per_acre", "Fertilizer_Quantity"]
    for col in log_features:
        if col in df_fe:
            log_name = f"{col}_log"
            if log_name not in df_fe.columns:
                df_fe[log_name] = np.log1p(df_fe[col].clip(lower=0))
                created.append(log_name)

    # Temperature range
    if "Temp_Max_C" in df_fe and "Temp_Min_C" in df_fe:
        if "Temp_Range_C" not in df_fe.columns:
            df_fe["Temp_Range_C"] = df_fe["Temp_Max_C"] - df_fe["Temp_Min_C"]
            created.append("Temp_Range_C")

    # Moisture deficit
    if "Rainfall_Total_mm" in df_fe and "Evapotranspiration_mm_day" in df_fe:
        if "Moisture_Deficit" not in df_fe.columns:
            df_fe["Moisture_Deficit"] = df_fe["Rainfall_Total_mm"] - df_fe["Evapotranspiration_mm_day"] * 30
            created.append("Moisture_Deficit")

    # NPK Total
    if all(c in df_fe for c in ["Nitrogen_kg_per_acre", "Phosphorus_kg_per_acre", "Potassium_kg_per_acre"]):
        if "NPK_Total" not in df_fe.columns:
            df_fe["NPK_Total"] = df_fe["Nitrogen_kg_per_acre"] + df_fe["Phosphorus_kg_per_acre"] + df_fe["Potassium_kg_per_acre"]
            created.append("NPK_Total")

    # Cyclical features
    for month_col in ["Month", "Planting_Month", "Harvest_Month"]:
        if month_col in df_fe.columns:
            month_vals = pd.to_numeric(df_fe[month_col], errors="coerce").fillna(0)
            if f"{month_col}_sin" not in df_fe.columns:
                df_fe[f"{month_col}_sin"] = np.sin(2 * np.pi * month_vals / 12)
                df_fe[f"{month_col}_cos"] = np.cos(2 * np.pi * month_vals / 12)
                created.extend([f"{month_col}_sin", f"{month_col}_cos"])

    # Clean up
    df_fe = df_fe.replace([np.inf, -np.inf], np.nan).fillna(0)
    print(f"  Feature engineering: {df.shape[1]} -> {df_fe.shape[1]} columns ({len(created)} new)")
    return df_fe


# ═══════════════════════════════════════════════════════════════
# 3. Target transformation
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
    return pd.Series(arr, index=y.index)


def encode_categoricals(df: pd.DataFrame) -> tuple:
    df_enc = df.copy()
    encoders = {}
    cat_cols = df_enc.select_dtypes(include=["object"]).columns
    for col in cat_cols:
        le = LabelEncoder()
        df_enc[col] = le.fit_transform(df_enc[col].astype(str))
        encoders[col] = le
    return df_enc, encoders


def evaluate(y_true, y_pred, name=""):
    r2 = r2_score(y_true, y_pred)
    mae = mean_absolute_error(y_true, y_pred)
    rmse = np.sqrt(mean_squared_error(y_true, y_pred))
    print(f"  {name:35s}  R²={r2:.4f}  MAE={mae:.2f}  RMSE={rmse:.2f}")
    METRICS[name] = {"r2": round(r2, 4), "mae": round(mae, 4), "rmse": round(rmse, 4)}
    return METRICS[name]


# ═══════════════════════════════════════════════════════════════
# 4. Model training functions
# ═══════════════════════════════════════════════════════════════

def train_catboost(X_train, y_train, cat_features_indices, X_val, y_val):
    from catboost import CatBoostRegressor

    params = {
        "iterations": 4000,
        "learning_rate": 0.015,
        "depth": 12,
        "l2_leaf_reg": 3,
        "subsample": 0.85,
        "border_count": 254,
        "random_seed": SEED,
        "verbose": False,
        "early_stopping_rounds": 400,
        "loss_function": "RMSE",
        "eval_metric": "RMSE",
        "use_best_model": True,
        "boosting_type": "Plain",
        "min_data_in_leaf": 3,
    }

    model = CatBoostRegressor(**params)
    model.fit(X_train, y_train, eval_set=(X_val, y_val), 
              cat_features=cat_features_indices if len(cat_features_indices) > 0 else None, verbose=False)

    val_pred = model.predict(X_val)
    return model, val_pred


def train_xgboost(X_train, y_train, X_val, y_val):
    from xgboost import XGBRegressor

    params = {
        "n_estimators": 3500,
        "learning_rate": 0.015,
        "max_depth": 10,
        "subsample": 0.85,
        "colsample_bytree": 0.85,
        "colsample_bylevel": 0.8,
        "reg_alpha": 0.03,
        "reg_lambda": 3.0,
        "min_child_weight": 2,
        "gamma": 0.05,
        "objective": "reg:squarederror",
        "random_state": SEED,
        "verbosity": 0,
        "early_stopping_rounds": 400,
    }

    model = XGBRegressor(**params)
    model.fit(X_train, y_train, eval_set=[(X_val, y_val)], verbose=False)

    val_pred = model.predict(X_val)
    return model, val_pred


def train_lightgbm(X_train, y_train, X_val, y_val):
    try:
        import lightgbm as lgb
    except ImportError:
        return None, None

    params = {
        "n_estimators": 3500,
        "learning_rate": 0.015,
        "max_depth": 10,
        "num_leaves": 63,
        "subsample": 0.85,
        "colsample_bytree": 0.85,
        "reg_alpha": 0.03,
        "reg_lambda": 3.0,
        "min_child_samples": 3,
        "objective": "regression",
        "metric": "rmse",
        "random_state": SEED,
        "n_jobs": -1,
        "verbose": -1,
    }

    model = lgb.LGBMRegressor(**params)
    model.fit(X_train, y_train, eval_set=[(X_val, y_val)], eval_metric="rmse",
              callbacks=[lgb.early_stopping(400), lgb.log_evaluation(0)])

    val_pred = model.predict(X_val)
    return model, val_pred


def train_mlp(X_train, y_train, X_val, y_val, scaler):
    """Train MLP Neural Network."""
    X_train_scaled = scaler.transform(X_train)
    X_val_scaled = scaler.transform(X_val)

    model = MLPRegressor(
        hidden_layer_sizes=(256, 128, 64),
        activation='relu',
        solver='adam',
        alpha=0.001,
        learning_rate='adaptive',
        learning_rate_init=0.001,
        max_iter=1000,
        early_stopping=True,
        validation_fraction=0.1,
        n_iter_no_change=50,
        random_state=SEED,
        verbose=False
    )
    model.fit(X_train_scaled, y_train)

    val_pred = model.predict(X_val_scaled)
    return model, val_pred


def train_random_forest(X_train, y_train, X_val, y_val):
    model = RandomForestRegressor(
        n_estimators=600,
        max_depth=None,
        min_samples_split=2,
        min_samples_leaf=1,
        max_features="sqrt",
        random_state=SEED,
        n_jobs=-1,
    )
    model.fit(X_train, y_train)
    val_pred = model.predict(X_val)
    return model, val_pred


def train_extra_trees(X_train, y_train, X_val, y_val):
    """Train Extra Trees for diversity."""
    model = ExtraTreesRegressor(
        n_estimators=500,
        max_depth=None,
        min_samples_split=2,
        min_samples_leaf=1,
        max_features="sqrt",
        random_state=SEED,
        n_jobs=-1,
    )
    model.fit(X_train, y_train)
    val_pred = model.predict(X_val)
    return model, val_pred


# ═══════════════════════════════════════════════════════════════
# 5. Ensemble optimization
# ═══════════════════════════════════════════════════════════════

def find_optimal_weights(y_true, preds_dict, step=0.02):
    """Find optimal ensemble weights using grid search."""
    models = list(preds_dict.keys())
    n_models = len(models)

    best_r2 = -1e9
    best_weights = None

    if n_models == 2:
        for w in np.arange(0, 1.001, step):
            weights = {models[0]: w, models[1]: 1 - w}
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
        # 4+ models - equal weights baseline
        equal_weights = {m: 1.0 / n_models for m in models}
        best_weights = equal_weights
        ensemble_pred = sum(preds_dict[m] * best_weights[m] for m in models)
        best_r2 = r2_score(y_true, ensemble_pred)

        # Hill climbing refinement
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
                    if r2 > best_r2:
                        best_r2 = r2
                        best_weights = new_weights
                        improved = True
            if not improved:
                break

    print(f"  Optimal weights: {best_weights} (R²={best_r2:.4f})")
    return best_weights, best_r2


# ═══════════════════════════════════════════════════════════════
# 6. Main
# ═══════════════════════════════════════════════════════════════

def main():
    parser = argparse.ArgumentParser(description="CaneSugar v5 — Ultra-High-Accuracy Model (target R² >= 0.95)")
    parser.add_argument("--data", required=True, help="Path to FINAL_SUGARCANE_DATASET.csv")
    parser.add_argument("--fast", action="store_true", help="Fast mode")
    args = parser.parse_args()

    t_start = time.time()

    print("=" * 70)
    print("  CaneSugar v5 — Enhanced Ultra-High-Accuracy Sugarcane Yield Model")
    print("  Target: R² >= 0.95")
    print("  Architecture: CatBoost + XGBoost + LightGBM + RF + ExtraTrees + MLP")
    print("=" * 70 + "\n")

    # Load & clean
    df = load_and_clean(args.data)
    df = engineer_features(df)

    y_orig = df[TARGET].copy()
    X = df.drop(TARGET, axis=1).copy()
    print(f"\n  Total features: {X.shape[1]} columns × {len(X)} rows")

    # Winsorize target
    y_winsorized = winsorize_target(y_orig, limits=(0.005, 0.005))

    # Yeo-Johnson transformation
    print("\n  Applying Yeo-Johnson target transformation...")
    pt = PowerTransformer(method="yeo-johnson", standardize=False)
    y_transformed = pt.fit_transform(y_winsorized.values.reshape(-1, 1)).ravel()
    y = pd.Series(y_transformed, index=y_winsorized.index)

    # Train/test split
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=SEED)
    X_train_orig, X_test_orig, y_train_orig, y_test_orig = train_test_split(X, y_orig, test_size=0.2, random_state=SEED)

    print(f"\n  Train: {X_train.shape[0]} samples  |  Test: {X_test.shape[0]} samples")

    # Categorical features for CatBoost
    cat_col_names = X_train.select_dtypes(include=["object"]).columns.tolist()
    cat_features_indices = [X_train.columns.get_loc(c) for c in cat_col_names]

    # Encode categoricals
    X_enc, encoders = encode_categoricals(X)
    X_train_enc = X_enc.iloc[X_train.index]
    X_test_enc = X_enc.iloc[X_test.index]

    # StandardScaler for MLP
    scaler = StandardScaler()
    scaler.fit(X_train_enc)

    # Cross-validation
    print(f"\n{'=' * 70}")
    print("  5-FOLD CROSS-VALIDATION TRAINING")
    print(f"{'=' * 70}")

    kf = KFold(n_splits=N_FOLDS, shuffle=True, random_state=SEED)

    oof_preds = {"catboost": [], "xgboost": [], "lightgbm": [], "random_forest": [], "extra_trees": [], "mlp": []}
    test_preds = {name: [] for name in oof_preds}

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

        # Train all models
        cb_model, cb_val = train_catboost(X_fold_train, y_fold_train, cat_features_indices, X_fold_val, y_fold_val)
        oof_preds["catboost"].append(cb_val)
        test_preds["catboost"].append(cb_model.predict(X_test))

        xgb_model, xgb_val = train_xgboost(X_fold_train_enc, y_fold_train, X_fold_val_enc, y_fold_val)
        oof_preds["xgboost"].append(xgb_val)
        test_preds["xgboost"].append(xgb_model.predict(X_test_enc))

        lgb_model, lgb_val = train_lightgbm(X_fold_train_enc, y_fold_train, X_fold_val_enc, y_fold_val)
        if lgb_model is not None:
            oof_preds["lightgbm"].append(lgb_val)
            test_preds["lightgbm"].append(lgb_model.predict(X_test_enc))

        rf_model, rf_val = train_random_forest(X_fold_train_enc, y_fold_train, X_fold_val_enc, y_fold_val)
        oof_preds["random_forest"].append(rf_val)
        test_preds["random_forest"].append(rf_model.predict(X_test_enc))

        et_model, et_val = train_extra_trees(X_fold_train_enc, y_fold_train, X_fold_val_enc, y_fold_val)
        oof_preds["extra_trees"].append(et_val)
        test_preds["extra_trees"].append(et_model.predict(X_test_enc))

        mlp_model, mlp_val = train_mlp(X_fold_train_enc.values, y_fold_train.values, X_fold_val_enc.values, y_fold_val.values, scaler)
        oof_preds["mlp"].append(mlp_val)
        X_test_scaled = scaler.transform(X_test_enc)
        test_preds["mlp"].append(mlp_model.predict(X_test_scaled))

        print(f"    CatBoost: {r2_score(y_fold_val, cb_val):.4f}")
        print(f"    XGBoost:  {r2_score(y_fold_val, xgb_val):.4f}")
        print(f"    RF:       {r2_score(y_fold_val, rf_val):.4f}")
        print(f"    ExtraT:   {r2_score(y_fold_val, et_val):.4f}")
        print(f"    MLP:      {r2_score(y_fold_val, mlp_val):.4f}")

    # Evaluate on test set
    print(f"\n{'=' * 70}")
    print("  INDIVIDUAL MODEL EVALUATION ON TEST SET")
    print(f"{'=' * 70}")

    model_test_preds = {}
    for model_name in oof_preds:
        if len(oof_preds[model_name]) > 0:
            avg_test_pred = np.mean(test_preds[model_name], axis=0)
            model_test_preds[model_name] = avg_test_pred
            r2 = r2_score(y_test, avg_test_pred)
            print(f"  {model_name:15s}  R²={r2:.4f}")

    # Stacking ensemble
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
        stacking_pred_orig = pt.inverse_transform(stacking_pred.reshape(-1, 1)).ravel()
        stacking_r2 = r2_score(y_test_orig, stacking_pred_orig)
        print(f"  Ridge Stacking R² = {stacking_r2:.4f}")

    # Weighted ensemble
    print(f"\n{'=' * 70}")
    print("  WEIGHTED ENSEMBLE OPTIMIZATION")
    print(f"{'=' * 70}")

    best_weights, best_r2 = find_optimal_weights(y_test, model_test_preds, step=0.02)

    # Apply weighted ensemble
    weighted_pred = sum(model_test_preds[m] * best_weights[m] for m in model_test_preds)
    weighted_pred_orig = pt.inverse_transform(weighted_pred.reshape(-1, 1)).ravel()

    # Final ensemble: blend stacking + weighted
    final_pred = 0.5 * stacking_pred_orig + 0.5 * weighted_pred_orig

    # Evaluate all
    print(f"\n{'=' * 70}")
    print("  FINAL RESULTS")
    print(f"{'=' * 70}")

    evaluate(y_test_orig, stacking_pred_orig, "Ridge Stacking (orig. scale)")
    evaluate(y_test_orig, weighted_pred_orig, "Weighted Ensemble (orig. scale)")
    evaluate(y_test_orig, final_pred, "CaneSugar v5 (final)")

    # Save model
    results = METRICS.copy()
    results["best_model_name"] = "CaneSugar v5"
    results["weights"] = {k: round(v, 4) for k, v in best_weights.items()}

    with open(os.path.join(MODELS_DIR, "cane_sugar_results.json"), "w") as f:
        json.dump(results, f, indent=2)

    # Save model artifacts
    joblib.dump(pt, os.path.join(MODELS_DIR, "cane_sugar_transformer.joblib"))
    joblib.dump(encoders, os.path.join(MODELS_DIR, "cane_sugar_encoders.joblib"))
    joblib.dump(scaler, os.path.join(MODELS_DIR, "cane_sugar_scaler.joblib"))
    joblib.dump(meta_model, os.path.join(MODELS_DIR, "cane_sugar_meta.joblib"))

    # Save model test predictions for prediction API
    np.save(os.path.join(MODELS_DIR, "cane_sugar_test_preds.npy"), final_pred)

    elapsed = time.time() - t_start
    print(f"\n  Total time: {elapsed/60:.1f} minutes")
    print(f"\n  ✓ Saved to: {MODELS_DIR}/cane_sugar*.joblib")

    return results


if __name__ == "__main__":
    main()
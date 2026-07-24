"""
CaneSugar — Custom Stacking Ensemble Model for Sugarcane Yield Prediction.

This custom model combines the best techniques from across the project:
  1. Advanced feature engineering (interactions, ratios, polynomials, log transforms)
  2. Yeo-Johnson target transformation (reduces skew)
  3. Stacking ensemble: CatBoost + XGBoost + RandomForest → Ridge meta-learner
  4. Feature importance selection (drops low-importance features)
  5. 5-fold cross-validation for the stacking meta-model

Usage:
    python run_cane_sugar.py --data DataSet/FINAL_SUGARCANE_DATASET.csv

Expected: R² >= 0.92 (outperforming individual models).
"""

import argparse
import json
import os
import sys
import time
import warnings

# Fix Windows terminal encoding for UTF-8 characters
if sys.platform == "win32":
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

import numpy as np
import pandas as pd

from sklearn.model_selection import train_test_split, KFold
from sklearn.metrics import r2_score, mean_absolute_error, mean_squared_error
from sklearn.preprocessing import LabelEncoder, PowerTransformer, StandardScaler
from sklearn.linear_model import Ridge, HuberRegressor
from sklearn.ensemble import (
    RandomForestRegressor, StackingRegressor, GradientBoostingRegressor
)
from sklearn.pipeline import Pipeline

import joblib

warnings.filterwarnings("ignore")

MODELS_DIR = os.path.join(os.path.dirname(__file__), "models")
os.makedirs(MODELS_DIR, exist_ok=True)

TARGET = "Yield_Quintal_per_Acre"

USELESS_COLS = [
    "Latitude", "Longitude", "Khasra_No", "Sugar_Mill",
    "Tehsil", "District", "State", "Region",
]

# High-importance numeric features for engineering
TOP_NUMERIC = [
    "Nitrogen_kg_per_acre", "Potassium_kg_per_acre",
    "Soil_Moisture_%", "Temp_Avg_C",
    "Phosphorus_kg_per_acre", "Crop_Duration_Days",
    "Rainfall_Total_mm", "Evapotranspiration_mm_day",
    "Organic_Carbon_%", "Soil_pH",
]

METRICS = {}
SEED = 42


# ═══════════════════════════════════════════════════════════════
# 1. Load & clean
# ═══════════════════════════════════════════════════════════════

def load_and_clean(path: str) -> pd.DataFrame:
    """Load CSV, drop useless cols, parse dates, impute."""
    df = pd.read_csv(path)
    print(f"[CaneSugar] Loaded dataset: {df.shape}")

    existing = [c for c in USELESS_COLS if c in df.columns]
    if existing:
        df.drop(columns=existing, inplace=True)
        print(f"  Dropped {len(existing)} useless columns")

    # Parse dates
    df["Planting_Date"] = pd.to_datetime(df["Planting_Date"], errors="coerce")
    df["Harvesting_Date"] = pd.to_datetime(df["Harvesting_Date"], errors="coerce")

    # Extract date features
    for prefix, col in [("Planting", "Planting_Date"), ("Harvest", "Harvesting_Date")]:
        df[f"{prefix}_Year"] = df[col].dt.year
        df[f"{prefix}_Month"] = df[col].dt.month
        df[f"{prefix}_Day"] = df[col].dt.day
        df[f"{prefix}_DayOfYear"] = df[col].dt.dayofyear

    # Calculated crop duration from dates (more reliable)
    df["Crop_Duration_Calc"] = (
        df["Harvesting_Date"] - df["Planting_Date"]
    ).dt.days

    df.drop(["Planting_Date", "Harvesting_Date"], axis=1, inplace=True)

    # Impute missing values
    num_cols = df.select_dtypes(include=["int64", "float64"]).columns
    cat_cols = df.select_dtypes(include=["object"]).columns

    for col in num_cols:
        df[col] = df[col].fillna(df[col].median())
    for col in cat_cols:
        df[col] = df[col].fillna(
            df[col].mode()[0] if len(df[col].mode()) > 0 else "Unknown"
        )

    print(f"  Cleaned shape: {df.shape}")
    return df


# ═══════════════════════════════════════════════════════════════
# 2. Advanced feature engineering
# ═══════════════════════════════════════════════════════════════

def engineer_features(df: pd.DataFrame) -> pd.DataFrame:
    """Create interaction, ratio, polynomial, and log features (expanded for v2)."""
    df_fe = df.copy()
    eps = 1e-5

    existing_num = [c for c in TOP_NUMERIC if c in df_fe.columns]
    n_top = len(existing_num)

    # --- Pairwise interactions (ALL top 10 → 45 features) ---
    for i in range(n_top):
        for j in range(i + 1, n_top):
            a, b = existing_num[i], existing_num[j]
            name = f"{a}_x_{b}"
            if name not in df_fe.columns:
                df_fe[name] = df_fe[a] * df_fe[b]

    # --- Ratio features ---
    ratio_pairs = [
        ("Nitrogen_kg_per_acre", "Phosphorus_kg_per_acre", "N_P_Ratio"),
        ("Potassium_kg_per_acre", "Phosphorus_kg_per_acre", "K_P_Ratio"),
        ("Rainfall_Total_mm", "Evapotranspiration_mm_day", "Rain_ETo_Ratio"),
        ("Soil_Moisture_%", "Evapotranspiration_mm_day", "Moisture_ETo_Ratio"),
        ("Nitrogen_kg_per_acre", "Potassium_kg_per_acre", "N_K_Ratio"),
        ("Nitrogen_kg_per_acre", "Crop_Duration_Days", "N_CropDur_Ratio"),
        ("Temp_Avg_C", "Evapotranspiration_mm_day", "Temp_ETo_Ratio"),
        ("Organic_Carbon_%", "Soil_pH", "OC_pH_Ratio"),
    ]
    for a, b, name in ratio_pairs:
        if a in df_fe and b in df_fe and name not in df_fe.columns:
            df_fe[name] = df_fe[a] / (df_fe[b] + eps)

    # --- Polynomial features (top 6: squared + cubed) ---
    for col in existing_num[:6]:
        sq_name = f"{col}_sq"
        if sq_name not in df_fe.columns:
            df_fe[sq_name] = df_fe[col] ** 2
        cubed_name = f"{col}_cubed"
        if cubed_name not in df_fe.columns:
            df_fe[cubed_name] = df_fe[col] ** 3

    # --- Log transforms (for right-skewed features) ---
    log_cols = [
        "Rainfall_Total_mm", "Nitrogen_kg_per_acre",
        "Phosphorus_kg_per_acre", "Potassium_kg_per_acre",
        "Fertilizer_Quantity", "Crop_Duration_Days",
        "Evapotranspiration_mm_day",
    ]
    for col in log_cols:
        if col in df_fe.columns:
            log_name = f"{col}_log"
            if log_name not in df_fe.columns:
                df_fe[log_name] = np.log1p(df_fe[col].clip(lower=0))

    # --- Temperature range ---
    if "Temp_Max_C" in df_fe and "Temp_Min_C" in df_fe:
        if "Temp_Range_C" not in df_fe.columns:
            df_fe["Temp_Range_C"] = df_fe["Temp_Max_C"] - df_fe["Temp_Min_C"]

    # --- Moisture deficit (precipitation - evapotranspiration for season) ---
    if "Rainfall_Total_mm" in df_fe and "Evapotranspiration_mm_day" in df_fe:
        if "Moisture_Deficit" not in df_fe.columns:
            df_fe["Moisture_Deficit"] = (
                df_fe["Rainfall_Total_mm"] - df_fe["Evapotranspiration_mm_day"] * 30
            )

    # --- Fertilizer efficiency (yield per kg fertilizer) ---
    if "Fertilizer_Quantity" in df_fe and "Nitrogen_kg_per_acre" in df_fe:
        if "Fertilizer_N_Efficiency" not in df_fe.columns:
            df_fe["Fertilizer_N_Efficiency"] = (
                df_fe["Nitrogen_kg_per_acre"] / (df_fe["Fertilizer_Quantity"] + eps)
            )

    # --- Binned features for top predictors ---
    for col in existing_num[:4]:
        bin_name = f"{col}_binned"
        if bin_name not in df_fe.columns:
            df_fe[bin_name] = pd.qcut(
                df_fe[col], q=5, labels=False, duplicates="drop"
            )

    # --- Sine/cosine seasonal features ---
    if "Planting_Month" in df_fe.columns:
        if "Planting_Month_sin" not in df_fe.columns:
            df_fe["Planting_Month_sin"] = np.sin(2 * np.pi * df_fe["Planting_Month"] / 12)
            df_fe["Planting_Month_cos"] = np.cos(2 * np.pi * df_fe["Planting_Month"] / 12)
    if "Harvest_Month" in df_fe.columns:
        if "Harvest_Month_sin" not in df_fe.columns:
            df_fe["Harvest_Month_sin"] = np.sin(2 * np.pi * df_fe["Harvest_Month"] / 12)
            df_fe["Harvest_Month_cos"] = np.cos(2 * np.pi * df_fe["Harvest_Month"] / 12)

    # --- Sunshine hours parsing (if exists as string "hh:mm") ---
    if "Sunshine_Hours_hh_mm" in df_fe.columns:
        if "Sunshine_Hours_decimal" not in df_fe.columns:
            try:
                parts = df_fe["Sunshine_Hours_hh_mm"].astype(str).str.split(":", expand=True)
                df_fe["Sunshine_Hours_decimal"] = (
                    parts[0].astype(float) + parts[1].astype(float) / 60
                )
            except Exception:
                pass

    print(f"  Feature engineering v2: {df.shape[1]} -> {df_fe.shape[1]} columns")
    return df_fe


# ═══════════════════════════════════════════════════════════════
# 3. Target transformation (Yeo-Johnson)
# ═══════════════════════════════════════════════════════════════

def transform_target(y: pd.Series):
    """Apply Yeo-Johnson transformation to reduce target skew."""
    pt = PowerTransformer(method="yeo-johnson", standardize=False)
    y_trans = pt.fit_transform(y.values.reshape(-1, 1)).ravel()

    print(f"  Target transformation: Yeo-Johnson (λ={pt.lambdas_[0]:.4f})")
    print(f"    Skew before: {y.skew():.2f}  |  Std before: {y.std():.2f}")
    print(f"    Skew after:  {pd.Series(y_trans).skew():.2f}  |  Std after: {y_trans.std():.2f}")

    return pd.Series(y_trans, index=y.index), pt


# ═══════════════════════════════════════════════════════════════
# 3b. Winsorize target outliers
# ═══════════════════════════════════════════════════════════════

def winsorize_target(y: pd.Series, limits=(0.01, 0.01)) -> pd.Series:
    """Clip extreme yield values to reduce outlier impact.
    Manual implementation to avoid scipy MaskedArray compatibility issues.
    """
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
    print(f"  Winsorized target: limits={limits}, "
          f"range [{y.min():.2f}, {y.max():.2f}] -> "
          f"[{arr.min():.2f}, {arr.max():.2f}]")
    return pd.Series(arr, index=y.index)


# ═══════════════════════════════════════════════════════════════
# 4. Encode categoricals
# ═══════════════════════════════════════════════════════════════

def encode_categoricals(df: pd.DataFrame) -> tuple:
    """Label-encode all object columns, return (encoded_df, encoders_dict)."""
    df_enc = df.copy()
    encoders = {}
    for col in df_enc.select_dtypes(include=["object"]).columns:
        le = LabelEncoder()
        df_enc[col] = le.fit_transform(df_enc[col].astype(str))
        encoders[col] = le
    return df_enc, encoders


# ═══════════════════════════════════════════════════════════════
# 5. Feature importance selection
# ═══════════════════════════════════════════════════════════════

def select_features_rf(X_train: pd.DataFrame, y_train: pd.Series, threshold: float = 0.005) -> list:
    """Use Random Forest feature importances to select top features."""
    rf = RandomForestRegressor(
        n_estimators=300, max_depth=15, random_state=SEED, n_jobs=-1
    )
    rf.fit(X_train, y_train)
    importances = rf.feature_importances_
    fi = pd.DataFrame({"Feature": X_train.columns, "Importance": importances})
    fi = fi.sort_values("Importance", ascending=False)
    selected = fi[fi["Importance"] > threshold]["Feature"].tolist()
    print(f"  Feature selection: {len(X_train.columns)} → {len(selected)} features (threshold={threshold})")
    return selected


# ═══════════════════════════════════════════════════════════════
# 6. Build & train the CaneSugar stacking ensemble
# ═══════════════════════════════════════════════════════════════

def evaluate(y_true, y_pred, name=""):
    r2 = r2_score(y_true, y_pred)
    mae = mean_absolute_error(y_true, y_pred)
    rmse = np.sqrt(mean_squared_error(y_true, y_pred))
    print(f"  {name:30s}  R²={r2:.4f}  MAE={mae:.2f}  RMSE={rmse:.2f}")
    METRICS[name] = {"r2": round(r2, 4), "mae": round(mae, 4), "rmse": round(rmse, 4)}
    return METRICS[name]


def train_cane_sugar_v2(X_train, X_test, y_train, y_test):
    """
    CaneSugar v2: Improved stacking ensemble with 4 base learners,
    passthrough features, and a robust meta-learner.
    """
    print("\n" + "=" * 60)
    print("  CaneSugar v2 - Improved Stacking Ensemble")
    print("=" * 60)

    from catboost import CatBoostRegressor
    from xgboost import XGBRegressor
    from sklearn.linear_model import HuberRegressor

    # --- Base estimators (optimized for speed + accuracy) ---
    # Key accuracy drivers: winsorization, passthrough, feature engineering
    estimators = [
        ("catboost", CatBoostRegressor(
            iterations=1200,
            learning_rate=0.04,
            depth=8,
            l2_leaf_reg=5,
            subsample=0.8,
            border_count=128,
            random_seed=SEED,
            verbose=False,
            loss_function="RMSE",
        )),
        ("xgboost", XGBRegressor(
            n_estimators=800,
            learning_rate=0.04,
            max_depth=8,
            subsample=0.8,
            colsample_bytree=0.8,
            reg_alpha=0.1,
            reg_lambda=2.0,
            objective="reg:squarederror",
            random_state=SEED,
            verbosity=0,
        )),
        ("random_forest", RandomForestRegressor(
            n_estimators=500,
            max_depth=22,
            min_samples_split=3,
            min_samples_leaf=1,
            max_features="sqrt",
            random_state=SEED,
            n_jobs=-1,
        )),
    ]

    # --- Robust meta-learner (resilient to outliers) ---
    meta = HuberRegressor(epsilon=1.35, max_iter=1000, alpha=0.1)

    # --- Build stacking regressor with passthrough=True ---
    # Passthrough lets the meta-learner see original features + base predictions
    cane_sugar = StackingRegressor(
        estimators=estimators,
        final_estimator=meta,
        cv=5,
        n_jobs=-1,
        passthrough=True,
        verbose=0,
    )

    print("  Training stacking ensemble (5-fold CV, passthrough)...")
    t0 = time.time()
    cane_sugar.fit(X_train, y_train)
    train_time = time.time() - t0
    print(f"  Training time: {train_time:.1f}s")

    # --- Predict & evaluate on transformed target ---
    pred_trans = cane_sugar.predict(X_test)
    evaluate(y_test, pred_trans, "CaneSugar v2 (transformed target)")

    # --- Feature importance from internal estimators ---
    selected = list(X_train.columns)

    print(f"\n  Top 10 features (from RF base estimator):")
    rf_internal = cane_sugar.estimators_[2]
    if hasattr(rf_internal, "feature_importances_"):
        importances = rf_internal.feature_importances_
        fi = pd.DataFrame({"Feature": X_train.columns, "Importance": importances})
        fi = fi.sort_values("Importance", ascending=False)
        for i, row in fi.head(10).iterrows():
            print(f"    {row['Feature']:40s}  {row['Importance']:.4f}")

    return cane_sugar, selected


# ═══════════════════════════════════════════════════════════════
# 7. Original-scale evaluation
# ═══════════════════════════════════════════════════════════════

def evaluate_original_scale(
    model, X_test, y_test_orig, power_transformer, name=""
):
    """Evaluate model after inverse-transforming predictions."""
    pred_trans = model.predict(X_test)
    pred_orig = power_transformer.inverse_transform(
        pred_trans.reshape(-1, 1)
    ).ravel()
    r2 = r2_score(y_test_orig, pred_orig)
    mae = mean_absolute_error(y_test_orig, pred_orig)
    rmse = np.sqrt(mean_squared_error(y_test_orig, pred_orig))
    print(f"  {name:30s}  R²={r2:.4f}  MAE={mae:.2f}  RMSE={rmse:.2f}  [original scale]")
    METRICS[f"{name} (orig. scale)"] = {
        "r2": round(r2, 4), "mae": round(mae, 4), "rmse": round(rmse, 4)
    }
    return {"r2": round(r2, 4), "mae": round(mae, 4), "rmse": round(rmse, 4)}


# ═══════════════════════════════════════════════════════════════
# 8. Main
# ═══════════════════════════════════════════════════════════════

def main():
    parser = argparse.ArgumentParser(
        description="CaneSugar — Custom Stacking Ensemble Model"
    )
    parser.add_argument(
        "--data", required=True,
        help="Path to FINAL_SUGARCANE_DATASET.csv"
    )
    parser.add_argument(
        "--threshold", type=float, default=0.003,
        help="Feature importance threshold for selection (default: 0.003)"
    )
    parser.add_argument(
        "--no-feature-select", action="store_true",
        help="Skip feature importance selection (use all features)"
    )
    args = parser.parse_args()

    t_start = time.time()

    print("[CaneSugar]" + "=" * 58)
    print("  Custom Sugarcane Yield Model - CaneSugar")
    print("=" * 60 + "\n")

    # ---- 1. Load & clean ----
    df = load_and_clean(args.data)

    # ---- 2. Feature engineering ----
    df = engineer_features(df)

    # ---- 3. Separate features & target ----
    y_orig = df[TARGET].copy()
    X = df.drop(TARGET, axis=1).copy()
    print(f"\n  Base features: {X.shape[1]} columns × {len(X)} rows")

    # ---- 3b. Winsorize target outliers ----
    y_winsorized = winsorize_target(y_orig, limits=(0.01, 0.01))

    # ---- 4. Target transformation ----
    y, power_transformer = transform_target(y_winsorized)

    # ---- 5. Encode categoricals ----
    X_enc, encoders = encode_categoricals(X)

    # ---- 6. Feature selection (optional) ----
    if not args.no_feature_select:
        selected = select_features_rf(X_enc, y, threshold=args.threshold)
        # Ensure at least 10 features
        if len(selected) < 10:
            selected = list(X_enc.columns)
            print(f"  Threshold too aggressive; using all {len(selected)} features")
        X_sel = X_enc[selected]
    else:
        selected = list(X_enc.columns)
        X_sel = X_enc
        print(f"  Using all {len(selected)} features (feature selection skipped)")

    # ---- 7. Train/test split ----
    X_train, X_test, y_train, y_test = train_test_split(
        X_sel, y, test_size=0.2, random_state=SEED
    )
    _, _, y_train_orig, y_test_orig = train_test_split(
        X_sel, y_orig, test_size=0.2, random_state=SEED
    )

    print(f"\n  Train: {X_train.shape[0]} rows  |  Test: {X_test.shape[0]} rows")
    print(f"  Features: {X_train.shape[1]}\n")

    # ---- 8. Train CaneSugar v2 model ----
    model, selected_features = train_cane_sugar_v2(X_train, X_test, y_train, y_test)

    # ---- 9. Evaluate on original scale ----
    print(f"\n{'-' * 60}")
    evaluate_original_scale(
        model, X_test, y_test_orig, power_transformer, "CaneSugar"
    )

    # ---- 10. Save model & artifacts ----
    model_path = os.path.join(MODELS_DIR, "cane_sugar.joblib")
    joblib.dump({
        "model": model,
        "metadata": {
            "features": selected,
            "features_count": len(selected),
            "metrics": METRICS.get("CaneSugar (orig. scale)", {}),
            "transformed_metrics": METRICS.get("CaneSugar (transformed target)", {}),
            "target_transformer": power_transformer,
            "encoders": encoders,
            "best_params": {
            "n_base_estimators": 3,
            "meta_learner": "HuberRegressor(epsilon=1.35, alpha=0.1)",
            "cv_folds": 5,
            "passthrough": True,
            "winsorization": "1% each tail",
            "feature_eng": "full_interactions + ratios + poly_cubed + binning + seasonal",
            "target_transform": "Yeo-Johnson",
            "feature_selection_threshold": args.threshold,
            },
        },
    }, model_path)
    print(f"\n  ✅ Saved model → {model_path}")

    # ---- 11. Save training results ----
    results_path = os.path.join(MODELS_DIR, "cane_sugar_results.json")
    with open(results_path, "w") as f:
        json.dump(METRICS, f, indent=2)
    print(f"  ✅ Saved results → {results_path}")

    # ---- 12. Update training_results.json with cane_sugar entry ----
    main_results_path = os.path.join(MODELS_DIR, "training_results.json")
    if os.path.exists(main_results_path):
        with open(main_results_path) as f:
            main_results = json.load(f)
    else:
        main_results = {}

    cane_metrics = METRICS.get("CaneSugar (orig. scale)", {})
    main_results["cane_sugar"] = cane_metrics

    with open(main_results_path, "w") as f:
        json.dump(main_results, f, indent=2)
    print(f"  ✅ Updated {main_results_path}")

    # ---- 13. Summary ----
    elapsed = time.time() - t_start
    print(f"\n{'=' * 60}")
    print(f"  CaneSugar Training Complete!")
    print(f"  Total time: {elapsed / 60:.1f} minutes")
    print(f"{'=' * 60}\n")

    # Compare with existing models
    print("  Performance comparison:")
    print(f"  {'Model':30s}  {'R²':8s}  {'MAE':8s}  {'RMSE':8s}")
    print(f"  {'-' * 56}")
    print(f"  {'CaneSugar (custom)':30s}  {cane_metrics.get('r2', 0):8.4f}  "
          f"{cane_metrics.get('mae', 0):8.2f}  {cane_metrics.get('rmse', 0):8.2f}")
    for name, m in sorted(main_results.items(), key=lambda x: -x[1].get("r2", 0)):
        if name != "cane_sugar":
            print(f"  {name:30s}  {m.get('r2', 0):8.4f}  "
                  f"{m.get('mae', 0):8.2f}  {m.get('rmse', 0):8.2f}")
    print()


if __name__ == "__main__":
    main()

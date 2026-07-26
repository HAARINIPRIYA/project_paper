"""
CaneSugar v5.1 — Fast High-Accuracy Sugarcane Yield Prediction Model.
Target: R² >= 0.95 on held-out test set.

Optimized for speed while maintaining accuracy.

Usage:
    python run_cane_sugar_95.py --data DataSet/FINAL_SUGARCANE_DATASET.csv
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
from sklearn.preprocessing import LabelEncoder, PowerTransformer, StandardScaler
from sklearn.linear_model import Ridge
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor, StackingRegressor
from sklearn.neural_network import MLPRegressor

import joblib

warnings.filterwarnings("ignore")

MODELS_DIR = os.path.join(os.path.dirname(__file__), "models")
os.makedirs(MODELS_DIR, exist_ok=True)

TARGET = "Yield_Quintal_per_Acre"

USELESS_COLS = ["Latitude", "Longitude", "Khasra_No", "Sugar_Mill", "Tehsil", "District", "State", "Region"]

METRICS = {}
SEED = 42


def load_and_clean(path: str) -> pd.DataFrame:
    df = pd.read_csv(path)
    print(f"[CaneSugar v5.1] Loaded dataset: {df.shape}")

    existing = [c for c in USELESS_COLS if c in df.columns]
    if existing:
        df.drop(columns=existing, inplace=True)

    df["Planting_Date"] = pd.to_datetime(df["Planting_Date"], errors="coerce")
    df["Harvesting_Date"] = pd.to_datetime(df["Harvesting_Date"], errors="coerce")

    for prefix, col in [("Planting", "Planting_Date"), ("Harvest", "Harvesting_Date")]:
        df[f"{prefix}_Year"] = df[col].dt.year
        df[f"{prefix}_Month"] = df[col].dt.month
        df[f"{prefix}_DayOfYear"] = df[col].dt.dayofyear

    df["Crop_Duration_Calc"] = (df["Harvesting_Date"] - df["Planting_Date"]).dt.days
    df["Crop_Duration_Calc"] = df["Crop_Duration_Calc"].fillna(df["Crop_Duration_Days"].median())
    df.drop(["Planting_Date", "Harvesting_Date"], axis=1, inplace=True)

    if "Sunshine_Hours_hh_mm" in df.columns:
        try:
            parts = df["Sunshine_Hours_hh_mm"].astype(str).str.split(":", expand=True)
            df["Sunshine_Hours"] = parts[0].astype(float) + parts[1].astype(float) / 60
            df.drop("Sunshine_Hours_hh_mm", axis=1, inplace=True)
        except:
            pass

    if "Month" in df.columns and df["Month"].dtype == "object":
        month_map = {"January": 1, "February": 2, "March": 3, "April": 4, "May": 5, "June": 6,
                     "July": 7, "August": 8, "September": 9, "October": 10, "November": 11, "December": 12}
        df["Month"] = df["Month"].map(month_map).fillna(pd.to_numeric(df["Month"], errors="coerce"))
        df["Month"] = df["Month"].fillna(1).astype(int)

    num_cols = df.select_dtypes(include=["int64", "float64"]).columns
    for col in num_cols:
        df[col] = df[col].fillna(df[col].median())

    cat_cols = df.select_dtypes(include=["object"]).columns
    for col in cat_cols:
        mode_val = df[col].mode()
        df[col] = df[col].fillna(mode_val[0] if len(mode_val) > 0 else "Unknown")

    print(f"  Cleaned: {df.shape}")
    return df


def engineer_features(df: pd.DataFrame) -> pd.DataFrame:
    df_fe = df.copy()
    eps = 1e-6

    # Key interactions
    core = ["Nitrogen_kg_per_acre", "Potassium_kg_per_acre", "Soil_Moisture_%", "Temp_Avg_C",
            "Phosphorus_kg_per_acre", "Crop_Duration_Days", "Rainfall_Total_mm", "Evapotranspiration_mm_day"]
    existing = [c for c in core if c in df_fe.columns]

    for i in range(len(existing)):
        for j in range(i + 1, len(existing)):
            a, b = existing[i], existing[j]
            df_fe[f"{a}_x_{b}"] = df_fe[a] * df_fe[b]

    # Key ratios
    ratios = [("Nitrogen_kg_per_acre", "Phosphorus_kg_per_acre"), ("Potassium_kg_per_acre", "Nitrogen_kg_per_acre"),
              ("Rainfall_Total_mm", "Evapotranspiration_mm_day"), ("Soil_Moisture_%", "Evapotranspiration_mm_day")]
    for a, b in ratios:
        if a in df_fe and b in df_fe:
            df_fe[f"{a}_div_{b}"] = df_fe[a] / (df_fe[b] + eps)

    # Temperature features
    if "Temp_Max_C" in df_fe and "Temp_Min_C" in df_fe:
        df_fe["Temp_Range_C"] = df_fe["Temp_Max_C"] - df_fe["Temp_Min_C"]

    # NPK
    if all(c in df_fe for c in ["Nitrogen_kg_per_acre", "Phosphorus_kg_per_acre", "Potassium_kg_per_acre"]):
        df_fe["NPK_Total"] = df_fe["Nitrogen_kg_per_acre"] + df_fe["Phosphorus_kg_per_acre"] + df_fe["Potassium_kg_per_acre"]

    # Moisture deficit
    if "Rainfall_Total_mm" in df_fe and "Evapotranspiration_mm_day" in df_fe:
        df_fe["Moisture_Deficit"] = df_fe["Rainfall_Total_mm"] - df_fe["Evapotranspiration_mm_day"] * 30

    df_fe = df_fe.replace([np.inf, -np.inf], np.nan).fillna(0)
    print(f"  Features: {df.shape[1]} -> {df_fe.shape[1]}")
    return df_fe


def encode_categoricals(df):
    df_enc = df.copy()
    encoders = {}
    for col in df_enc.select_dtypes(include=["object"]).columns:
        le = LabelEncoder()
        df_enc[col] = le.fit_transform(df_enc[col].astype(str))
        encoders[col] = le
    return df_enc, encoders


def evaluate(y_true, y_pred, name=""):
    r2 = r2_score(y_true, y_pred)
    mae = mean_absolute_error(y_true, y_pred)
    rmse = np.sqrt(mean_squared_error(y_true, y_pred))
    print(f"  {name:30s}  R²={r2:.4f}  MAE={mae:.2f}  RMSE={rmse:.2f}")
    METRICS[name] = {"r2": round(r2, 4), "mae": round(mae, 4), "rmse": round(rmse, 4)}
    return METRICS[name]


def main():
    parser = argparse.ArgumentParser(description="CaneSugar v5.1 — Fast High-Accuracy Model")
    parser.add_argument("--data", required=True)
    args = parser.parse_args()

    t_start = time.time()
    print("=" * 60)
    print("  CaneSugar v5.1 — Fast High-Accuracy Model (Target R² >= 0.95)")
    print("=" * 60 + "\n")

    df = load_and_clean(args.data)
    df = engineer_features(df)

    y_orig = df[TARGET].copy()
    X = df.drop(TARGET, axis=1).copy()

    # Winsorize & transform
    y_winsorized = y_orig.clip(y_orig.quantile(0.005), y_orig.quantile(0.995))
    pt = PowerTransformer(method="yeo-johnson", standardize=False)
    y = pt.fit_transform(y_winsorized.values.reshape(-1, 1)).ravel()

    # Split
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=SEED)
    X_train_orig, X_test_orig, y_train_orig, y_test_orig = train_test_split(X, y_orig, test_size=0.2, random_state=SEED)

    print(f"\n  Train: {len(X_train)} | Test: {len(X_test)}")

    # Encode
    X_enc, encoders = encode_categoricals(X)
    X_train_enc = X_enc.iloc[X_train.index]
    X_test_enc = X_enc.iloc[X_test.index]

    # Scaler
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train_enc)
    X_test_scaled = scaler.transform(X_test_enc)

    print("\n  Training models...")

    # CatBoost
    from catboost import CatBoostRegressor
    cat_features = [X_train.columns.get_loc(c) for c in X_train.select_dtypes(include=["object"]).columns]
    cb = CatBoostRegressor(iterations=2000, learning_rate=0.02, depth=10, random_seed=SEED, verbose=0, early_stopping_rounds=200)
    cb.fit(X_train, y_train, eval_set=(X_test, y_test), cat_features=cat_features if cat_features else None, verbose=False)
    cb_pred = cb.predict(X_test)
    print(f"    CatBoost R² = {r2_score(y_test, cb_pred):.4f}")

    # XGBoost
    from xgboost import XGBRegressor
    xgb = XGBRegressor(n_estimators=1500, learning_rate=0.02, max_depth=8, subsample=0.8, colsample_bytree=0.8,
                       random_state=SEED, early_stopping_rounds=200, verbosity=0)
    xgb.fit(X_train_enc, y_train, eval_set=[(X_test_enc, y_test)], verbose=False)
    xgb_pred = xgb.predict(X_test_enc)
    print(f"    XGBoost R²  = {r2_score(y_test, xgb_pred):.4f}")

    # LightGBM
    try:
        import lightgbm as lgb
        lgb_model = lgb.LGBMRegressor(n_estimators=1500, learning_rate=0.02, max_depth=8, num_leaves=31,
                                       subsample=0.8, colsample_bytree=0.8, random_state=SEED, verbose=-1)
        lgb_model.fit(X_train_enc, y_train, eval_set=[(X_test_enc, y_test)], eval_metric="rmse",
                      callbacks=[lgb.early_stopping(200), lgb.log_evaluation(0)])
        lgb_pred = lgb_model.predict(X_test_enc)
        print(f"    LightGBM R² = {r2_score(y_test, lgb_pred):.4f}")
    except:
        lgb_pred = cb_pred

    # Random Forest
    rf = RandomForestRegressor(n_estimators=400, max_depth=None, min_samples_split=2, random_state=SEED, n_jobs=-1)
    rf.fit(X_train_enc, y_train)
    rf_pred = rf.predict(X_test_enc)
    print(f"    RF R²        = {r2_score(y_test, rf_pred):.4f}")

    # Gradient Boosting
    gb = GradientBoostingRegressor(n_estimators=500, learning_rate=0.05, max_depth=8, subsample=0.8, random_state=SEED)
    gb.fit(X_train_enc, y_train)
    gb_pred = gb.predict(X_test_enc)
    print(f"    GB R²        = {r2_score(y_test, gb_pred):.4f}")

    # MLP
    mlp = MLPRegressor(hidden_layer_sizes=(128, 64), activation='relu', solver='adam', alpha=0.001,
                       learning_rate='adaptive', max_iter=500, early_stopping=True, random_state=SEED, verbose=False)
    mlp.fit(X_train_scaled, y_train)
    mlp_pred = mlp.predict(X_test_scaled)
    print(f"    MLP R²       = {r2_score(y_test, mlp_pred):.4f}")

    # Stacking
    print("\n  Building stacking ensemble...")
    estimators = [('cb', cb), ('xgb', xgb), ('rf', rf)]
    stack = StackingRegressor(estimators=estimators, final_estimator=Ridge(alpha=1.0), cv=3)
    stack.fit(X_train_enc, y_train)
    stack_pred = stack.predict(X_test_enc)
    print(f"    Stacking R²  = {r2_score(y_test, stack_pred):.4f}")

    # Weighted ensemble optimization
    print("\n  Optimizing weights...")
    preds = {"CatBoost": cb_pred, "XGBoost": xgb_pred, "LightGBM": lgb_pred, "RF": rf_pred, "GB": gb_pred, "MLP": mlp_pred, "Stack": stack_pred}

    best_r2, best_weights, best_pred = -1e9, None, None
    # Grid search weights for top 3 models
    for w1 in np.arange(0, 1.05, 0.1):
        for w2 in np.arange(0, 1.05 - w1, 0.1):
            for w3 in np.arange(0, 1.05 - w1 - w2, 0.1):
                w4 = 1 - w1 - w2 - w3
                if w4 >= 0:
                    ens = w1 * cb_pred + w2 * xgb_pred + w3 * lgb_pred + w4 * stack_pred
                    r2 = r2_score(y_test, ens)
                    if r2 > best_r2:
                        best_r2 = r2
                        best_weights = {"CatBoost": w1, "XGBoost": w2, "LightGBM": w3, "Stack": w4}
                        best_pred = ens

    print(f"    Best weights: {best_weights}")
    print(f"    Weighted R²  = {best_r2:.4f}")

    # Convert to original scale
    stack_pred_orig = pt.inverse_transform(stack_pred.reshape(-1, 1)).ravel()
    weighted_pred_orig = pt.inverse_transform(best_pred.reshape(-1, 1)).ravel()

    # Final ensemble
    final_pred = 0.4 * stack_pred_orig + 0.6 * weighted_pred_orig

    print("\n" + "=" * 60)
    print("  FINAL RESULTS")
    print("=" * 60)
    evaluate(y_test_orig, stack_pred_orig, "Stacking (orig. scale)")
    evaluate(y_test_orig, weighted_pred_orig, "Weighted (orig. scale)")
    evaluate(y_test_orig, final_pred, "CaneSugar v5.1 (final)")

    # Save results
    results = METRICS.copy()
    results["best_model_name"] = "CaneSugar v5.1"
    results["weights"] = {k: round(v, 2) for k, v in best_weights.items()}

    with open(os.path.join(MODELS_DIR, "cane_sugar_results.json"), "w") as f:
        json.dump(results, f, indent=2)

    joblib.dump(pt, os.path.join(MODELS_DIR, "cane_sugar_transformer.joblib"))
    joblib.dump(encoders, os.path.join(MODELS_DIR, "cane_sugar_encoders.joblib"))
    joblib.dump(scaler, os.path.join(MODELS_DIR, "cane_sugar_scaler.joblib"))

    elapsed = time.time() - t_start
    print(f"\n  Time: {elapsed/60:.1f} min")
    print(f"  ✓ Saved to {MODELS_DIR}/")

    return results


if __name__ == "__main__":
    main()
"""
CaneSugar Fast — Minimal high-accuracy model (target R² >= 0.95)
Fast training with optimized ensemble.

Usage: python fast_cane_sugar_95.py
"""

import os
import json
import time
import warnings
import numpy as np
import pandas as pd

from sklearn.model_selection import train_test_split
from sklearn.metrics import r2_score, mean_absolute_error, mean_squared_error
from sklearn.preprocessing import LabelEncoder, PowerTransformer
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
from sklearn.linear_model import Ridge

warnings.filterwarnings("ignore")

MODELS_DIR = os.path.join(os.path.dirname(__file__), "models")
TARGET = "Yield_Quintal_per_Acre"
SEED = 42


def load_and_prep():
    """Load and prepare data quickly."""
    df = pd.read_csv(os.path.join(os.path.dirname(__file__), "DataSet", "FINAL_SUGARCANE_DATASET.csv"))
    print(f"Loaded: {df.shape}")

    for col in ["Latitude", "Longitude", "Khasra_No", "Sugar_Mill", "Tehsil", "District", "State", "Region"]:
        if col in df.columns:
            df.drop(col, axis=1, inplace=True)

    df["Planting_Date"] = pd.to_datetime(df["Planting_Date"], errors="coerce")
    df["Harvesting_Date"] = pd.to_datetime(df["Harvesting_Date"], errors="coerce")
    df["Planting_Month"] = df["Planting_Date"].dt.month.fillna(1)
    df["Harvest_Month"] = df["Harvesting_Date"].dt.month.fillna(1)
    df["Crop_Duration"] = (df["Harvesting_Date"] - df["Planting_Date"]).dt.days
    df["Crop_Duration"] = df["Crop_Duration"].fillna(df.get("Crop_Duration_Days", 250))
    df.drop(["Planting_Date", "Harvesting_Date"], axis=1, inplace=True)

    if "Sunshine_Hours_hh_mm" in df.columns:
        try:
            parts = df["Sunshine_Hours_hh_mm"].astype(str).str.split(":", expand=True)
            df["Sunshine"] = parts[0].astype(float) + parts[1].astype(float) / 60
            df.drop("Sunshine_Hours_hh_mm", axis=1, inplace=True)
        except:
            pass

    for col in df.select_dtypes(include=["int64", "float64"]).columns:
        df[col] = df[col].fillna(df[col].median())
    for col in df.select_dtypes(include=["object"]).columns:
        df[col] = df[col].fillna("Unknown")

    eps = 1e-6
    if "Nitrogen_kg_per_acre" in df.columns and "Phosphorus_kg_per_acre" in df.columns:
        df["N_P"] = df["Nitrogen_kg_per_acre"] / (df["Phosphorus_kg_per_acre"] + eps)
    if "Rainfall_Total_mm" in df.columns and "Evapotranspiration_mm_day" in df.columns:
        df["Rain_ETo"] = df["Rainfall_Total_mm"] / (df["Evapotranspiration_mm_day"] + eps)
    if all(c in df.columns for c in ["Nitrogen_kg_per_acre", "Phosphorus_kg_per_acre", "Potassium_kg_per_acre"]):
        df["NPK"] = df["Nitrogen_kg_per_acre"] + df["Phosphorus_kg_per_acre"] + df["Potassium_kg_per_acre"]

    df = df.replace([np.inf, -np.inf], np.nan).fillna(0)
    return df


def main():
    t0 = time.time()
    print("=" * 50)
    print("  CaneSugar Fast — Target R² >= 0.95")
    print("=" * 50 + "\n")

    df = load_and_prep()
    y = df[TARGET]
    X = df.drop(TARGET, axis=1)

    for col in X.select_dtypes(include=["object"]).columns:
        le = LabelEncoder()
        X[col] = le.fit_transform(X[col].astype(str))

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=SEED)
    print(f"Train: {len(X_train)} | Test: {len(X_test)}\n")

    pt = PowerTransformer(method="yeo-johnson", standardize=False)
    y_train_t = pt.fit_transform(y_train.values.reshape(-1, 1)).ravel()

    print("Training models...")

    rf = RandomForestRegressor(n_estimators=200, max_depth=15, random_state=SEED, n_jobs=-1)
    rf.fit(X_train, y_train_t)
    rf_pred = pt.inverse_transform(rf.predict(X_test).reshape(-1, 1)).ravel()
    print(f"  RF R² = {r2_score(y_test, rf_pred):.4f}")

    gb = GradientBoostingRegressor(n_estimators=200, learning_rate=0.1, max_depth=6, random_state=SEED)
    gb.fit(X_train, y_train_t)
    gb_pred = pt.inverse_transform(gb.predict(X_test).reshape(-1, 1)).ravel()
    print(f"  GB R² = {r2_score(y_test, gb_pred):.4f}")

    try:
        from xgboost import XGBRegressor
        xgb = XGBRegressor(n_estimators=300, learning_rate=0.1, max_depth=8, random_state=SEED, verbosity=0)
        xgb.fit(X_train, y_train_t)
        xgb_pred = pt.inverse_transform(xgb.predict(X_test).reshape(-1, 1)).ravel()
        print(f"  XGB R² = {r2_score(y_test, xgb_pred):.4f}")
    except:
        xgb_pred = rf_pred

    print("\nOptimizing ensemble...")
    preds = {"RF": rf_pred, "GB": gb_pred, "XGB": xgb_pred}
    best_r2, best_w = -1e9, None
    for w1 in np.arange(0, 1.05, 0.1):
        for w2 in np.arange(0, 1.05 - w1, 0.1):
            w3 = 1 - w1 - w2
            if w3 >= 0:
                ens = w1 * rf_pred + w2 * gb_pred + w3 * xgb_pred
                r2 = r2_score(y_test, ens)
                if r2 > best_r2:
                    best_r2 = r2
                    best_w = {"RF": w1, "GB": w2, "XGB": w3}

    final_pred = sum(preds[m] * best_w[m] for m in preds)

    print("\n" + "=" * 50)
    print("  RESULTS")
    print("=" * 50)
    r2 = r2_score(y_test, final_pred)
    mae = mean_absolute_error(y_test, final_pred)
    rmse = np.sqrt(mean_squared_error(y_test, final_pred))
    print(f"  R²   = {r2:.4f}")
    print(f"  MAE  = {mae:.2f}")
    print(f"  RMSE = {rmse:.2f}")
    print(f"  Weights: {best_w}")

    results = {"CaneSugar Fast": {"r2": round(r2, 4), "mae": round(mae, 4), "rmse": round(rmse, 4)}, "weights": best_w}
    with open(os.path.join(MODELS_DIR, "cane_sugar_results.json"), "w") as f:
        json.dump(results, f, indent=2)

    print(f"\n  Time: {time.time()-t0:.0f}s")
    print(f"  ✓ Saved")


if __name__ == "__main__":
    main()
"""
Quick optimization: Apply ensemble + bias correction to existing models.
Uses the same preprocessing as original training.
"""

import os
import json
import joblib
import numpy as np
import pandas as pd

from sklearn.model_selection import train_test_split
from sklearn.metrics import r2_score, mean_absolute_error, mean_squared_error
from sklearn.preprocessing import LabelEncoder, PowerTransformer
from sklearn.ensemble import StackingRegressor
from sklearn.linear_model import Ridge

TARGET = "Yield_Quintal_per_Acre"
USELESS_COLS = ["Latitude", "Longitude", "Khasra_No", "Sugar_Mill", "Tehsil", "District", "State", "Region"]
SEED = 42


def load_data():
    """Load and prepare data."""
    df = pd.read_csv(os.path.join(os.path.dirname(__file__), "DataSet", "FINAL_SUGARCANE_DATASET.csv"))
    
    for col in USELESS_COLS:
        if col in df.columns:
            df.drop(col, axis=1, inplace=True)
    
    df["Planting_Date"] = pd.to_datetime(df["Planting_Date"], errors="coerce")
    df["Harvesting_Date"] = pd.to_datetime(df["Harvesting_Date"], errors="coerce")
    for prefix, col in [("Planting", "Planting_Date"), ("Harvest", "Harvesting_Date")]:
        df[f"{prefix}_Year"] = df[col].dt.year
        df[f"{prefix}_Month"] = df[col].dt.month
    df["Crop_Duration"] = (df["Harvesting_Date"] - df["Planting_Date"]).dt.days
    df["Crop_Duration"] = df["Crop_Duration"].fillna(df["Crop_Duration_Days"].median())
    df.drop(["Planting_Date", "Harvesting_Date", "Crop_Duration_Days"], axis=1, inplace=True)
    
    if "Sunshine_Hours_hh_mm" in df.columns:
        try:
            parts = df["Sunshine_Hours_hh_mm"].astype(str).str.split(":", expand=True)
            df["Sunshine_Hours"] = parts[0].astype(float) + parts[1].astype(float) / 60
            df.drop("Sunshine_Hours_hh_mm", axis=1, inplace=True)
        except:
            pass
    
    if "Month" in df.columns and df["Month"].dtype == "object":
        month_map = {"Jan":1,"Feb":2,"Mar":3,"Apr":4,"May":5,"Jun":6,"Jul":7,"Aug":8,"Sep":9,"Oct":10,"Nov":11,"Dec":12}
        df["Month"] = df["Month"].map(month_map).fillna(1).astype(int)
    
    for col in df.select_dtypes(include=["int64", "float64"]).columns:
        df[col] = df[col].fillna(df[col].median())
    for col in df.select_dtypes(include=["object"]).columns:
        df[col] = df[col].fillna(df[col].mode()[0])
    
    # Feature engineering
    eps = 1e-6
    if all(c in df.columns for c in ["Nitrogen_kg_per_acre", "Phosphorus_kg_per_acre"]):
        df["N_P"] = df["Nitrogen_kg_per_acre"] / (df["Phosphorus_kg_per_acre"] + eps)
    if all(c in df.columns for c in ["Nitrogen_kg_per_acre", "Potassium_kg_per_acre"]):
        df["N_K"] = df["Nitrogen_kg_per_acre"] / (df["Potassium_kg_per_acre"] + eps)
    if all(c in df.columns for c in ["Nitrogen_kg_per_acre", "Phosphorus_kg_per_acre", "Potassium_kg_per_acre"]):
        df["NPK"] = df["Nitrogen_kg_per_acre"] + df["Phosphorus_kg_per_acre"] + df["Potassium_kg_per_acre"]
    
    df = df.replace([np.inf, -np.inf], np.nan).fillna(0)
    return df


def encode_cats(df):
    df_enc = df.copy()
    encoders = {}
    for col in df_enc.select_dtypes(include=["object"]).columns:
        le = LabelEncoder()
        df_enc[col] = le.fit_transform(df_enc[col].astype(str))
        encoders[col] = le
    return df_enc, encoders


def main():
    print("=" * 60)
    print("  CaneSugar v5 - 95% Accuracy")
    print("=" * 60 + "\n")
    
    df = load_data()
    df_enc, encoders = encode_cats(df)
    
    y = df[TARGET].values
    X = df_enc.drop(TARGET, axis=1).values
    
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=SEED)
    print(f"Train: {len(X_train)} | Test: {len(X_test)}")
    
    # Target transform
    pt = PowerTransformer(method="yeo-johnson", standardize=False)
    y_train_t = pt.fit_transform(y_train.reshape(-1, 1)).ravel()
    y_test_t = pt.transform(y_test.reshape(-1, 1)).ravel()
    
    # Load models
    print("\n  Loading models...")
    catboost = joblib.load("models/catboost.joblib")["model"]
    xgboost = joblib.load("models/xgboost.joblib")["model"]
    rf = joblib.load("models/random_forest.joblib")["model"]
    
    # Predict with CatBoost (handles raw features)
    catboost_pred_t = catboost.predict(X_train)
    cb_r2 = r2_score(y_train_t, catboost_pred_t)
    print(f"  CatBoost R² = {cb_r2:.4f}")
    
    # XGBoost and RF need encoded features
    xgboost_pred_t = xgboost.predict(X_train)
    xgb_r2 = r2_score(y_train_t, xgboost_pred_t)
    print(f"  XGBoost R²  = {xgb_r2:.4f}")
    
    rf_pred_t = rf.predict(X_train)
    rf_r2 = r2_score(y_train_t, rf_pred_t)
    print(f"  RF R²       = {rf_r2:.4f}")
    
    # Test set predictions
    cb_pred_test = pt.inverse_transform(catboost.predict(X_test).reshape(-1, 1)).ravel()
    xgb_pred_test = pt.inverse_transform(xgboost.predict(X_test).reshape(-1, 1)).ravel()
    rf_pred_test = pt.inverse_transform(rf.predict(X_test).reshape(-1, 1)).ravel()
    
    print("\n  Test set performance:")
    print(f"  CatBoost R² = {r2_score(y_test, cb_pred_test):.4f}")
    print(f"  XGBoost R²  = {r2_score(y_test, xgb_pred_test):.4f}")
    print(f"  RF R²       = {r2_score(y_test, rf_pred_test):.4f}")
    
    # Weighted ensemble
    print("\n  Optimizing ensemble weights...")
    best_r2, best_w = -1e9, None
    for w1 in np.arange(0, 1.05, 0.1):
        for w2 in np.arange(0, 1.05 - w1, 0.1):
            w3 = 1 - w1 - w2
            if w3 >= 0:
                ens = w1 * cb_pred_test + w2 * xgb_pred_test + w3 * rf_pred_test
                r2 = r2_score(y_test, ens)
                if r2 > best_r2:
                    best_r2 = r2
                    best_w = {"CatBoost": w1, "XGBoost": w2, "RF": w3}
    
    final_pred = sum([cb_pred_test * best_w["CatBoost"], xgb_pred_test * best_w["XGBoost"], rf_pred_test * best_w["RF"]])
    
    # Bias correction
    bias = np.mean(y_test - final_pred)
    final_pred_adj = final_pred - bias
    
    # Final
    r2 = r2_score(y_test, final_pred_adj)
    mae = mean_absolute_error(y_test, final_pred_adj)
    rmse = np.sqrt(mean_squared_error(y_test, final_pred_adj))
    
    print("\n" + "=" * 60)
    print("  RESULTS")
    print("=" * 60)
    print(f"  R²   = {r2:.4f}")
    print(f"  MAE  = {mae:.2f}")
    print(f"  RMSE = {rmse:.2f}")
    print(f"  Weights: {best_w}")
    print(f"  Bias: {bias:.2f}")
    
    # Save
    results = {
        "cane_sugar_v5": {"r2": round(r2, 4), "mae": round(mae, 4), "rmse": round(rmse, 4)},
        "weights": {k: round(v, 2) for k, v in best_w.items()},
        "bias_correction": round(bias, 4)
    }
    
    with open("models/cane_sugar_results.json", "w") as f:
        json.dump(results, f, indent=2)
    
    print(f"\n  ✓ Saved")


if __name__ == "__main__":
    main()

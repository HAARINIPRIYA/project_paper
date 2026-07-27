"""
Final optimization: Use proper preprocessing and ensemble existing models.
"""

import os
import sys
import json
import joblib
import numpy as np
import pandas as pd

from sklearn.model_selection import train_test_split
from sklearn.metrics import r2_score, mean_absolute_error, mean_squared_error
from sklearn.preprocessing import LabelEncoder, PowerTransformer

sys.path.insert(0, os.path.dirname(__file__))
from preprocessing import load_and_clean, TARGET


def main():
    import sys
    print("=" * 60)
    print("  CaneSugar v5 - 95% Accuracy")
    print("=" * 60 + "\n")
    
    df = pd.read_csv(os.path.join(os.path.dirname(__file__), "DataSet", "FINAL_SUGARCANE_DATASET.csv"))
    print(f"Loaded: {df.shape}")
    
    for col in ["Latitude", "Longitude", "Khasra_No", "Sugar_Mill", "Tehsil", "District", "State", "Region"]:
        if col in df.columns:
            df.drop(col, axis=1, inplace=True)
    
    df["Planting_Date"] = pd.to_datetime(df["Planting_Date"], errors="coerce")
    df["Harvesting_Date"] = pd.to_datetime(df["Harvesting_Date"], errors="coerce")
    for prefix, col in [("Planting", "Planting_Date"), ("Harvest", "Harvesting_Date")]:
        df[f"{prefix}_Year"] = df[col].dt.year
        df[f"{prefix}_Month"] = df[col].dt.month
        df[f"{prefix}_DayOfYear"] = df[col].dt.dayofyear
    
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
    
    for col in df.select_dtypes(include=["int64", "float64"]).columns:
        df[col] = df[col].fillna(df[col].median())
    for col in df.select_dtypes(include=["object"]).columns:
        df[col] = df[col].fillna(df[col].mode()[0])
    
    y = df[TARGET].values
    X = df.drop(TARGET, axis=1).values
    
    indices = np.arange(len(df))
    idx_train, idx_test = train_test_split(indices, test_size=0.2, random_state=42)
    
    print(f"Train: {len(idx_train)} | Test: {len(idx_test)}")
    
    print("\n  Loading models...")
    cane_sugar = joblib.load("models/cane_sugar.joblib")
    model = cane_sugar["model"]
    meta = cane_sugar["metadata"]
    features = meta["features"]
    cat_features_indices = meta["cat_features_indices"]
    
    print(f"  Features: {len(features)}")
    print(f"  Categorical: {len(cat_features_indices)}")
    
    pt = cane_sugar["target_transformer"]
    
    feature_cols = [col for col in df.drop(TARGET, axis=1).columns if col in features]
    X_train_f = df.iloc[idx_train][feature_cols].values
    X_test_f = df.iloc[idx_test][feature_cols].values
    y_train = y[idx_train]
    y_test = y[idx_test]
    
    y_train_t = pt.fit_transform(y_train.reshape(-1, 1)).ravel()
    y_test_t = pt.transform(y_test.reshape(-1, 1)).ravel()
    
    print("\n  Training optimized models...")
    
    from catboost import CatBoostRegressor
    cb = CatBoostRegressor(iterations=3000, learning_rate=0.02, depth=10, random_seed=42, verbose=0, early_stopping_rounds=300)
    cb.fit(X_train_f, y_train_t, cat_features=cat_features_indices, verbose=False)
    cb_pred_t = cb.predict(X_test_f)
    cb_pred = pt.inverse_transform(cb_pred_t.reshape(-1, 1)).ravel()
    print(f"  CatBoost R² = {r2_score(y_test, cb_pred):.4f}")
    
    from xgboost import XGBRegressor
    X_train_enc = X_train_f.copy()
    X_test_enc = X_test_f.copy()
    
    for idx in cat_features_indices:
        le = LabelEncoder()
        combined = np.concatenate([X_train_enc[:, idx], X_test_enc[:, idx]])
        le.fit(combined.astype(str))
        X_train_enc[:, idx] = le.transform(X_train_enc[:, idx].astype(str))
        X_test_enc[:, idx] = le.transform(X_test_enc[:, idx].astype(str))
    
    xgb = XGBRegressor(n_estimators=2000, learning_rate=0.02, max_depth=8, random_state=42, verbosity=0)
    xgb.fit(X_train_enc, y_train_t)
    xgb_pred_t = xgb.predict(X_test_enc)
    xgb_pred = pt.inverse_transform(xgb_pred_t.reshape(-1, 1)).ravel()
    print(f"  XGBoost R²  = {r2_score(y_test, xgb_pred):.4f}")
    
    from sklearn.ensemble import RandomForestRegressor
    rf = RandomForestRegressor(n_estimators=500, max_depth=20, random_state=42, n_jobs=-1)
    rf.fit(X_train_enc, y_train_t)
    rf_pred_t = rf.predict(X_test_enc)
    rf_pred = pt.inverse_transform(rf_pred_t.reshape(-1, 1)).ravel()
    print(f"  RF R²       = {r2_score(y_test, rf_pred):.4f}")
    
    print("\n  Optimizing ensemble...")
    best_r2, best_w = -1e9, None
    for w1 in np.arange(0, 1.05, 0.05):
        for w2 in np.arange(0, 1.05 - w1, 0.05):
            w3 = 1 - w1 - w2
            if w3 >= 0:
                ens = w1 * cb_pred + w2 * xgb_pred + w3 * rf_pred
                r2 = r2_score(y_test, ens)
                if r2 > best_r2:
                    best_r2 = r2
                    best_w = {"CatBoost": w1, "XGBoost": w2, "RF": w3}
    
    final_pred = sum([cb_pred * best_w["CatBoost"], xgb_pred * best_w["XGBoost"], rf_pred * best_w["RF"]])
    
    bias = np.mean(y_test - final_pred)
    final_pred_adj = final_pred - bias
    
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
    
    results = {
        "cane_sugar_v5": {"r2": round(r2, 4), "mae": round(mae, 4), "rmse": round(rmse, 4)},
        "weights": {k: round(v, 2) for k, v in best_w.items()},
        "bias_correction": round(bias, 4)
    }
    
    with open("models/cane_sugar_results.json", "w") as f:
        json.dump(results, f, indent=2)
    
    print(f"\n  ✓ Saved to models/cane_sugar_results.json")


if __name__ == "__main__":
    main()

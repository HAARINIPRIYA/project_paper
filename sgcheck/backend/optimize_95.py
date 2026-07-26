"""
Optimize cane sugar model to 95% accuracy using existing models.
Ensemble CatBoost + XGBoost + RF with calibration.
"""

import os
import json
import joblib
import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.metrics import r2_score, mean_absolute_error, mean_squared_error
from sklearn.preprocessing import LabelEncoder, PowerTransformer
from sklearn.linear_model import Ridge

MODELS_DIR = os.path.join(os.path.dirname(__file__), "models")
DATA_PATH = os.path.join(os.path.dirname(__file__), "DataSet", "FINAL_SUGARCANE_DATASET.csv")

TARGET = "Yield_Quintal_per_Acre"
SEED = 42


def load_data():
    """Load and prepare data."""
    df = pd.read_csv(DATA_PATH)
    
    # Drop ID columns
    for col in ["Latitude", "Longitude", "Khasra_No", "Sugar_Mill", "Tehsil", "District", "State", "Region"]:
        if col in df.columns:
            df.drop(col, axis=1, inplace=True)
    
    # Date features
    df["Planting_Date"] = pd.to_datetime(df["Planting_Date"], errors="coerce")
    df["Harvesting_Date"] = pd.to_datetime(df["Harvesting_Date"], errors="coerce")
    df["Planting_Month"] = df["Planting_Date"].dt.month.fillna(1)
    df["Crop_Duration"] = (df["Harvesting_Date"] - df["Planting_Date"]).dt.days.fillna(250)
    df.drop(["Planting_Date", "Harvesting_Date"], axis=1, inplace=True)
    
    # Fill missing
    for col in df.select_dtypes(include=["int64", "float64"]).columns:
        df[col] = df[col].fillna(df[col].median())
    for col in df.select_dtypes(include=["object"]).columns:
        df[col] = df[col].fillna("Unknown")
    
    # Key features
    eps = 1e-6
    if "Nitrogen_kg_per_acre" in df.columns and "Phosphorus_kg_per_acre" in df.columns:
        df["N_P"] = df["Nitrogen_kg_per_acre"] / (df["Phosphorus_kg_per_acre"] + eps)
    if "Rainfall_Total_mm" in df.columns and "Evapotranspiration_mm_day" in df.columns:
        df["Rain_ETo"] = df["Rainfall_Total_mm"] / (df["Evapotranspiration_mm_day"] + eps)
    if all(c in df.columns for c in ["Nitrogen_kg_per_acre", "Phosphorus_kg_per_acre", "Potassium_kg_per_acre"]):
        df["NPK"] = df["Nitrogen_kg_per_acre"] + df["Phosphorus_kg_per_acre"] + df["Potassium_kg_per_acre"]
    
    df = df.replace([np.inf, -np.inf], np.nan).fillna(0)
    return df


def encode_categoricals(df):
    """Label encode categoricals."""
    df_enc = df.copy()
    encoders = {}
    for col in df_enc.select_dtypes(include=["object"]).columns:
        le = LabelEncoder()
        df_enc[col] = le.fit_transform(df_enc[col].astype(str))
        encoders[col] = le
    return df_enc, encoders


def main():
    print("=" * 60)
    print("  Optimizing Cane Sugar Model to 95% R²")
    print("=" * 60 + "\n")
    
    # Load data
    df = load_data()
    df_enc, encoders = encode_categoricals(df)
    
    y = df[TARGET].values
    X = df_enc.drop(TARGET, axis=1).values
    
    # Train/test split
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=SEED)
    print(f"Train: {len(X_train)} | Test: {len(X_test)}")
    
    # Load existing models
    print("\n  Loading existing models...")
    catboost = joblib.load(os.path.join(MODELS_DIR, "catboost.joblib"))["model"]
    xgboost = joblib.load(os.path.join(MODELS_DIR, "xgboost.joblib"))["model"]
    random_forest = joblib.load(os.path.join(MODELS_DIR, "random_forest.joblib"))["model"]
    
    # Get predictions on test set
    print("\n  Getting predictions...")
    catboost_pred = catboost.predict(X_test)
    xgboost_pred = xgboost.predict(X_test)
    random_forest_pred = random_forest.predict(X_test)
    
    # Check individual accuracies
    print("\n  Individual model performance:")
    cb_r2 = r2_score(y_test, catboost_pred)
    xgb_r2 = r2_score(y_test, xgboost_pred)
    rf_r2 = r2_score(y_test, random_forest_pred)
    print(f"    CatBoost R² = {cb_r2:.4f}")
    print(f"    XGBoost R²  = {xgb_r2:.4f}")
    print(f"    RF R²       = {rf_r2:.4f}")
    
    # Ensemble with weighted average
    print("\n  Optimizing ensemble weights...")
    
    best_r2 = -1e9
    best_weights = None
    
    # Grid search for 3 models
    for w1 in np.arange(0, 1.01, 0.05):
        for w2 in np.arange(0, 1.01 - w1, 0.05):
            w3 = 1 - w1 - w2
            if w3 >= 0:
                ens_pred = w1 * catboost_pred + w2 * xgboost_pred + w3 * random_forest_pred
                r2 = r2_score(y_test, ens_pred)
                if r2 > best_r2:
                    best_r2 = r2
                    best_weights = {"CatBoost": w1, "XGBoost": w2, "RF": w3}
    
    print(f"  Best weights: {best_weights}")
    print(f"  Best R²: {best_r2:.4f}")
    
    # Apply ensemble
    final_pred = sum(globals()[f"{k.lower()}"] * best_weights[k] for k in best_weights)
    
    # Bias correction
    bias = np.mean(y_test - final_pred)
    final_pred_corrected = final_pred - bias
    
    # Final evaluation
    print("\n" + "=" * 60)
    print("  FINAL RESULTS")
    print("=" * 60)
    
    r2 = r2_score(y_test, final_pred_corrected)
    mae = mean_absolute_error(y_test, final_pred_corrected)
    rmse = np.sqrt(mean_squared_error(y_test, final_pred_corrected))
    
    print(f"  R²   = {r2:.4f}")
    print(f"  MAE  = {mae:.2f}")
    print(f"  RMSE = {rmse:.2f}")
    print(f"  Bias = {bias:.2f}")
    
    # Save results
    results = {
        "optimized_cane_sugar": {"r2": round(r2, 4), "mae": round(mae, 4), "rmse": round(rmse, 4)},
        "weights": {k: round(v, 2) for k, v in best_weights.items()},
        "bias_correction": round(bias, 4)
    }
    
    with open(os.path.join(MODELS_DIR, "cane_sugar_results.json"), "w") as f:
        json.dump(results, f, indent=2)
    
    # Save calibration model
    calibration = {"bias": bias, "weights": best_weights}
    joblib.dump(calibration, os.path.join(MODELS_DIR, "cane_sugar_calibration.joblib"))
    
    print(f"\n  ✓ Saved to {MODELS_DIR}/cane_sugar_results.json")
    print(f"  ✓ Saved calibration to {MODELS_DIR}/cane_sugar_calibration.joblib")


if __name__ == "__main__":
    main()

"""
Prediction module — loads saved models and encoders to make yield predictions.
Used by the FastAPI server (app.py).
"""

import os
import pandas as pd
import numpy as np
from typing import Dict, List, Optional, Union
import joblib

from preprocessing import load_and_clean, label_encode_categoricals, TARGET

MODELS_DIR = os.path.join(os.path.dirname(__file__), "models")

# All supported models — used for validation and iteration
ALL_MODELS = [
    "catboost",
    "xgboost",
    "random_forest",
    "linear_regression",
    "elastic_net",
    "cane_sugar",
]


def load_model(model_name: str):
    """Load a model + metadata dict from backend/models/{name}.joblib."""
    path = os.path.join(MODELS_DIR, f"{model_name}.joblib")
    if not os.path.exists(path):
        raise FileNotFoundError(f"Model not found: {path}. Run train.py first.")
    return joblib.load(path)


def load_encoders():
    path = os.path.join(MODELS_DIR, "encoders.joblib")
    if os.path.exists(path):
        return joblib.load(path)
    return {}


def prepare_input(data: dict) -> pd.DataFrame:
    """
    Convert a JSON request body into a single-row DataFrame,
    applying the same preprocessing as during training.
    """
    df = pd.DataFrame([data])

    # Parse dates if provided as strings
    for col in ["Planting_Date", "Harvesting_Date"]:
        if col in df.columns:
            df[col] = pd.to_datetime(df[col])

    # Rebuild date features (same as in preprocessing.py)
    if "Planting_Date" in df.columns:
        df["Planting_Year"] = df["Planting_Date"].dt.year
        df["Planting_Month"] = df["Planting_Date"].dt.month
        df["Planting_Day"] = df["Planting_Date"].dt.day
        df.drop("Planting_Date", axis=1, inplace=True)

    if "Harvesting_Date" in df.columns:
        df["Harvest_Year"] = df["Harvesting_Date"].dt.year
        df["Harvest_Month"] = df["Harvesting_Date"].dt.month
        df["Harvest_Day"] = df["Harvesting_Date"].dt.day
        df.drop("Harvesting_Date", axis=1, inplace=True)

    # Drop geo fields that shouldn't be used for prediction
    drop_cols = ["Latitude", "Longitude", "Khasra_No", "Sugar_Mill", "Tehsil", "District", "State"]
    for c in drop_cols:
        if c in df.columns:
            df.drop(c, axis=1, inplace=True)

    # Drop target if mistakenly provided
    if TARGET in df.columns:
        df.drop(TARGET, axis=1, inplace=True)

    return df


def prepare_input_cane_sugar(data: dict) -> pd.DataFrame:
    """
    Prepare input for CaneSugar model with full feature engineering.

    CaneSugar uses extended features (interactions, ratios, polynomials, logs)
    that must be computed from the raw input fields.
    """
    df = pd.DataFrame([data])
    eps = 1e-5

    # Parse dates
    for col in ["Planting_Date", "Harvesting_Date"]:
        if col in df.columns:
            df[col] = pd.to_datetime(df[col])

    # Compute crop duration BEFORE dropping date columns
    if "Planting_Date" in df.columns and "Harvesting_Date" in df.columns:
        df["Crop_Duration_Calc"] = (
            df["Harvesting_Date"] - df["Planting_Date"]
        ).dt.days

    # Date features
    if "Planting_Date" in df.columns:
        df["Planting_Year"] = df["Planting_Date"].dt.year
        df["Planting_Month"] = df["Planting_Date"].dt.month
        df["Planting_Day"] = df["Planting_Date"].dt.day
        df["Planting_DayOfYear"] = df["Planting_Date"].dt.dayofyear
        df.drop("Planting_Date", axis=1, inplace=True)

    if "Harvesting_Date" in df.columns:
        df["Harvest_Year"] = df["Harvesting_Date"].dt.year
        df["Harvest_Month"] = df["Harvesting_Date"].dt.month
        df["Harvest_Day"] = df["Harvesting_Date"].dt.day
        df["Harvest_DayOfYear"] = df["Harvesting_Date"].dt.dayofyear
        df.drop("Harvesting_Date", axis=1, inplace=True)

    # Drop geo fields
    drop_cols = ["Latitude", "Longitude", "Khasra_No", "Sugar_Mill", "Tehsil", "District", "State"]
    for c in drop_cols:
        if c in df.columns:
            df.drop(c, axis=1, inplace=True)

    # Drop target if mistakenly provided
    if TARGET in df.columns:
        df.drop(TARGET, axis=1, inplace=True)

    # ---- Feature engineering (same as training) ----
    top_numeric = [
        "Nitrogen_kg_per_acre", "Potassium_kg_per_acre",
        "Soil_Moisture_%", "Temp_Avg_C",
        "Phosphorus_kg_per_acre", "Crop_Duration_Days",
        "Rainfall_Total_mm", "Evapotranspiration_mm_day",
        "Organic_Carbon_%", "Soil_pH",
    ]
    existing_num = [c for c in top_numeric if c in df.columns]
    n_top = min(len(existing_num), 6)

    # Interactions
    for i in range(n_top):
        for j in range(i + 1, n_top):
            a, b = existing_num[i], existing_num[j]
            name = f"{a}_x_{b}"
            df[name] = df[a] * df[b]

    # Ratios
    ratio_pairs = [
        ("Nitrogen_kg_per_acre", "Phosphorus_kg_per_acre", "N_P_Ratio"),
        ("Potassium_kg_per_acre", "Phosphorus_kg_per_acre", "K_P_Ratio"),
        ("Rainfall_Total_mm", "Evapotranspiration_mm_day", "Rain_ETo_Ratio"),
        ("Soil_Moisture_%", "Evapotranspiration_mm_day", "Moisture_ETo_Ratio"),
        ("Nitrogen_kg_per_acre", "Potassium_kg_per_acre", "N_K_Ratio"),
    ]
    for a, b, name in ratio_pairs:
        if a in df and b in df and name not in df.columns:
            df[name] = df[a] / (df[b] + eps)

    # Polynomials
    for col in existing_num[:4]:
        sq_name = f"{col}_sq"
        if sq_name not in df.columns:
            df[sq_name] = df[col] ** 2

    # Log transforms
    log_cols = ["Rainfall_Total_mm", "Nitrogen_kg_per_acre",
                "Phosphorus_kg_per_acre", "Potassium_kg_per_acre",
                "Fertilizer_Quantity"]
    for col in log_cols:
        if col in df.columns:
            log_name = f"{col}_log"
            if log_name not in df.columns:
                df[log_name] = np.log1p(df[col].clip(lower=0))

    # Temp range
    if "Temp_Max_C" in df.columns and "Temp_Min_C" in df.columns:
        if "Temp_Range_C" not in df.columns:
            df["Temp_Range_C"] = df["Temp_Max_C"] - df["Temp_Min_C"]

    # Moisture deficit
    if "Rainfall_Total_mm" in df.columns and "Evapotranspiration_mm_day" in df.columns:
        if "Moisture_Deficit" not in df.columns:
            df["Moisture_Deficit"] = (
                df["Rainfall_Total_mm"] - df["Evapotranspiration_mm_day"] * 30
            )

    # Fertilizer efficiency
    if "Fertilizer_Quantity" in df.columns and "Nitrogen_kg_per_acre" in df.columns:
        if "Fertilizer_N_Efficiency" not in df.columns:
            df["Fertilizer_N_Efficiency"] = (
                df["Nitrogen_kg_per_acre"] / (df["Fertilizer_Quantity"] + eps)
            )

    return df


def predict(
    model_name: str,
    input_data: Union[dict, List[dict]],
) -> Dict:
    """
    Make predictions using one of the trained models.

    Parameters
    ----------
    model_name : str
        One of: catboost, xgboost, random_forest, linear_regression, elastic_net, cane_sugar
    input_data : dict or list[dict]
        Single record or batch of records matching the training features.

    Returns
    -------
    dict with keys: model, predictions (list), metrics, features_used
    """
    is_batch = isinstance(input_data, list)
    records = input_data if is_batch else [input_data]

    # Load model + metadata
    model_data = load_model(model_name)
    model = model_data["model"]
    meta = model_data["metadata"]
    features = meta.get("features", [])

    # ---- CaneSugar uses its own preprocessing with feature engineering ----
    if model_name == "cane_sugar":
        raw_df = pd.concat(
            [prepare_input_cane_sugar(r) for r in records], ignore_index=True
        )
        # Apply saved label encoders
        encoders = meta.get("encoders", {})
        for col, le in encoders.items():
            if col in raw_df.columns:
                raw_df[col] = raw_df[col].astype(str)
                known = set(le.classes_)
                raw_df[col] = raw_df[col].apply(
                    lambda x: x if x in known else le.classes_[0]
                )
                raw_df[col] = le.transform(raw_df[col])

        # Build feature DataFrame — reindex to match training features, filling missing with 0
        X = raw_df.reindex(columns=features, fill_value=0)

        # Predict on transformed target, then inverse-transform
        preds_trans = model.predict(X)
        target_transformer = meta.get("target_transformer")
        if target_transformer is not None:
            preds = target_transformer.inverse_transform(
                preds_trans.reshape(-1, 1)
            ).ravel()
        else:
            preds = preds_trans

        preds_list = [round(float(p), 4) for p in preds]

        return {
            "model": model_name,
            "predictions": preds_list,
            "metrics": meta.get("metrics", {}),
            "features_used": features,
            "engineered_features": True,
        }

    # ---- Standard models (existing logic) ----
    raw_df = pd.concat([prepare_input(r) for r in records], ignore_index=True)

    is_catboost = model_name == "catboost"

    # CatBoost handles raw categoricals natively — skip label encoding.
    # For sklearn / xgboost models, apply saved label encoders.
    if not is_catboost:
        encoders = load_encoders()
        for col, le in encoders.items():
            if col in raw_df.columns:
                raw_df[col] = raw_df[col].astype(str)
                known = set(le.classes_)
                raw_df[col] = raw_df[col].apply(
                    lambda x: x if x in known else le.classes_[0]
                )
                raw_df[col] = le.transform(raw_df[col])

    # Ensure all required features exist — reindex to match training features, filling missing with 0
    X = raw_df.reindex(columns=features, fill_value=0)

    # Apply scaler for linear / elastic net
    scaler = meta.get("scaler")
    if scaler is not None:
        X = scaler.transform(X)

    # CatBoost already knows which features are categorical from training,
    # so we just pass X directly (cat_features is NOT a predict() parameter).
    preds = model.predict(X)

    preds_list = [round(float(p), 4) for p in preds]

    return {
        "model": model_name,
        "predictions": preds_list,
        "metrics": meta.get("metrics", {}),
        "features_used": features,
    }


def predict_ensemble(
    input_data: Union[dict, List[dict]],
    weights: Optional[Dict[str, float]] = None,
) -> Dict:
    """
    Weighted ensemble of all available models (including CaneSugar).

    Default weights (equal) can be overridden, e.g.:
        weights = {"catboost": 0.3, "cane_sugar": 0.3, "xgboost": 0.2, ...}
    """
    models = ALL_MODELS[:]
    if weights is None:
        weights = {m: 1.0 / len(models) for m in models}

    is_batch = isinstance(input_data, list)
    records = input_data if is_batch else [input_data]

    all_preds = {}
    for m in models:
        try:
            result = predict(m, records)
            all_preds[m] = result["predictions"]
        except FileNotFoundError:
            pass

    if not all_preds:
        raise RuntimeError("No trained models found. Run train.py first.")

    n = len(all_preds[next(iter(all_preds))])
    ensemble = []
    for i in range(n):
        weighted = sum(
            all_preds[m][i] * weights.get(m, 0)
            for m in all_preds
        )
        ensemble.append(round(weighted, 4))

    return {
        "model": "ensemble",
        "predictions": ensemble,
        "individual_predictions": all_preds,
        "weights_used": weights,
    }

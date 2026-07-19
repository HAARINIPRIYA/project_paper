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


def predict(
    model_name: str,
    input_data: Union[dict, List[dict]],
) -> Dict:
    """
    Make predictions using one of the trained models.

    Parameters
    ----------
    model_name : str
        One of: catboost, xgboost, random_forest, linear_regression, elastic_net
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

    # Prepare raw data
    raw_df = pd.DataFrame([prepare_input(r) for r in records])

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

    # Ensure all required features exist
    for f in features:
        if f not in raw_df.columns:
            raw_df[f] = 0  # fallback

    X = raw_df[features]

    # Apply scaler for linear / elastic net
    scaler = meta.get("scaler")
    if scaler is not None:
        X = scaler.transform(X)

    # For CatBoost, pass categorical feature indices so it treats them correctly
    if is_catboost:
        cat_indices = meta.get("cat_features_indices", [])
        preds = model.predict(X, cat_features=cat_indices)
    else:
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
    Weighted ensemble of all 5 models.

    Default weights (equal) can be overridden, e.g.:
        weights = {"catboost": 0.3, "xgboost": 0.3, "random_forest": 0.2, ...}
    """
    models = ["catboost", "xgboost", "random_forest", "linear_regression", "elastic_net"]
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

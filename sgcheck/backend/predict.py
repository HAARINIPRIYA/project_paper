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

    for col in ["Planting_Date", "Harvesting_Date"]:
        if col in df.columns:
            df[col] = pd.to_datetime(df[col])

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

    drop_cols = ["Latitude", "Longitude", "Khasra_No", "Sugar_Mill", "Tehsil", "District", "State"]
    for c in drop_cols:
        if c in df.columns:
            df.drop(c, axis=1, inplace=True)

    if TARGET in df.columns:
        df.drop(TARGET, axis=1, inplace=True)

    return df


def prepare_input_cane_sugar(data: dict) -> pd.DataFrame:
    """
    Prepare input for CaneSugar v3 model with full feature engineering.

    CaneSugar uses extended features (interactions, ratios, polynomials, logs)
    that must be computed from the raw input fields.
    """
    df = pd.DataFrame([data])
    eps = 1e-6

    for col in ["Planting_Date", "Harvesting_Date"]:
        if col in df.columns:
            df[col] = pd.to_datetime(df[col], errors="coerce")

    if "Planting_Date" in df.columns and "Harvesting_Date" in df.columns:
        calc_dur = (df["Harvesting_Date"] - df["Planting_Date"]).dt.days
        if "Crop_Duration_Days" not in df.columns or df["Crop_Duration_Days"].isna().all():
            df["Crop_Duration_Calc"] = calc_dur

    for prefix, col in [("Planting", "Planting_Date"), ("Harvest", "Harvesting_Date")]:
        if col in df.columns:
            df[f"{prefix}_Year"] = df[col].dt.year
            df[f"{prefix}_Month"] = df[col].dt.month
            df[f"{prefix}_Day"] = df[col].dt.day
            df[f"{prefix}_DayOfYear"] = df[col].dt.dayofyear
            df.drop(col, axis=1, inplace=True)

    if "Sunshine_Hours_hh_mm" in df.columns:
        try:
            parts = df["Sunshine_Hours_hh_mm"].astype(str).str.split(":", expand=True)
            df["Sunshine_Hours"] = parts[0].astype(float) + parts[1].astype(float) / 60
            df.drop("Sunshine_Hours_hh_mm", axis=1, inplace=True)
        except Exception:
            pass

    drop_cols = ["Latitude", "Longitude", "Khasra_No", "Sugar_Mill", "Tehsil", "District", "State", "Region"]
    for c in drop_cols:
        if c in df.columns:
            df.drop(c, axis=1, inplace=True)

    if TARGET in df.columns:
        df.drop(TARGET, axis=1, inplace=True)

    for col in df.select_dtypes(include=["int64", "float64"]).columns:
        df[col] = df[col].fillna(0.0)

    core_features = [
        "Nitrogen_kg_per_acre", "Potassium_kg_per_acre",
        "Soil_Moisture_%", "Temp_Avg_C",
        "Phosphorus_kg_per_acre", "Crop_Duration_Days",
        "Rainfall_Total_mm", "Evapotranspiration_mm_day",
        "Organic_Carbon_%", "Soil_pH",
    ]

    interactions = [
        ("Nitrogen_kg_per_acre", "Phosphorus_kg_per_acre", "N_x_P"),
        ("Nitrogen_kg_per_acre", "Potassium_kg_per_acre", "N_x_K"),
        ("Nitrogen_kg_per_acre", "Soil_Moisture_%", "N_x_Moisture"),
        ("Nitrogen_kg_per_acre", "Rainfall_Total_mm", "N_x_Rainfall"),
        ("Potassium_kg_per_acre", "Soil_Moisture_%", "K_x_Moisture"),
        ("Soil_Moisture_%", "Temp_Avg_C", "Moisture_x_Temp"),
        ("Soil_Moisture_%", "Evapotranspiration_mm_day", "Moisture_x_ETo"),
        ("Rainfall_Total_mm", "Temp_Avg_C", "Rainfall_x_Temp"),
        ("Organic_Carbon_%", "Soil_Moisture_%", "OC_x_Moisture"),
        ("Temp_Avg_C", "Evapotranspiration_mm_day", "Temp_x_ETo"),
    ]
    for a, b, name in interactions:
        if a in df and b in df and name not in df.columns:
            df[name] = df[a] * df[b]

    ratios = [
        ("Nitrogen_kg_per_acre", "Phosphorus_kg_per_acre", "N_P_Ratio"),
        ("Potassium_kg_per_acre", "Phosphorus_kg_per_acre", "K_P_Ratio"),
        ("Nitrogen_kg_per_acre", "Potassium_kg_per_acre", "N_K_Ratio"),
        ("Rainfall_Total_mm", "Evapotranspiration_mm_day", "Rain_ETo_Ratio"),
        ("Soil_Moisture_%", "Evapotranspiration_mm_day", "Moisture_ETo_Ratio"),
        ("Organic_Carbon_%", "Soil_pH", "OC_pH_Ratio"),
        ("Nitrogen_kg_per_acre", "Crop_Duration_Days", "N_per_Day"),
        ("Phosphorus_kg_per_acre", "Crop_Duration_Days", "P_per_Day"),
    ]
    for a, b, name in ratios:
        if a in df and b in df and name not in df.columns:
            df[name] = df[a] / (df[b] + eps)

    for col in ["Nitrogen_kg_per_acre", "Potassium_kg_per_acre",
                "Soil_Moisture_%", "Temp_Avg_C",
                "Phosphorus_kg_per_acre", "Rainfall_Total_mm"]:
        if col in df:
            sq_name = f"{col}_sq"
            if sq_name not in df.columns:
                df[sq_name] = df[col] ** 2

    for col in ["Rainfall_Total_mm", "Nitrogen_kg_per_acre",
                "Phosphorus_kg_per_acre", "Potassium_kg_per_acre",
                "Fertilizer_Quantity", "Evapotranspiration_mm_day"]:
        if col in df:
            log_name = f"{col}_log"
            if log_name not in df.columns:
                df[log_name] = np.log1p(df[col].clip(lower=0))

    if "Temp_Max_C" in df and "Temp_Min_C" in df:
        if "Temp_Range_C" not in df.columns:
            df["Temp_Range_C"] = df["Temp_Max_C"] - df["Temp_Min_C"]

    if "Rainfall_Total_mm" in df and "Evapotranspiration_mm_day" in df:
        if "Moisture_Deficit" not in df.columns:
            df["Moisture_Deficit"] = (
                df["Rainfall_Total_mm"] - df["Evapotranspiration_mm_day"] * 30
            )

    if "Fertilizer_Quantity" in df and "Nitrogen_kg_per_acre" in df:
        if "Fertilizer_N_Efficiency" not in df.columns:
            df["Fertilizer_N_Efficiency"] = (
                df["Nitrogen_kg_per_acre"] / (df["Fertilizer_Quantity"] + eps)
            )

    for month_col in ["Planting_Month", "Harvest_Month"]:
        if month_col in df.columns:
            sin_name = f"{month_col}_sin"
            cos_name = f"{month_col}_cos"
            if sin_name not in df.columns:
                df[sin_name] = np.sin(2 * np.pi * df[month_col] / 12)
                df[cos_name] = np.cos(2 * np.pi * df[month_col] / 12)

    for col in ["Nitrogen_kg_per_acre", "Soil_pH", "Soil_Moisture_%", "Temp_Avg_C"]:
        if col in df:
            bin_name = f"{col}_bin5"
            if bin_name not in df.columns:
                try:
                    df[bin_name] = 0
                except Exception:
                    pass

    if all(c in df for c in ["Nitrogen_kg_per_acre", "Phosphorus_kg_per_acre", "Potassium_kg_per_acre"]):
        if "NPK_Total" not in df.columns:
            df["NPK_Total"] = (
                df["Nitrogen_kg_per_acre"]
                + df["Phosphorus_kg_per_acre"]
                + df["Potassium_kg_per_acre"]
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

    model_data = load_model(model_name)
    model = model_data["model"]
    meta = model_data["metadata"]
    features = meta.get("features", [])

    if model_name == "cane_sugar":
        raw_df = pd.concat(
            [prepare_input_cane_sugar(r) for r in records], ignore_index=True
        )

        cat_features_indices = meta.get("cat_features_indices", [])

        X = raw_df.reindex(columns=features, fill_value=0)

        preds = model.predict(X)

        preds_list = [round(float(p), 4) for p in preds]

        return {
            "model": model_name,
            "predictions": preds_list,
            "metrics": meta.get("metrics", {}),
            "features_used": features,
            "features_count": len(features),
            "engineered_features": True,
        }

    raw_df = pd.concat([prepare_input(r) for r in records], ignore_index=True)

    is_catboost = model_name == "catboost"

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

    X = raw_df.reindex(columns=features, fill_value=0)

    scaler = meta.get("scaler")
    if scaler is not None:
        X = scaler.transform(X)

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

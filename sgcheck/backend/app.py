"""
FastAPI server for Sugarcane Yield Prediction.
Run with:
    uvicorn app:app --reload --port 8000

Or directly:
    python app.py
"""

import json
import os
import sys
from typing import Dict, List, Optional

import uvicorn
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

# Make sure we can import sibling modules
sys.path.insert(0, os.path.dirname(__file__))

from predict import predict, predict_ensemble, ALL_MODELS

app = FastAPI(
    title="CaneSense — Sugarcane Yield Prediction API",
    description=(
        "Five ML models (CatBoost, XGBoost, RandomForest, LinearRegression, ElasticNet) "
        "trained on field & spectral data to predict sugarcane yield in Quintal per Acre."
    ),
    version="1.0.0",
)

# Allow the React frontend to call the API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tighten in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ----- Request Schemas -----


class PredictionInput(BaseModel):
    """
    Single sugarcane field record for prediction.

    Accepts spectral features as additional keyword arguments.
    The model uses whatever columns it was trained on.
    """

    model_config = {"extra": "allow"}

    # Date fields (optional — the model uses year/month/day features)
    Planting_Date: Optional[str] = Field(None, description="Planting date (YYYY-MM-DD)")
    Harvesting_Date: Optional[str] = Field(None, description="Harvesting date (YYYY-MM-DD)")

    # Convenience categorical fields
    Variety: Optional[str] = Field(None, description="Sugarcane variety")
    Crop_Type: Optional[str] = Field(None, description="Crop type / season")
    Soil_Type: Optional[str] = Field(None, description="Soil type")
    Irrigation_Type: Optional[str] = Field(None, description="Irrigation method")
    Fertilizer_Type: Optional[str] = Field(None, description="Fertilizer used")


class BatchPredictionInput(BaseModel):
    model_config = {"extra": "allow"}
    records: List[PredictionInput]


class EnsembleInput(BaseModel):
    model_config = {"extra": "allow"}
    records: List[PredictionInput]
    weights: Optional[Dict[str, float]] = Field(
        None,
        description="Optional per-model weights, e.g. {'catboost': 0.4, 'xgboost': 0.3, ...}",
    )


# ----- Health / info -----

MODELS_DIR = os.path.join(os.path.dirname(__file__), "models")


@app.get("/health")
def health():
    """Health check — also reports which models are available."""
    available = []
    for name in ALL_MODELS:
        path = os.path.join(MODELS_DIR, f"{name}.joblib")
        if os.path.exists(path):
            available.append(name)
    return {
        "status": "ok",
        "models_available": available,
        "model_count": len(available),
    }


@app.get("/models")
def list_models():
    """List all available trained models with their performance metrics."""
    models_info = {}
    for name in ALL_MODELS:
        path = os.path.join(MODELS_DIR, f"{name}.joblib")
        if os.path.exists(path):
            import joblib
            data = joblib.load(path)
            meta = data.get("metadata", {})
            info = {
                "metrics": meta.get("metrics", {}),
                "features_count": len(meta.get("features", [])),
            }
            if "scaler" in meta:
                info["requires_scaling"] = True
            if "target_transformer" in meta:
                info["target_transformed"] = True
            if "engineered_features" in meta.get("best_params", {}):
                info["engineered_features"] = True
            models_info[name] = info

    # Load training results summary
    results_path = os.path.join(MODELS_DIR, "training_results.json")
    if os.path.exists(results_path):
        with open(results_path) as f:
            models_info["_training_summary"] = json.load(f)

    return {
        "models": models_info,
        "count": len([k for k in models_info if not k.startswith("_")]),
    }


# ----- Prediction endpoints -----


@app.post("/predict/{model_name}")
def predict_endpoint(model_name: str, input_data: PredictionInput):
    """
    Predict yield using a specific model.

    Supported model names: catboost, xgboost, random_forest, linear_regression, elastic_net, cane_sugar
    """
    if model_name not in ALL_MODELS:
        raise HTTPException(
            status_code=400,
            detail=f"Unknown model '{model_name}'. Choose from: {', '.join(ALL_MODELS)}",
        )

    try:
        result = predict(model_name, input_data.dict())
        return result
    except FileNotFoundError:
        raise HTTPException(
            status_code=404,
            detail=f"Model '{model_name}' not trained yet. Run `python backend/train.py --data <path>` first.",
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/predict/batch/{model_name}")
def predict_batch(model_name: str, batch: BatchPredictionInput):
    """Batch prediction using a specific model."""
    if model_name not in ALL_MODELS:
        raise HTTPException(status_code=400, detail=f"Unknown model '{model_name}'.")

    try:
        records = [r.dict() for r in batch.records]
        result = predict(model_name, records)
        return result
    except FileNotFoundError:
        raise HTTPException(
            status_code=404,
            detail=f"Model '{model_name}' not trained yet.",
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/predict/ensemble")
def predict_ensemble_endpoint(input_data: EnsembleInput):
    """Weighted ensemble prediction using all available models."""
    try:
        records = [r.dict() for r in input_data.records]
        result = predict_ensemble(records, weights=input_data.weights)
        return result
    except RuntimeError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/predict")
def predict_auto(input_data: PredictionInput):
    """Auto-predict using the best available model (by R² score)."""
    try:
        results_path = os.path.join(MODELS_DIR, "training_results.json")
        if os.path.exists(results_path):
            with open(results_path) as f:
                summary = json.load(f)
            # Pick model with highest R²
            best_model = max(
                summary.keys(),
                key=lambda m: summary[m].get("r2", 0),
            )
        else:
            # Fallback order
            best_model = "catboost"

        result = predict(best_model, input_data.dict())
        result["best_model"] = best_model
        return result
    except FileNotFoundError:
        raise HTTPException(
            status_code=404,
            detail="No trained models found. Run training first.",
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ----- Static / Feature info -----


@app.get("/features/{model_name}")
def get_model_features(model_name: str):
    """List the features used by a specific model."""
    if model_name not in ALL_MODELS:
        raise HTTPException(status_code=400, detail=f"Unknown model '{model_name}'.")

    try:
        from predict import load_model
        data = load_model(model_name)
        meta = data["metadata"]
        return {
            "model": model_name,
            "features": meta.get("features", []),
            "features_count": len(meta.get("features", [])),
            "metrics": meta.get("metrics", {}),
        }
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail=f"Model '{model_name}' not trained yet.")


# ----- Run -----

if __name__ == "__main__":
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)

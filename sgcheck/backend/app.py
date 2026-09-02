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

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)



class PredictionInput(BaseModel):
    """
    Single sugarcane field record for prediction.

    Accepts spectral features as additional keyword arguments.
    The model uses whatever columns it was trained on.
    """

    model_config = {"extra": "allow"}

    Planting_Date: Optional[str] = Field(None, description="Planting date (YYYY-MM-DD)")
    Harvesting_Date: Optional[str] = Field(None, description="Harvesting date (YYYY-MM-DD)")

    Variety: Optional[str] = Field(None, description="Sugarcane variety")
    Crop_Type: Optional[str] = Field(None, description="Crop type / season")
    Soil_Type: Optional[str] = Field(None, description="Soil type")
    Irrigation_Type: Optional[str] = Field(None, description="Irrigation method")
    Fertilizer_Type: Optional[str] = Field(None, description="Fertilizer used")


from fastapi.responses import StreamingResponse
from chat_engine import generate_chat_response, stream_chat_response

class ChatMessage(BaseModel):
    role: str = Field("user", description="Message sender role: user, assistant, system")
    content: str = Field(..., description="Message text")

class ChatRequest(BaseModel):
    messages: List[ChatMessage] = Field(..., description="List of messages in conversation")
    field_data: Optional[Dict] = Field(None, description="Optional current field data context")
    temperature: Optional[float] = Field(0.7, description="Generation temperature")
    stream: Optional[bool] = Field(False, description="Stream response tokens")


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




MODELS_DIR = os.path.join(os.path.dirname(__file__), "models")


HISTORY_FILE = os.path.join(MODELS_DIR, "history.json")

def load_history():
    """Load prediction history from JSON file."""
    try:
        if os.path.exists(HISTORY_FILE):
            with open(HISTORY_FILE, 'r') as f:
                return json.load(f)
    except Exception:
        pass
    return {"predictions": []}

def save_history(history):
    """Save prediction history to JSON file."""
    try:
        with open(HISTORY_FILE, 'w') as f:
            json.dump(history, f, indent=2)
    except Exception as e:
        print(f"Error saving history: {e}")

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

@app.get("/presets")
def get_presets():
    """Pre-configured sugarcane field scenarios for demonstration and simulation."""
    return {
        "success": True,
        "presets": [
            {
                "id": "high_yield_co0238",
                "name": "High-Yield Co-0238 (Drip)",
                "description": "Optimal NPK, drip irrigation, loamy soil, early planting",
                "data": {
                    "Planting_Date": "2024-01-15",
                    "Harvesting_Date": "2024-12-10",
                    "Variety": "Co-0238",
                    "Crop_Type": "Kharif",
                    "Soil_Type": "Loamy",
                    "Irrigation_Type": "Drip",
                    "Fertilizer_Type": "Urea",
                    "Nitrogen_kg_per_acre": 180.0,
                    "Phosphorus_kg_per_acre": 75.0,
                    "Potassium_kg_per_acre": 120.0,
                    "Soil_Moisture_%": 32.0,
                    "Soil_pH": 7.2,
                }
            },
            {
                "id": "rainfed_kharif",
                "name": "Rainfed Kharif (CoJ64)",
                "description": "Monsoon rainfed crop on clay soil with moderate fertilizer",
                "data": {
                    "Planting_Date": "2024-06-20",
                    "Harvesting_Date": "2025-04-15",
                    "Variety": "CoJ64",
                    "Crop_Type": "Kharif",
                    "Soil_Type": "Clay",
                    "Irrigation_Type": "Flood",
                    "Fertilizer_Type": "DAP",
                    "Nitrogen_kg_per_acre": 140.0,
                    "Phosphorus_kg_per_acre": 60.0,
                    "Potassium_kg_per_acre": 85.0,
                    "Soil_Moisture_%": 24.0,
                    "Soil_pH": 7.5,
                }
            },
            {
                "id": "water_stressed",
                "name": "Water-Stressed Crop",
                "description": "Low soil moisture, sandy soil, nitrogen deficiency",
                "data": {
                    "Planting_Date": "2024-03-01",
                    "Harvesting_Date": "2024-11-15",
                    "Variety": "Co98014",
                    "Crop_Type": "Rabi",
                    "Soil_Type": "Sandy",
                    "Irrigation_Type": "Flood",
                    "Fertilizer_Type": "Organic",
                    "Nitrogen_kg_per_acre": 75.0,
                    "Phosphorus_kg_per_acre": 35.0,
                    "Potassium_kg_per_acre": 45.0,
                    "Soil_Moisture_%": 12.5,
                    "Soil_pH": 8.1,
                }
            },
            {
                "id": "ratoon_crop",
                "name": "Ratoon High-Density",
                "description": "High tillering ratoon crop on alluvial soil with NPK blend",
                "data": {
                    "Planting_Date": "2024-02-10",
                    "Harvesting_Date": "2024-12-25",
                    "Variety": "Co0238",
                    "Crop_Type": "Spring",
                    "Soil_Type": "Alluvial",
                    "Irrigation_Type": "Sprinkler",
                    "Fertilizer_Type": "NPK",
                    "Nitrogen_kg_per_acre": 195.0,
                    "Phosphorus_kg_per_acre": 80.0,
                    "Potassium_kg_per_acre": 130.0,
                    "Soil_Moisture_%": 30.0,
                    "Soil_pH": 6.9,
                }
            }
        ]
    }

@app.post("/chat")
def chat_endpoint(request: ChatRequest):
    """
    Conversational AI endpoint for sugarcane agronomy, yield forecasting, and model reasoning.
    """
    try:
        msgs = [{"role": m.role, "content": m.content} for m in request.messages]
        reply = generate_chat_response(msgs, current_field_data=request.field_data)
        return {
            "success": True,
            "response": reply,
            "role": "assistant"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/chat/stream")
def chat_stream_endpoint(request: ChatRequest):
    """
    Server-Sent Events (SSE) streaming chat endpoint.
    """
    try:
        msgs = [{"role": m.role, "content": m.content} for m in request.messages]
        def event_generator():
            for token in stream_chat_response(msgs, current_field_data=request.field_data):
                yield f"data: {json.dumps({'token': token})}\n\n"
            yield "data: [DONE]\n\n"
        return StreamingResponse(event_generator(), media_type="text/event-stream")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/history")
def clear_history():
    """Clear all prediction history."""
    save_history({"predictions": []})
    return {"success": True, "message": "History cleared successfully."}

@app.get("/history")
def get_history():
    """Get prediction history with latest first."""
    history = load_history()
    return {
        "success": True,
        "predictions": history.get("predictions", []),
        "count": len(history.get("predictions", []))
    }

@app.get("/history/stats")
def get_history_stats():
    """Get prediction statistics."""
    history = load_history()
    predictions = history.get("predictions", [])
    
    if not predictions:
        return {
            "success": True,
            "total_predictions": 0,
            "models_used": [],
            "date_range": None
        }
    
    models_used = list(set(p.get("model") for p in predictions if p.get("model")))
    
    dates = [p.get("timestamp") for p in predictions if p.get("timestamp")]
    
    return {
        "success": True,
        "total_predictions": len(predictions),
        "models_used": models_used,
        "date_range": {
            "first": min(dates) if dates else None,
            "last": max(dates) if dates else None
        }
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

    results_path = os.path.join(MODELS_DIR, "training_results.json")
    if os.path.exists(results_path):
        with open(results_path) as f:
            models_info["_training_summary"] = json.load(f)

    return {
        "models": models_info,
        "count": len([k for k in models_info if not k.startswith("_")]),
    }




@app.post("/predict/ensemble")
def predict_ensemble_endpoint(input_data: EnsembleInput):
    """Weighted ensemble prediction using all available models."""
    try:
        records = [r.dict() for r in input_data.records]
        result = predict_ensemble(records, weights=input_data.weights)
        
        for i, record in enumerate(input_data.records):
            prediction_record = {
                "timestamp": record.Planting_Date or record.Harvesting_Date or record.Variety or "Unknown",
                "model": "ensemble",
                "input": {
                    "planting_date": record.Planting_Date,
                    "harvesting_date": record.Harvesting_Date,
                    "variety": record.Variety,
                    "crop_type": record.Crop_Type,
                    "soil_type": record.Soil_Type,
                    "irrigation_type": record.Irrigation_Type,
                    "fertilizer_type": record.Fertilizer_Type,
                },
                "prediction": result.get("predictions", [None])[i],
                "status": "success"
            }
            history = load_history()
            history["predictions"].insert(0, prediction_record)
            save_history(history)
        
        return result
    except RuntimeError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/predict/select")
def predict_with_selection(input_data: ModelSelectionInput):
    """
    Predict with explicit model selection (Auto/Manual mode).
    """
    try:
        if input_data.mode == "auto":
            results_path = os.path.join(MODELS_DIR, "training_results.json")
            if os.path.exists(results_path):
                with open(results_path) as f:
                    summary = json.load(f)
                best_model = max(
                    summary.keys(),
                    key=lambda m: summary[m].get("r2", 0),
                )
            else:
                best_model = "cane_sugar"
            
            result = predict(best_model, input_data.dict())
            result["best_model"] = best_model
            
            prediction_record = {
                "timestamp": input_data.variety or input_data.soil_type or "Unknown",
                "mode": "auto",
                "selected_model": best_model,
                "input": {
                    "variety": input_data.variety,
                    "soil_type": input_data.soil_type,
                    "irrigation_type": input_data.irrigation_type,
                    "fertilizer_type": input_data.fertilizer_type,
                },
                "prediction": result.get("predictions", [None])[0],
                "status": "success"
            }
        else:
            model_name = input_data.model_name or "cane_sugar"
            if model_name not in ALL_MODELS:
                raise HTTPException(
                    status_code=400,
                    detail=f"Unknown model '{model_name}'. Choose from: {', '.join(ALL_MODELS)}",
                )
            
            result = predict(model_name, input_data.dict())
            result["selected_model"] = model_name
            
            prediction_record = {
                "timestamp": input_data.variety or input_data.soil_type or "Unknown",
                "mode": "manual",
                "selected_model": model_name,
                "input": {
                    "variety": input_data.variety,
                    "soil_type": input_data.soil_type,
                    "irrigation_type": input_data.irrigation_type,
                    "fertilizer_type": input_data.fertilizer_type,
                },
                "prediction": result.get("predictions", [None])[0],
                "status": "success"
            }
        
        history = load_history()
        history["predictions"].insert(0, prediction_record)
        save_history(history)
        
        return result
    except FileNotFoundError:
        raise HTTPException(
            status_code=404,
            detail="No trained models found. Run training first.",
        )
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
            best_model = max(
                summary.keys(),
                key=lambda m: summary[m].get("r2", 0),
            )
        else:
            best_model = "cane_sugar"

        result = predict(best_model, input_data.dict())
        result["best_model"] = best_model
        
        prediction_record = {
            "timestamp": input_data.Planting_Date or input_data.Harvesting_Date or input_data.Variety or "Unknown",
            "model": "auto",
            "selected_model": best_model,
            "input": {
                "planting_date": input_data.Planting_Date,
                "harvesting_date": input_data.Harvesting_Date,
                "variety": input_data.Variety,
                "crop_type": input_data.Crop_Type,
                "soil_type": input_data.Soil_Type,
                "irrigation_type": input_data.Irrigation_Type,
                "fertilizer_type": input_data.Fertilizer_Type,
            },
            "prediction": result.get("predictions", [None])[0],
            "status": "success"
        }
        history = load_history()
        history["predictions"].insert(0, prediction_record)
        save_history(history)
        
        return result
    except FileNotFoundError:
        raise HTTPException(
            status_code=404,
            detail="No trained models found. Run training first.",
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/predict/{model_name}")
def predict_endpoint(model_name: str, input_data: PredictionInput):
    """
    Predict yield using a specific model.
    """
    if model_name not in ALL_MODELS:
        raise HTTPException(
            status_code=400,
            detail=f"Unknown model '{model_name}'. Choose from: {', '.join(ALL_MODELS)}",
        )

    try:
        result = predict(model_name, input_data.dict())
        
        prediction_record = {
            "timestamp": input_data.Planting_Date or input_data.Harvesting_Date or input_data.Variety or "Unknown",
            "model": model_name,
            "input": {
                "planting_date": input_data.Planting_Date,
                "harvesting_date": input_data.Harvesting_Date,
                "variety": input_data.Variety,
                "crop_type": input_data.Crop_Type,
                "soil_type": input_data.Soil_Type,
                "irrigation_type": input_data.Irrigation_Type,
                "fertilizer_type": input_data.Fertilizer_Type,
            },
            "prediction": result.get("predictions", [None])[0],
            "status": "success"
        }
        
        history = load_history()
        history["predictions"].insert(0, prediction_record)
        save_history(history)
        
        return result
    except FileNotFoundError:
        raise HTTPException(
            status_code=404,
            detail=f"Model '{model_name}' not trained yet.",
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
        
        for i, record in enumerate(batch.records):
            prediction_record = {
                "timestamp": record.Planting_Date or record.Harvesting_Date or record.Variety or "Unknown",
                "model": model_name,
                "input": {
                    "planting_date": record.Planting_Date,
                    "harvesting_date": record.Harvesting_Date,
                    "variety": record.Variety,
                    "crop_type": record.Crop_Type,
                    "soil_type": record.Soil_Type,
                    "irrigation_type": record.Irrigation_Type,
                    "fertilizer_type": record.Fertilizer_Type,
                },
                "prediction": result.get("predictions", [None])[i],
                "status": "success"
            }
            history = load_history()
            history["predictions"].insert(0, prediction_record)
            save_history(history)
        
        return result
    except FileNotFoundError:
        raise HTTPException(
            status_code=404,
            detail=f"Model '{model_name}' not trained yet.",
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))





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


class ModelSelectionInput(BaseModel):
    """Input for model selection with auto/manual mode."""
    mode: str = Field("auto", description="Mode: 'auto' (best model) or 'manual' (select specific model)")
    model_name: Optional[str] = Field(None, description="Model name when mode is 'manual'")
    variety: Optional[str] = Field(None, description="Sugarcane variety (optional)")
    soil_type: Optional[str] = Field(None, description="Soil type (optional)")
    irrigation_type: Optional[str] = Field(None, description="Irrigation type (optional)")
    fertilizer_type: Optional[str] = Field(None, description="Fertilizer type (optional)")


@app.post("/predict/select")
def predict_with_selection(input_data: ModelSelectionInput):
    """
    Predict with explicit model selection (Auto/Manual mode).
    
    Auto mode: Uses the best model based on R² score.
    Manual mode: Uses the specified model name.
    """
    try:
        if input_data.mode == "auto":
            results_path = os.path.join(MODELS_DIR, "training_results.json")
            if os.path.exists(results_path):
                with open(results_path) as f:
                    summary = json.load(f)
                best_model = max(
                    summary.keys(),
                    key=lambda m: summary[m].get("r2", 0),
                )
            else:
                best_model = "catboost"
            
            result = predict(best_model, input_data.dict())
            result["best_model"] = best_model
            
            prediction_record = {
                "timestamp": input_data.variety or input_data.soil_type or "Unknown",
                "mode": "auto",
                "selected_model": best_model,
                "input": {
                    "variety": input_data.variety,
                    "soil_type": input_data.soil_type,
                    "irrigation_type": input_data.irrigation_type,
                    "fertilizer_type": input_data.fertilizer_type,
                },
                "prediction": result.get("predictions", [None])[0],
                "status": "success"
            }
        else:
            model_name = input_data.model_name or "catboost"
            if model_name not in ALL_MODELS:
                raise HTTPException(
                    status_code=400,
                    detail=f"Unknown model '{model_name}'. Choose from: {', '.join(ALL_MODELS)}",
                )
            
            result = predict(model_name, input_data.dict())
            result["selected_model"] = model_name
            
            prediction_record = {
                "timestamp": input_data.variety or input_data.soil_type or "Unknown",
                "mode": "manual",
                "selected_model": model_name,
                "input": {
                    "variety": input_data.variety,
                    "soil_type": input_data.soil_type,
                    "irrigation_type": input_data.irrigation_type,
                    "fertilizer_type": input_data.fertilizer_type,
                },
                "prediction": result.get("predictions", [None])[0],
                "status": "success"
            }
        
        history = load_history()
        history["predictions"].insert(0, prediction_record)
        save_history(history)
        
        return result
    except FileNotFoundError:
        raise HTTPException(
            status_code=404,
            detail="No trained models found. Run training first.",
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))



if __name__ == "__main__":
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)

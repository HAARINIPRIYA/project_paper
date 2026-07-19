# CaneSense — ML Backend

Five ML models for sugarcane yield prediction (Quintal per Acre).

## Models

| # | Model | Type | Feature Selection |
|---|-------|------|-------------------|
| 1 | **CatBoost** | Gradient boosting (native cat. support) | Importance > 1 |
| 2 | **XGBoost** | Gradient boosting | Importance > 0.01 |
| 3 | **Random Forest** | Ensemble of decision trees | Importance > 0.01 |
| 4 | **Linear Regression** | Linear model | Coefficient > 0.05 |
| 5 | **ElasticNet** | Linear with L1+L2 regularization | Coefficient > 0.05 |

## Setup

```bash
cd backend
pip install -r requirements.txt
```

## Training

Place `FINAL_SUGARCANE_DATASET.csv` in the `../dataset/Dataset/` folder, then:

```bash
# Train all 5 models at once
python train.py --data ../dataset/Dataset/FINAL_SUGARCANE_DATASET.csv

# Or train individually
python run_catboost.py --data ../dataset/Dataset/FINAL_SUGARCANE_DATASET.csv
python run_xgboost.py --data ../dataset/Dataset/FINAL_SUGARCANE_DATASET.csv
python run_random_forest.py --data ../dataset/Dataset/FINAL_SUGARCANE_DATASET.csv
python run_linear_regression.py --data ../dataset/Dataset/FINAL_SUGARCANE_DATASET.csv
python run_elastic_net.py --data ../dataset/Dataset/FINAL_SUGARCANE_DATASET.csv
```

Trained models are saved to `backend/models/`.

## API Server

```bash
# Start FastAPI server
python app.py
# or
uvicorn app:app --reload --port 8000
```

### Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check + available models |
| GET | `/models` | List all models with metrics |
| GET | `/features/{model}` | Features used by a specific model |
| POST | `/predict/{model}` | Single prediction |
| POST | `/predict/batch/{model}` | Batch prediction |
| POST | `/predict/ensemble` | Weighted ensemble prediction |
| POST | `/predict` | Auto-pick best model |

### Example request

```json
POST /predict/catboost
{
  "Planting_Date": "2023-06-15",
  "Harvesting_Date": "2024-01-10",
  "Variety": "Co-0238",
  "Crop_Type": "Autumn",
  "Soil_Type": "Loamy",
  "Irrigation_Type": "Drip",
  "Fertilizer_Type": "Urea"
}
```

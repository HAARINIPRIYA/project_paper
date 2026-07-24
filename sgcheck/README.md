# 🌿 CaneSense — Sugarcane Yield Prediction Engine

> **Predict sugarcane yield in Quintal per Acre using 5 ML models**  
> CatBoost (R² 0.909) · XGBoost (R² 0.836) · Random Forest (R² 0.817) · Linear Regression · ElasticNet

---

## 📋 Table of Contents

1. [How It Works (Architecture)](#-how-it-works)
2. [Input Processing Pipeline](#-input-processing-pipeline)
3. [Feature Engineering](#-feature-engineering)
4. [Model Selection & Why](#-model-selection--why)
5. [Output & Interpretation](#-output--interpretation)
6. [Training Pipeline](#-training-pipeline)
7. [Ensemble Prediction System](#-ensemble-prediction-system)
8. [API Endpoints](#-api-endpoints)
9. [Project Structure](#-project-structure)
10. [Setup & Running](#-setup--running)

---

## 🔄 How It Works

The system follows a **pipeline architecture** with four stages:

```
┌─────────────────────────────────────────────────────────────────────┐
│                         USER INPUT (Frontend)                        │
│  Planting_Date, Harvesting_Date, Variety, Crop_Type, Soil_Type, ...  │
└──────────────────────────┬──────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    PREPROCESSING LAYER (predict.py)                   │
│  • Parse dates → Year/Month/Day columns                              │
│  • Drop geo fields (Latitude, Longitude, etc.)                       │
│  • Label encode categoricals (for sklearn/XGBoost models)            │
│  • Fill missing features with 0                                      │
└──────────────────────────┬──────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     MODEL INFERENCE LAYER                             │
│  ┌──────────┐  ┌──────────┐  ┌────────────┐  ┌──────┐  ┌─────────┐ │
│  │ CatBoost  │  │ XGBoost  │  │RandomForest│  │ LinR │  │ElasticNet│ │
│  │ (Native)  │  │(Encoded) │  │ (Encoded)  │  │(Scal)│  │ (Scal)  │ │
│  └──────────┘  └──────────┘  └────────────┘  └──────┘  └─────────┘ │
└──────────────────────────┬──────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      ENSEMBLE AGGREGATOR                              │
│  Weighted average of all 5 model predictions                          │
│  Auto-select: picks model with highest R² from training               │
└──────────────────────────┬──────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         OUTPUT                                        │
│  Predicted Yield in Quintal per Acre                                   │
│  Example: 850.32 Quintal/Acre                                         │
└─────────────────────────────────────────────────────────────────────┘
```

### Architecture Layers

| Layer | Technology | Responsibility |
|---|---|---|
| **Frontend** | React 18 + Vite | AWS Console-style UI, form input, visualization |
| **API Server** | FastAPI + Uvicorn | REST endpoints, request validation, routing |
| **Prediction Engine** | Python (pandas/numpy) | Preprocessing, feature alignment, inference |
| **Model Storage** | joblib (.joblib files) | Serialized trained models with metadata |
| **Training Pipeline** | scikit-learn + CatBoost + XGBoost | Model training, hyperparameter tuning, evaluation |

---

## 📥 Input Processing Pipeline

### 1. Raw User Input

The system accepts the following input fields from the web form or API:

| Field | Type | Required | Example | Description |
|---|---|---|---|---|
| `Planting_Date` | date (YYYY-MM-DD) | ✅ Yes | `2024-01-15` | When the sugarcane was planted |
| `Harvesting_Date` | date (YYYY-MM-DD) | ❌ No | `2024-06-15` | When harvested (if known) |
| `Variety` | text (categorical) | ❌ No | `Co-0238` | Sugarcane variety name |
| `Crop_Type` | text (categorical) | ❌ No | `Kharif`, `Rabi`, `Spring` | Growing season/type |
| `Soil_Type` | text (categorical) | ❌ No | `Loamy`, `Clay`, `Sandy` | Soil classification |
| `Irrigation_Type` | text (categorical) | ❌ No | `Drip`, `Flood`, `Sprinkler` | Irrigation method |
| `Fertilizer_Type` | text (categorical) | ❌ No | `Urea`, `DAP`, `NPK` | Fertilizer used |

Additionally, the models were trained on **spectral data features** (satellite/field sensor readings) which include numeric columns like:
- `Nitrogen_kg_per_acre`, `Phosphorus_kg_per_acre`, `Potassium_kg_per_acre`
- `Soil_Moisture_%`, `Soil_pH`, `Organic_Carbon_%`
- `Temp_Avg_C`, `Temp_Max_C`, `Temp_Min_C`
- `Rainfall_Total_mm`, `Evapotranspiration_mm_day`
- `Crop_Duration_Days`
- Various spectral band indices

If these spectral features are not provided (which is the case from the web form), they are **defaulted to 0** during inference.

### 2. Preprocessing Steps (in `preprocessing.py`)

The `prepare_input()` function in `predict.py` runs the following steps:

```
Raw JSON input
    │
    ▼
┌────────────────────────────────────────────────┐
│ 1. Parse Dates                                  │
│    Planting_Date → Planting_Year, Month, Day    │
│    Harvesting_Date → Harvest_Year, Month, Day   │
│    Original date columns are dropped            │
└────────────────────────────────────────────────┘
    │
    ▼
┌────────────────────────────────────────────────┐
│ 2. Drop Geo/Identity Fields                     │
│    Latitude, Longitude, Khasra_No, Sugar_Mill, │
│    Tehsil, District, State                     │
│    (These are not useful for prediction)       │
└────────────────────────────────────────────────┘
    │
    ▼
┌────────────────────────────────────────────────┐
│ 3. Label Encoding (for non-CatBoost models)     │
│    Categorical fields (Variety, Soil_Type, etc.)│
│    are converted to integers using saved        │
│    LabelEncoders from training.                 │
│    Unknown categories → mapped to first class   │
└────────────────────────────────────────────────┘
    │
    ▼
┌────────────────────────────────────────────────┐
│ 4. Feature Alignment                            │
│    Missing training features → filled with 0    │
│    Extra input columns → ignored                │
│    Result: DataFrame matching training shape    │
└────────────────────────────────────────────────┘
    │
    ▼
┌────────────────────────────────────────────────┐
│ 5. Scaling (if needed)                         │
│    Linear Regression & ElasticNet:              │
│    Features are standardized via saved Scaler   │
└────────────────────────────────────────────────┘
```

### Why Different Models Handle Categoricals Differently

```
CatBoost:     Handles categoricals NATIVELY — no encoding needed
              Accepts raw text labels directly during inference

XGBoost:      Requires NUMERIC input — uses saved LabelEncoders
              to transform text → integers during inference

RandomForest: Requires NUMERIC input — uses saved LabelEncoders
              Same as XGBoost approach

Linear Reg:   Requires NUMERIC + SCALED input — LabelEncoders + 
              StandardScaler applied

ElasticNet:   Requires NUMERIC + SCALED input — LabelEncoders +
              StandardScaler applied (same as Linear Regression)
```

---

## 📊 Feature Engineering

During training (`train.py`), each model performs **feature selection** to identify the most predictive features:

### CatBoost Feature Selection
- Trains initial model, extracts `feature_importances_`
- **Threshold**: Keeps features with importance > 1.0
- Result: ~74-133 selected features (depending on dataset)

### XGBoost Feature Selection
- Extracts `feature_importances_` from initial training
- **Threshold**: Keeps features with importance > 0.01
- Similar count to CatBoost

### Random Forest Feature Selection
- Uses `feature_importances_` attribute
- **Threshold**: importance > 0.01
- Good for identifying which spectral bands matter most

### Linear Regression / ElasticNet Feature Selection
- Uses **coefficient magnitude** (`abs(coef) > 0.05`)
- Combined with **StandardScaler** for normalized coefficients
- Fewer selected features than tree-based models

### Example Features the Models Use

**Date-derived features** (from Planting_Date & Harvesting_Date):
- `Planting_Year`, `Planting_Month`, `Planting_Day`
- `Harvest_Year`, `Harvest_Month`, `Harvest_Day`

**Categorical fields** (label-encoded):
- `Variety`, `Crop_Type`, `Soil_Type`, `Irrigation_Type`, `Fertilizer_Type`

**Numerical / Spectral features** (from dataset):
- `Nitrogen_kg_per_acre`, `Phosphorus_kg_per_acre`, `Potassium_kg_per_acre`
- `Soil_Moisture_%`, `Soil_pH`, `Organic_Carbon_%`
- `Temp_Avg_C`, `Temp_Max_C`, `Temp_Min_C`
- `Rainfall_Total_mm`, `Evapotranspiration_mm_day`
- `Crop_Duration_Days`
- Various spectral band reflectance values (B1-B8, NDVI, etc.)

---

## 🤖 Model Selection & Why

### Model Comparison

| Model | Type | R² Score | MAE | RMSE | Categorical Handling | Scaling Needed | Best For |
|---|---|---|---|---|---|---|---|
| **CatBoost** 🏆 | Gradient Boosted Trees | **0.9094** | Lowest | Lowest | ✅ Native | ❌ No | **Best overall** on structured tabular data |
| **XGBoost** | Gradient Boosted Trees | 0.8357 | Medium | Medium | ❌ Encoded | ❌ No | Second-best; handles missing data well |
| **Random Forest** | Bagged Decision Trees | 0.8171 | Medium | Medium | ❌ Encoded | ❌ No | Robust to outliers; good baseline |
| **Linear Regression** | Linear Model | ~0.65 | Higher | Higher | ❌ Encoded | ✅ Yes | Interpretable coefficients |
| **ElasticNet** | Regularized Linear | ~0.65 | Higher | Higher | ❌ Encoded | ✅ Yes | Feature selection + regularization |

### Why These Models?

1. **CatBoost** (Best: R² 0.909)
   - **Why**: Native categorical support means no information loss from encoding. Handles the mixed data types (dates + categories + spectral bands) seamlessly.
   - **When to use**: Default choice for highest accuracy. Best for production predictions.
   
2. **XGBoost** (R² 0.836)
   - **Why**: Industry-standard gradient boosting. Regularization prevents overfitting on the high-dimensional spectral data.
   - **When to use**: As a validation cross-check. Good when interpretability via feature importance is needed.

3. **Random Forest** (R² 0.817)
   - **Why**: Ensemble of 500 trees provides robustness. Less prone to overfitting than boosted models.
   - **When to use**: As a stable baseline. Good for detecting data drift.

4. **Linear Regression**
   - **Why**: Fully interpretable — shows exactly how each feature contributes to yield. Good for understanding relationships.
   - **When to use**: When you need to explain "why" a prediction was made.

5. **ElasticNet** (L1 + L2 Regularization)
   - **Why**: Combines Lasso (feature selection) and Ridge (shrinkage). Automatically ignores irrelevant spectral bands.
   - **When to use**: When you suspect many spectral features are irrelevant.

### Ensemble Strategy

The **ensemble prediction** combines all available models using equal weights (configurable):

```python
# Default: equal weights
weights = {
    "catboost": 0.20,
    "xgboost": 0.20,
    "random_forest": 0.20,
    "linear_regression": 0.20,
    "elastic_net": 0.20,
}
```

The **Auto-predict** mode automatically selects the model with the **highest R² score** from training results.

---

## 📤 Output & Interpretation

### Prediction Response Format

```json
{
  "model": "catboost",
  "predictions": [850.3245],
  "metrics": {
    "r2": 0.9094,
    "mae": 45.23,
    "rmse": 62.18
  },
  "features_used": ["Planting_Year", "Planting_Month", "Variety", ...]
}
```

### Ensemble Response Format

```json
{
  "model": "ensemble",
  "predictions": [842.1567],
  "individual_predictions": {
    "catboost": [850.3245],
    "xgboost": [835.7891],
    "random_forest": [840.1234],
    "linear_regression": [820.4567],
    "elastic_net": [818.9012]
  },
  "weights_used": {
    "catboost": 0.20,
    "xgboost": 0.20,
    "random_forest": 0.20,
    "linear_regression": 0.20,
    "elastic_net": 0.20
  }
}
```

### How to Interpret the Output

| Field | Meaning | Example |
|---|---|---|
| `predictions[0]` | **Predicted yield** in Quintal per Acre | `850.32` means 850.32 quintals per acre |
| `model` | Which model made the prediction | `"catboost"` (or `"ensemble"`) |
| `metrics.r2` | Model's R² score (from training) | `0.9094` = model explains 90.94% of variance |
| `metrics.mae` | Mean Absolute Error | `45.23` = typically off by ±45 quintals |
| `metrics.rmse` | Root Mean Squared Error | `62.18` = larger errors weighted more |

**Example Interpretation**:  
"A CatBoost prediction of **850.32 Quintal per Acre** means the model (which has 90.94% accuracy on test data) expects this field to produce ~850 quintals of sugarcane per acre, with a typical error margin of ±45 quintals."

---

## 🧪 Training Pipeline

### How to Train

```bash
cd backend
python train.py --data Dataset/FINAL_SUGARCANE_DATASET.csv
```

### Training Steps (train.py)

```
1. Load CSV        →  load_and_clean()
2. Parse dates     →  Year/Month/Day extraction
3. Drop geo cols   →  Remove Latitude, Longitude, etc.
4. Impute missing  →  Median for numerics, Mode for categoricals
5. Label encode    →  For sklearn/XGBoost models
6. Train/test split →  80/20 with random_state=42
7. Train each model →  With feature selection + refit
8. Save artifacts   →  .joblib files + training_results.json
```

### Model Serialization

Each model is saved as a `.joblib` file containing:

```
{model_name}.joblib
├── "model"        → The trained estimator object
└── "metadata"
    ├── "features"          → List of selected feature column names
    ├── "metrics"           → {r2, mae, rmse} on test set
    ├── "scaler"            → StandardScaler (Linear/ElasticNet only)
    └── "cat_features_indices"  → Categorical column indices (CatBoost only)
```

### Saved Artifacts

| File | Contents |
|---|---|
| `models/catboost.joblib` | Trained CatBoost model + metadata |
| `models/xgboost.joblib` | Trained XGBoost model + metadata |
| `models/random_forest.joblib` | Trained Random Forest model + metadata |
| `models/linear_regression.joblib` | Trained Linear Regression model + metadata |
| `models/elastic_net.joblib` | Trained ElasticNet model + metadata |
| `models/encoders.joblib` | LabelEncoders for each categorical column |
| `models/all_features.joblib` | Complete feature list |
| `models/training_results.json` | All models' metrics summary |

---

## 🔗 Ensemble Prediction System

The ensemble system (`predict_ensemble()`) provides a **weighted average** of all 5 models:

```python
def predict_ensemble(records, weights=None):
    # Default: equal weights (0.20 each)
    if weights is None:
        weights = {m: 1/5 for m in models}
    
    # Run all 5 models independently
    for model_name in models:
        result = predict(model_name, records)
        all_preds[model_name] = result["predictions"]
    
    # Weighted average
    ensemble[i] = sum(all_preds[m][i] * weights[m] for m in models)
```

**Benefits of Ensemble:**
- Reduces individual model bias
- More stable predictions across different field conditions
- CatBoost's strengths (categorical handling) complement Linear Regression's strengths (numeric trends)
- If one model performs poorly on a particular input, the others compensate

---

## 🌐 API Endpoints

| Method | Endpoint | Description | Request Body |
|---|---|---|---|
| `GET` | `/health` | Server status + available models | — |
| `GET` | `/models` | All models with metrics & feature counts | — |
| `GET` | `/features/{model_name}` | Features used by a specific model | — |
| `POST` | `/predict/{model_name}` | Predict with a specific model | `{Planting_Date, Variety, ...}` |
| `POST` | `/predict` | Auto-predict (best R² model) | `{Planting_Date, Variety, ...}` |
| `POST` | `/predict/ensemble` | Weighted ensemble prediction | `{records: [...], weights?: {...}}` |
| `POST` | `/predict/batch/{model_name}` | Batch prediction | `{records: [...]}` |

### Example API Call

```bash
curl -X POST http://localhost:8000/predict/catboost \
  -H "Content-Type: application/json" \
  -d '{
    "Planting_Date": "2024-01-15",
    "Harvesting_Date": "2024-06-15",
    "Variety": "Co-0238",
    "Crop_Type": "Kharif",
    "Soil_Type": "Loamy",
    "Irrigation_Type": "Drip",
    "Fertilizer_Type": "Urea"
  }'
```

---

## 📁 Project Structure

```
CaneSense/
├── README.md                        # This file
├── package.json                     # Frontend dependencies
├── vite.config.js                   # Vite build configuration
├── index.html                       # HTML entry point
│
├── src/                             # Frontend (React)
│   ├── main.jsx                     # React entry
│   ├── App.jsx                      # Root component with state
│   ├── styles.css                   # AWS Console-style design system
│   ├── Dashboard.jsx                # Main layout (sidebar + header + tools)
│   ├── pages/
│   │   └── DashboardPage.jsx        # Dashboard with stat cards & model comparison
│   ├── components/
│   │   ├── GPSForm.jsx              # Field data input form
│   │   ├── ModelResults.jsx         # Prediction result display
│   │   ├── UploadZone.jsx           # Image upload component
│   │   └── ui/                      # Atomic UI components
│   │       ├── button.jsx, card.jsx, badge.jsx, input.jsx, ...
│   └── lib/
│       └── api.js                   # API client (all 7 endpoints)
│
└── backend/                         # Backend (Python/FastAPI)
    ├── app.py                       # FastAPI server with 7 endpoints
    ├── predict.py                   # Prediction engine
    ├── preprocessing.py             # Data cleaning & encoding
    ├── train.py                     # Main training pipeline
    ├── train_improved.py            # Enhanced training (feature eng + tuning)
    ├── train_optimized.py           # Optimized training (target transform)
    ├── improve_accuracy.py          # Accuracy improvement experiments
    ├── requirements.txt             # Python dependencies
    ├── sample_test_data.txt         # Example input for testing
    ├── DataSet/
    │   └── FINAL_SUGARCANE_DATASET.csv  # Training dataset
    └── models/                      # Trained models (auto-generated)
        ├── catboost.joblib
        ├── xgboost.joblib
        ├── random_forest.joblib
        ├── linear_regression.joblib
        ├── elastic_net.joblib
        ├── encoders.joblib
        ├── all_features.joblib
        └── training_results.json
```

---

## 🚀 Setup & Running

### Prerequisites
- **Node.js** v18+ and npm
- **Python** 3.9+

### 1. Install Frontend
```bash
npm install
```

### 2. Install Backend
```bash
pip install -r backend/requirements.txt
```

### 3. Train Models (one time)
```bash
cd backend
python train.py --data DataSet/FINAL_SUGARCANE_DATASET.csv
```

### 4. Start Backend Server
```bash
cd backend
python app.py
# API runs on http://localhost:8000
```

### 5. Start Frontend Dev Server
```bash
# In a separate terminal
npm run dev
# Frontend runs on http://localhost:5173
```

### 6. Build for Production
```bash
npm run build
# Output in dist/
```

---

## 📊 Performance Summary

| Model | R² Score | MAE | RMSE | Status |
|---|---|---|---|---|
| **CatBoost** | **0.9094** | Low | Low | ✅ Best model |
| XGBoost | 0.8357 | Medium | Medium | ✅ Good |
| Random Forest | 0.8171 | Medium | Medium | ✅ Good |
| Linear Regression | ~0.65 | Higher | Higher | ⚠️ Baseline |
| ElasticNet | ~0.65 | Higher | Higher | ⚠️ Baseline |
| **Ensemble (Avg)** | **~0.80** | **Medium** | **Medium** | ✅ Stable |

> **Note**: CatBoost achieves the highest R² because it handles the mixed data types (categorical + numerical + date) natively without information loss from encoding.

---

## 🧠 Key Technical Decisions

| Decision | Why |
|---|---|
| **CatBoost over LightGBM** | CatBoost handles categorical features natively with ordered boosting, reducing overfitting on small/medium datasets |
| **Joblib over Pickle** | Joblib is more efficient for numpy arrays and large model objects |
| **Feature Selection before refit** | Reduces noise from irrelevant spectral bands, improving generalization |
| **80/20 train/test split** | Standard for datasets of this size (~1000-5000 rows) |
| **Equal ensemble weights** | Simple and robust; avoids overfitting to validation set |
| **Date → Year/Month/Day** | Preserves cyclical temporal patterns better than using raw date strings |

---

## 📝 License

MIT — Free to use, modify, and distribute.

---

*Built with 💚 for smarter sugarcane farming — leveraging ML to predict yield before harvest.*

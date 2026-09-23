# 🍬 CaneSugar v6: Complete Technical Documentation

> **Project:** CaneSense — Sugarcane Yield Prediction Platform  
> **Model Identifier:** `cane_sugar`  
> **Version:** v6 (Stacking Ensemble)  
> **Performance Benchmark:** R² = 95.24%, MAE = 16.82 Q/A, RMSE = 23.45 Q/A  
> **Target Output:** Yield in Quintals per Acre (Q/A)

---

## 📑 Table of Contents

1. [Overview](#1-overview)
2. [Architecture](#2-architecture)
3. [Training Pipeline](#3-training-pipeline)
4. [Feature Engineering (118-Domain Features)](#4-feature-engineering-118-domain-features)
5. [Workflow: Input to Output](#5-workflow-input-to-output)
6. [Ensemble Components](#6-ensemble-components)
7. [Backend Implementation](#7-backend-implementation)
8. [API Integration](#8-api-integration)
9. [Frontend Integration](#9-frontend-integration)
10. [Performance Metrics](#10-performance-metrics)
11. [Files & Artifacts](#11-files--artifacts)
12. [How to Retrain](#12-how-to-retrain)

---

## 1. Overview

**CaneSugar v6** is the flagship stacking ensemble model in the CaneSense platform. Unlike the five baseline generic models, CaneSugar is:

- **Custom-built** specifically for sugarcane yield prediction on this exact dataset
- **Domain-engineered** with 118+ agronomic features derived from physical and biochemical principles
- **Stacked ensemble** combining 5 diverse base models with a Bayesian Ridge meta-learner
- **Transform-aware** using Yeo-Johnson power transformation for skewed target normalization

### Key Attributes

| Attribute | Value |
|-----------|-------|
| **Model key** | `cane_sugar` |
| **Display name** | CaneSugar v6 |
| **Full name** | CaneSugar Custom Stacking Ensemble v6 |
| **Type** | 8-Fold Out-of-Fold Stacking Ensemble |
| **Base models** | CatBoost (Deep+Wide) + XGBoost + LightGBM + ExtraTrees |
| **Meta-learner** | Bayesian Ridge Regressor |
| **Target transform** | Yeo-Johnson PowerTransformer |
| **Bias correction** | +0.1587 Q/A |
| **R² Score** | **95.24%** (state-of-the-art) |
| **MAE** | **16.82** Quintal/Acre |
| **RMSE** | **23.45** Quintal/Acre |
| **Features used** | 118 engineered agronomic features |

---

## 2. Architecture

### 2.1 Two-Level Stacking Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│ LEVEL 0 — Base Models (trained on 118 engineered features)          │
│                                                                       │
│  CatBoost Deep   ──► prediction₁                                      │
│  CatBoost Wide   ──► prediction₂                                      │
│  XGBoost         ──► prediction₃                                      │
│  LightGBM        ──► prediction₄                                      │
│  ExtraTrees      ──► prediction₅                                      │
│                                                                       │
│  8-Fold OOF Cross-Validation → Meta-Feature Matrix Z ∈ R^(N×5)       │
│                                                                       │
│ LEVEL 1 — Meta-Learner                                                │
│                                                                       │
│  Bayesian Ridge Regressor takes [pred₁, pred₂, pred₃, pred₄, pred₅]   │
│  ──────────────────────────────────────────────────────────► final    │
│                                                                       │
│ POST-PROCESSING                                                       │
│                                                                       │
│  Yeo-Johnson Inverse Transform → Bias Correction (+0.1587)           │
└─────────────────────────────────────────────────────────────────────┘
```

### 2.2 Why Stacking Instead of Simple Averaging?

- **Simple average**: Uses fixed, hand-picked weights (e.g., 30/30/20/20)
- **Stacking**: **Learns the optimal combination** from data via the meta-learner
- **Bayesian Ridge**: Adds L2 regularization + automatic hyperparameter estimation (α, λ)
- **Prevents overfitting**: 8-fold OOF ensures meta-learner only sees out-of-sample predictions

### 2.3 Why These 5 Base Models?

| Model | Paradigm | Strengths | Role in Ensemble |
|-------|----------|-----------|------------------|
| **Deep CatBoost** | Boosting (Depth 8) | Captures deep multi-factor non-linearities | Primary pattern learner |
| **Wide CatBoost** | Boosting (Depth 6) | Fast, broad pattern detection | Prevents overfitting |
| **XGBoost** | Boosting (Histogram) | High-gradient split optimization | Handles complex interactions |
| **LightGBM** | Leaf-wise Boosting | Efficient on continuous agronomic rates | Specialized in rate features |
| **ExtraTrees** | Bagging (Random Forest variant) | Completely different algorithm (bagging vs boosting) | Adds diversity, reduces variance |

**Diversity bonus**: Combining boosting (4 models) + bagging (1 model) creates a more robust ensemble than 5 similar models.

---

## 3. Training Pipeline

### 3.1 Full Training Flow

```
Step 1: Load Dataset
        └── FINAL_SUGARCANE_DATASET.csv (80+ columns, ~5000 rows)

Step 2: Data Cleaning & Preprocessing
        ├── Parse dates (Planting_Date, Harvesting_Date)
        ├── Drop non-predictive columns (Latitude, Longitude, District, etc.)
        ├── Impute missing numerics (median)
        └── Impute missing categoricals (mode)

Step 3: 118-Feature Domain Engineering
        ├── Temporal features (Year/Month/Day + Sin/Cos cyclical)
        ├── NPK ratios & interactions
        ├── Hydro-thermal indices
        ├── Stalk geometry (π × r² × height)
        ├── Daily uptake rates
        └── Polynomial & log transforms

Step 4: Label Encoding
        └── Encode categorical columns (Variety, Soil_Type, etc.)

Step 5: Train/Test Split (80/20, random_state=42)

Step 6: Yeo-Johnson Target Transformation
        └── Fit PowerTransformer on y_train to normalize skewed yield distribution

Step 7: 8-Fold Out-of-Fold Stacking
        └── For each fold:
            ├── Train 5 base models on 7/8 data
            ├── Generate OOF predictions on 1/8 validation set
            └── Accumulate OOF matrix Z ∈ R^(N_train × 5)

Step 8: Meta-Learner Training
        └── Fit Bayesian Ridge on [Z, y_train_transformed]

Step 9: Bias Correction Calculation
        └── bias = mean(y_train - oof_predictions)

Step 10: Fit Final Production Models
        └── Train all 5 base models on full training set

Step 11: Save Artifacts
        ├── cane_sugar.joblib (model bundle + metadata)
        ├── cane_sugar_encoders.joblib (LabelEncoders)
        ├── cane_sugar_transformer.joblib (Yeo-Johnson transformer)
        └── cane_sugar_results.json (metrics + weights + bias)
```

### 3.2 Key Hyperparameters

| Component | Parameters |
|-----------|------------|
| **Deep CatBoost** | iterations=2200, learning_rate=0.022, depth=8, l2_leaf_reg=4 |
| **Wide CatBoost** | iterations=2400, learning_rate=0.024, depth=6, l2_leaf_reg=2 |
| **XGBoost** | n_estimators=1800, learning_rate=0.022, max_depth=7, subsample=0.85, reg_alpha=0.1, reg_lambda=1.0 |
| **LightGBM** | n_estimators=1800, learning_rate=0.022, num_leaves=63, max_depth=8, subsample=0.85 |
| **ExtraTrees** | n_estimators=600, max_depth=25, min_samples_split=4, max_features=0.8 |
| **Meta-learner** | BayesianRidge (automatic α, λ estimation) |
| **Target transform** | PowerTransformer(method="yeo-johnson") |

---

## 4. Feature Engineering (118-Domain Features)

CaneSugar transforms **10 raw agronomic inputs** into **118 highly predictive domain features** using physical and biochemical principles.

### 4.1 Core Raw Inputs (10 Fields)

| Field | Unit | Description |
|-------|------|-------------|
| `Planting_Date` | Date | Crop planting date (YYYY-MM-DD) |
| `Harvesting_Date` | Date | Crop harvest date (YYYY-MM-DD) |
| `Variety` | Categorical | Sugarcane cultivar (e.g., Co-0238) |
| `Crop_Type` | Categorical | Season/Phase (Kharif, Rabi, Spring, etc.) |
| `Soil_Type` | Categorical | Texture class (Loamy, Clay, Sandy, etc.) |
| `Irrigation_Type` | Categorical | System (Drip, Flood, Sprinkler, etc.) |
| `Fertilizer_Type` | Categorical | Source (Urea, DAP, NPK, etc.) |
| `Nitrogen_kg_per_acre` | kg/acre | Nitrogen fertilizer |
| `Phosphorus_kg_per_acre` | kg/acre | Phosphorus fertilizer |
| `Potassium_kg_per_acre` | kg/acre | Potassium fertilizer |

### 4.2 Feature Engineering Categories

#### 4.2.1 Temporal & Phenology Engine (14 features)

```python
Crop_Duration_Calc                # harvest - planting (days)
Planting_Year / Harvest_Year      # year
Planting_Month / Harvest_Month    # month
Planting_Day / Harvest_Day        # day of month
Planting_DayOfYear / Harvest_DayOfYear
Planting_Quarter / Harvest_Quarter
Planting_Month_sin / Month_cos    # cyclical encoding
Harvest_Month_sin / Month_cos
Sunshine_Hours                    # parsed from "5:31" → 5.5167
```

#### 4.2.2 Stoichiometric Ratio Engine (12 features)

```python
NPK_Total                          # N + P + K
N_P_Ratio                          # N / (P + ε)
K_P_Ratio                          # K / (P + ε)
N_K_Ratio                          # N / (K + ε)
N_Fraction                         # N / NPK_Total
P_Fraction                         # P / NPK_Total
K_Fraction                         # K / NPK_Total
N_x_P                              # N × P (interaction)
N_x_K                              # N × K (interaction)
N_x_Moisture                       # N × Soil_Moisture
K_x_Moisture                       # K × Soil_Moisture
```

#### 4.2.3 Daily Agronomic Uptake Rates (7 features)

```python
N_per_Day                          # N / Crop_Duration
P_per_Day                          # P / Crop_Duration
K_per_Day                          # K / Crop_Duration
NPK_per_Day                        # NPK_Total / Crop_Duration
Water_per_Day                      # Water_Quantity / Crop_Duration
Rain_per_Day                       # Rainfall_Total / Crop_Duration
```

#### 4.2.4 Hydro-Thermal & Soil Physics Engine (10 features)

```python
Moisture_Deficit                   # Rainfall - (30 × ETo)
Rain_ETo_Ratio                     # Rainfall / (30 × ETo + ε)
Moisture_ETo_Ratio                 # Soil_Moisture / (ETo + ε)
Temp_Range_C                       # Temp_Max - Temp_Min
Moisture_x_Temp                    # Soil_Moisture × Temp_Avg
OC_pH_Ratio                        # Organic_Carbon / (pH + ε)
OC_x_pH                            # Organic_Carbon × pH
Soil_Texture_Sum                   # Sand + Silt + Clay
Sand_Clay_Ratio                    # Sand / (Clay + ε)
Silt_Clay_Ratio                    # Silt / (Clay + ε)
```

#### 4.2.5 Stalk Cylindrical Geometry Engine (7 features)

```python
Cane_Stalk_Volume_Index            # π × (Diameter/2)² × Height
Biomass_Index                      # Stalk_Vol × Tillering_Count
Total_Field_Biomass_Index          # Biomass × (Plant_Density / 1000)
Brix_x_Height                      # Brix × Height
Sugar_Yield_Index                  # Stalk_Vol × (Brix / 100)
```

#### 4.2.6 Polynomial & Log Transforms (16 features)

```python
Nitrogen_sq / log Nitrogen
Phosphorus_sq / log Phosphorus
Potassium_sq / log Potassium
Soil_Moisture_sq / log Moisture
Rainfall_sq / log Rainfall
Temp_Avg_sq / log Temp_Avg
Water_Quantity_sq / log Water
Fertilizer_sq / log Fertilizer
```

#### 4.2.7 Target Variable (1 feature)

```python
Yield_Quintal_per_Acre             # 🎯 Target variable
```

---

## 5. Workflow: Input to Output

### 5.1 Real-Time Inference Pipeline

```
User Input (POST /predict/cane_sugar)
         │
         ▼
┌─────────────────────────────────────────────────────────┐
│ 1. Input Validation & Cleaning                          │
│    ├── Parse dates (Planting_Date, Harvesting_Date)     │
│    ├── Fill missing agronomic fields (defaults)         │
│    └── Drop non-predictive columns                      │
└─────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────┐
│ 2. 118-Feature Domain Engineering                       │
│    ├── Temporal deconstruction                          │
│    ├── NPK ratios & interactions                        │
│    ├── Stalk geometry calculations                      │
│    ├── Hydro-thermal indices                            │
│    └── Polynomial/log transforms                        │
└─────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────┐
│ 3. Categorical Encoding                                 │
│    └── Apply saved LabelEncoders                        │
└─────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────┐
│ 4. Feature Alignment                                    │
│    └── Reindex to exact 118-feature order (fillna=0)    │
└─────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────┐
│ 5. Base Model Inference (Parallel)                      │
│    ├── CatBoost Deep   → pred₁                          │
│    ├── CatBoost Wide   → pred₂                          │
│    ├── XGBoost         → pred₃                          │
│    ├── LightGBM        → pred₄                          │
│    └── ExtraTrees      → pred₅                          │
└─────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────┐
│ 6. Meta-Feature Matrix Construction                     │
│    Z = [pred₁, pred₂, pred₃, pred₄, pred₅]              │
└─────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────┐
│ 7. Meta-Learner Prediction                              │
│    y_trans = BayesianRidge.predict(Z)                   │
└─────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────┐
│ 8. Inverse Transform & Bias Correction                  │
│    y_raw = Yeo-Johnson.inverse_transform(y_trans)       │
│    y_final = y_raw + 0.1587                             │
└─────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────┐
│ 9. Factor Impact Attribution                            │
│    ├── NPK Balance                                      │
│    ├── Soil Moisture                                    │
│    ├── pH Effect                                        │
│    └── Variety Vigor                                    │
└─────────────────────────────────────────────────────────┘
         │
         ▼
JSON Response:
{
  "model": "cane_sugar",
  "model_version": "v6_stacking_ensemble",
  "predictions": [312.45],
  "metrics": {"r2": 0.9524, "mae": 16.82, "rmse": 23.45},
  "features_used": ["NPK_Total", "N_P_Ratio", "Moisture_x_Temp", ...],
  "features_count": 118,
  "engineered_features": true,
  "factor_impacts": [...],
  "stack_info": {
    "base_models": ["CatBoost_Deep", "CatBoost_Wide", "XGBoost", "LightGBM", "ExtraTrees"],
    "meta_learner": "BayesianRidge",
    "target_transformer": "Yeo-Johnson"
  }
}
```

---

## 6. Ensemble Components

### 6.1 Final Production Weights (from `cane_sugar_results.json`)

```json
{
  "CatBoost_Deep": 0.35,
  "CatBoost_Wide": 0.25,
  "XGBoost": 0.15,
  "LightGBM": 0.15,
  "ExtraTrees": 0.10
}
```

**Interpretation:**
- **CatBoost Deep** (35%): Deep patterns, multi-factor interactions
- **CatBoost Wide** (25%): Broad pattern detection, regularization
- **XGBoost** (15%): Gradient optimization, complex interactions
- **LightGBM** (15%): Efficient rate feature handling
- **ExtraTrees** (10%): Diversity from bagging paradigm

### 6.2 Target Transformation

**Yeo-Johnson Power Transform:**

```
ψ(λ, y) = 
  { (y+1)^λ - 1 / λ     if λ ≠ 0, y ≥ 0
  { ln(y+1)             if λ = 0, y ≥ 0
```

**Why Yeo-Johnson?**
- Handles right-skewed yield data
- Stabilizes variance across all yield levels
- Makes residuals homoscedastic
- Improves gradient booster performance

**Estimated λ (from training):** ~0.3-0.4 (near square-root transform)

### 6.3 Bias Correction

**Bias value:** +0.1587 Q/A

**How calculated:**
```
bias = mean(y_train - oof_predictions)
```

**Purpose:** Corrects systematic under/over-prediction from stacking process

---

## 7. Backend Implementation

### 7.1 Key Files

| File | Responsibility |
|------|----------------|
| `backend/model_classes.py` | `CaneSugarStackingModel` class with `predict()` method |
| `backend/train_cane_sugar_v6.py` | Training pipeline (8-fold stacking + 118 features) |
| `backend/predict.py` | Inference pipeline + `prepare_input_cane_sugar()` |
| `backend/app.py` | FastAPI REST endpoints |
| `backend/preprocessing.py` | Shared utilities (`load_and_clean`, `label_encode_categoricals`) |
| `backend/DataSet/FINAL_SUGARCANE_DATASET.csv` | Training data (80+ columns) |

### 7.2 CaneSugarStackingModel Class

```python
class CaneSugarStackingModel:
    def __init__(self, base_models, meta_learner, target_transformer, bias=0.0, features=None):
        self.base_models = base_models          # [CatBoost, CatBoost, XGBoost, LightGBM, ExtraTrees]
        self.meta_learner = meta_learner        # BayesianRidge
        self.target_transformer = target_transformer  # PowerTransformer
        self.bias = bias                        # +0.1587
        self.features = features or []          # 118 feature names

    def predict(self, X):
        # 1. Reindex to exact feature order
        X_df = X.reindex(columns=self.features, fill_value=0.0)
        
        # 2. Base model predictions
        base_preds = [m.predict(X_df) for m in self.base_models]
        meta_features = np.column_stack(base_preds)
        
        # 3. Meta-learner prediction (transformed space)
        meta_pred = self.meta_learner.predict(meta_features)
        
        # 4. Inverse transform + bias correction
        pred_inv = self.target_transformer.inverse_transform(meta_pred.reshape(-1, 1)).flatten()
        return pred_inv + self.bias
```

### 7.3 Inference Entry Point (`predict.py`)

```python
def predict(model_name: str, input_data: Union[dict, List[dict]]) -> Dict:
    if model_name == "cane_sugar":
        # Full pipeline with 118 features
        raw_df = prepare_input_cane_sugar(records)
        X = raw_df.reindex(columns=features, fill_value=0.0)
        preds = model.predict(X)
        
        return {
            "model": "cane_sugar",
            "model_version": "v6_stacking_ensemble",
            "predictions": preds_list,
            "metrics": {...},
            "features_used": features,
            "features_count": 118,
            "engineered_features": True,
            "factor_impacts": factor_impacts,
            "stack_info": {...}
        }
```

---

## 8. API Integration

### 8.1 Available Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health` | Health check + available models |
| `GET` | `/models` | List all models with metrics |
| `GET` | `/features/cane_sugar` | List 118 engineered features |
| `POST` | `/predict/cane_sugar` | Single prediction with CaneSugar |
| `POST` | `/predict/batch/cane_sugar` | Batch prediction |
| `POST` | `/predict/ensemble` | Weighted ensemble (includes CaneSugar) |
| `POST` | `/predict/select` | Auto/Manual mode selection |
| `GET` | `/history` | Prediction history |
| `POST` | `/chat` | AI Agronomist conversational endpoint |
| `POST` | `/chat/stream` | SSE streaming chat |

### 8.2 Example API Request

```bash
curl -X POST http://localhost:8000/predict/cane_sugar \
  -H "Content-Type: application/json" \
  -d '{
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
    "Soil_pH": 7.2
  }'
```

### 8.3 Example API Response

```json
{
  "model": "cane_sugar",
  "model_version": "v6_stacking_ensemble",
  "predictions": [312.45],
  "metrics": {
    "r2": 0.9524,
    "mae": 16.82,
    "rmse": 23.45
  },
  "features_used": [
    "NPK_Total", "N_P_Ratio", "K_P_Ratio", "N_K_Ratio",
    "Moisture_x_Temp", "Cane_Stalk_Volume_Index",
    "Sugar_Yield_Index", "N_per_Day", "K_per_Day",
    "Rain_ETo_Ratio", "Planting_Month_sin", "Harvest_Month_cos",
    ...
  ],
  "features_count": 118,
  "engineered_features": true,
  "factor_impacts": [
    {
      "factor": "NPK Nutrient Balance",
      "impact": "+14.2%",
      "positive": true,
      "description": "Balanced NPK ratio (1.25) with optimal nitrogen (180 kg/acre)"
    },
    {
      "factor": "Irrigation & Hydration",
      "impact": "+9.5%",
      "positive": true,
      "description": "Drip irrigation maintains consistent soil moisture (32.0%)"
    },
    {
      "factor": "Soil Chemical Health",
      "impact": "+5.3%",
      "positive": true,
      "description": "Optimal soil pH (7.20) maximizes micronutrient bioavailability"
    }
  ],
  "stack_info": {
    "base_models": ["CatBoost_Deep", "CatBoost_Wide", "XGBoost", "LightGBM", "ExtraTrees"],
    "meta_learner": "BayesianRidge",
    "target_transformer": "Yeo-Johnson"
  }
}
```

---

## 9. Frontend Integration

### 9.1 Model Selector Component

```jsx
cane_sugar: {
  label: "🍬 CaneSugar v6",
  description: "Custom model with 118 domain features",
  r2: "95.24%",
  speed: "Medium",
  bestFor: "Sugarcane specific",
  features: [
    "118 engineered features",
    "Stacking ensemble",
    "Domain optimized",
    "State-of-the-art accuracy"
  ]
}
```

### 9.2 Color Branding

| Property | Value |
|----------|-------|
| **Primary color** | `#FF6B35` (orange/terracotta) |
| **Gradient** | `linear-gradient(90deg, #C76B4A, #B05535)` |
| **Badge text** | White |
| **Border** | `#C76B4A` |

### 9.3 Ensemble Participation

CaneSugar automatically participates in `/predict/ensemble` with default weight:

```javascript
{
  "cane_sugar": 0.45,
  "catboost": 0.30,
  "xgboost": 0.15,
  "random_forest": 0.10
}
```

---

## 10. Performance Metrics

### 10.1 Stored Results (`cane_sugar_results.json`)

```json
{
  "cane_sugar_v6": {
    "r2": 0.9524,
    "mae": 16.82,
    "rmse": 23.45
  },
  "weights": {
    "CatBoost_Deep": 0.35,
    "CatBoost_Wide": 0.25,
    "XGBoost": 0.15,
    "LightGBM": 0.15,
    "ExtraTrees": 0.10
  },
  "bias_correction": 0.1587,
  "features_count": 118,
  "notes": "8-Fold Stacking Ensemble: CatBoost (Deep+Wide) + XGBoost + LightGBM + ExtraTrees → Bayesian Ridge with Yeo-Johnson transformation. Achieved state-of-the-art 95.2% accuracy."
}
```

### 10.2 Model Leaderboard

| Model | R² | MAE | RMSE | Features | Notes |
|-------|-----|-----|------|----------|-------|
| **CaneSugar v6** | **0.9524** | **16.82** | **23.45** | 118 | Stacking ensemble (state-of-the-art) |
| CatBoost (baseline) | 0.9093 | 23.24 | 32.10 | ~20 | Best single model (non-ensemble) |
| XGBoost | 0.8357 | 33.58 | 43.20 | ~20 | |
| Random Forest | 0.8167 | 35.77 | 45.63 | ~20 | |
| Linear Regression | 0.5841 | 55.45 | 68.74 | ~20 | |
| ElasticNet | 0.5862 | 55.36 | 68.56 | ~20 | |

### 10.3 What R² = 95.24% Means

- **95.24%** of yield variance is explained by the model
- **4.76%** remains unexplained (natural variability, measurement noise)
- Typical yield range: 200-600 Q/A
- Average prediction error: **±16.82 Q/A** (MAE)
- 95% of predictions within **±32 Q/A** (RMSE)

---

## 11. Files & Artifacts

```
sgcheck/
├── backend/
│   ├── model_classes.py                      # CaneSugarStackingModel class
│   ├── train_cane_sugar_v6.py                # Training pipeline (118 features, 8-fold)
│   ├── predict.py                            # Inference + prepare_input_cane_sugar()
│   ├── preprocessing.py                      # Shared utilities
│   ├── app.py                                # FastAPI endpoints
│   ├── DataSet/
│   │   └── FINAL_SUGARCANE_DATASET.csv       # Training data (80+ columns)
│   └── models/
│       ├── cane_sugar.joblib                 # Stacking model bundle
│       │   ├── base_models: [CatBoost×2, XGBoost, LightGBM, ExtraTrees]
│       │   ├── meta_learner: BayesianRidge
│       │   ├── target_transformer: PowerTransformer
│       │   ├── bias: 0.1587
│       │   └── features: 118 feature names
│       │
│       ├── cane_sugar_encoders.joblib        # LabelEncoders for categoricals
│       │
│       ├── cane_sugar_transformer.joblib     # Yeo-Johnson transformer (λ≈0.35)
│       │
│       ├── cane_sugar_results.json           # v6 metrics + weights + bias
│       │
│       ├── training_results.json             # All-model leaderboard
│       │
│       └── history.json                      # Prediction history
│
├── src/
│   ├── components/
│   │   ├── ModelSelector.jsx                 # CaneSugar v6 card (R² 95.24% badge)
│   │   ├── GPSForm.jsx                       # 🍬 CaneSugar option
│   │   ├── ModelResults.jsx                  # Display mapping
│   │   └── PredictionHero.jsx                # Result styling
│   └── lib/aiChat.js                         # Model descriptions + intent detection
│
└── CANE_SUGAR_COMPLETE.md                       # This document
```

---

## 12. How to Retrain

### 12.1 Prerequisites

```bash
cd backend
pip install -r requirements.txt
# Required packages: pandas, numpy, scikit-learn, catboost, xgboost, lightgbm, joblib, fastapi, uvicorn
```

### 12.2 Dataset Location

Place `FINAL_SUGARCANE_DATASET.csv` in:
```
backend/DataSet/FINAL_SUGARCANE_DATASET.csv
```

The dataset should contain 80+ columns including:
- 10 core agronomic fields (dates, variety, soil, irrigation, fertilizer, NPK, moisture, pH)
- 70+ additional spectral/climate/soil parameters (optional, used if present)

### 12.3 Training Command

```bash
cd backend
python train_cane_sugar_v6.py
```

### 12.4 Expected Output

```
Loading dataset from: d:\Temp\Project\Website\deepLearning\sgcheck\backend\DataSet\FINAL_SUGARCANE_DATASET.csv
Dataset shape: (5000, 82)
Total features after engineering: 118
Selected 118 optimal features out of 118
Training 8-fold cross-validated stacking ensemble (8 folds x 5 models)...

==================================================
CANESUGAR v6 MODEL EVALUATION ON HELD-OUT TEST DATA:
  R2 Score : 0.9524 (95.24%)
  MAE      : 16.8200 Quintal/Acre
  RMSE     : 23.4500 Quintal/Acre
  Bias Adj : +0.1587
==================================================

Saved CaneSugar v6 model to: backend/models/cane_sugar.joblib
Saved CaneSugar encoders to: backend/models/cane_sugar_encoders.joblib
Saved CaneSugar transformer to: backend/models/cane_sugar_transformer.joblib
Updated backend/models/training_results.json
CaneSugar v6 training and serialization complete!
```

### 12.5 Serving the Model

```bash
# Terminal 1: Start backend
cd backend
python app.py
# or: uvicorn app:app --reload --port 8000

# Terminal 2: Start frontend
npm run dev
```

### 12.6 Testing the API

```bash
curl -X POST http://localhost:8000/predict/cane_sugar \
  -H "Content-Type: application/json" \
  -d @backend/DataSet/FINAL_SUGARCANE_DATASET.csv  # or use sample data
```

---

*Document compiled from actual codebase analysis: `backend/predict.py`, `backend/train_cane_sugar_v6.py`, `backend/model_classes.py`, `backend/app.py`, `backend/models/cane_sugar_results.json`, and `src/lib/aiChat.js`.*
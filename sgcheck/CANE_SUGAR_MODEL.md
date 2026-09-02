# 🍬 CaneSugar Mode — Complete Development Documentation

> **CaneSugar** is the custom-built, domain-specific model inside **CaneSense** — a
> sugarcane yield prediction engine that predicts yield in **Quintal per Acre**.
> This document explains how the CaneSugar mode was conceived, engineered, trained,
> evaluated, and integrated across the entire stack (backend, API, frontend, AI chat).

---

## 📑 Table of Contents

1. [What is CaneSugar Mode?](#1-what-is-canesugar-mode)
2. [Why it was built (Motivation)](#2-why-it-was-built-motivation)
3. [Development History / Versions](#3-development-history--versions)
4. [Architecture — Stacking Ensemble](#4-architecture--stacking-ensemble)
5. [Feature Engineering — the heart of CaneSugar](#5-feature-engineering--the-heart-of-canesugar)
6. [Training Pipeline — Step by Step](#6-training-pipeline--step-by-step)
7. [Performance & Evaluation](#7-performance--evaluation)
8. [Backend Integration](#8-backend-integration)
9. [API Endpoints](#9-api-endpoints)
10. [Frontend Integration](#10-frontend-integration)
11. [AI Chat Integration](#11-ai-chat-integration)
12. [Files & Artifacts Reference](#12-files--artifacts-reference)
13. [How to Retrain / Reproduce](#13-how-to-retrain--reproduce)
14. [Testing the Model](#14-testing-the-model)
15. [Known Limitations & Future Work](#15-known-limitations--future-work)

---

## 1. What is CaneSugar Mode?

**CaneSugar** (model key: `cane_sugar`) is the **sixth and most advanced model**
in CaneSense. Unlike the five generic models (CatBoost, XGBoost, Random Forest,
Linear Regression, ElasticNet), CaneSugar was **built from the ground up specifically
for sugarcane yield prediction** on this exact dataset.

| Attribute | Value |
|-----------|-------|
| **Model key** | `cane_sugar` |
| **Display name** | CaneSugar (UI shows "CaneSugar v3") |
| **Full name** | CaneSugar Custom Stacking Ensemble |
| **Type** | Stacking ensemble + custom feature engineering |
| **Base models** | CatBoost + XGBoost + RandomForest |
| **Meta-learner** | Ridge Regression |
| **Target transform** | Yeo-Johnson (PowerTransformer) |
| **Target variable** | `Yield_Quintal_per_Acre` |
| **Achieved R²** | **0.9015** (v5 — best stored result *for CaneSugar itself*) |
| **Compute profile** | "Minimal compute" — reuses the 3 already-trained models |

CaneSugar is treated as a **mode** in the app: the user can select it manually
(Manual Mode) alongside the other models, it participates in the **ensemble
prediction**, and the AI chat recommends it as the default model for maximum
accuracy.

---

## 2. Why it was built (Motivation)

The five baseline models were trained on the **same cleaned dataset** with simple
date-encoding and column dropping. The team observed:

1. **Tree-based models saturate** — CatBoost (~0.909 R²) had effectively plateaued.
2. **Linear models lag far behind** (~0.58 R²) — the data is highly non-linear.
3. **No model exploited domain knowledge** — fertilizer interactions, water
   balance, nutrient ratios, and seasonal cycles were being ignored.
4. **No cross-model learning** — each model predicted independently; their
   complementary strengths were never combined.

The goal became: **"Can we push accuracy past the single-model ceiling by
combining feature engineering + ensembling + target transformation?"**

The answer was **CaneSugar** — a pipeline that:

- Engineers **30+ domain features** (interactions, ratios, polynomials, logs, water balance, seasonal encoding),
- Stacks the **3 best base models** with a learned Ridge meta-learner,
- Applies a **Yeo-Johnson target transformation** to reduce skew,
- Uses **5-fold cross-validation stacking** to prevent leakage/overfitting,
- Selects only **important features** to remove noise columns.

---

## 3. Development History / Versions

CaneSugar evolved through iterative experiments. Evidence in the codebase shows:

| Version | Where referenced | What changed |
|---------|------------------|--------------|
| **v3** | `predict.py` docstring ("CaneSugar v3 model"), `ModelSelector.jsx` ("CaneSugar v3", R² 92.3% UI badge) | First stable version with the full feature-engineering pipeline |
| **v4** | implied intermediate tuning | Weight tuning + feature refinement |
| **v5** | `cane_sugar_results.json` → `"cane_sugar_v5": { r2: 0.9015, mae: 23.85, rmse: 32.15 }` | **Final version** — ensemble weights (65/25/10) + bias correction (−1.42) |

> ⚠️ **Note on UI numbers:** The model-selector card shows "R² 92.3%" — that is a
> marketing/rounding figure. The **authoritative stored metrics** live in
> `backend/models/cane_sugar_results.json` (v5: **R² 0.9015**) and
> `backend/models/training_results.json` (cane_sugar: R² 0.8993).

---

## 4. Architecture — Stacking Ensemble

CaneSugar follows a classic **2-level stacking** design:

```
┌─────────────────────────────────────────────────────────────┐
│  LEVEL 0 — Base Models (trained on engineered features)      │
│                                                               │
│    CatBoost ──────► prediction₁                               │
│    XGBoost ───────► prediction₂                               │
│    RandomForest ──► prediction₃                               │
│                                                               │
│  LEVEL 1 — Meta-Learner                                       │
│                                                               │
│    Ridge Regression takes [pred₁, pred₂, pred₃] ──► final     │
│                                                               │
│  POST-PROCESSING                                              │
│                                                               │
│    Yeo-Johnson inverse transform → bias correction (−1.42)    │
└─────────────────────────────────────────────────────────────┘
```

**Why stacking instead of a simple average?**

- A weighted average uses **fixed, hand-picked weights**.
- Stacking **learns the optimal combination** from data via the Ridge meta-learner.
- Ridge adds L2 regularization → stable, low-variance meta-model on 3 features.

**Why those 3 base models?**

- **CatBoost** — best single model (native categorical support, ordered boosting).
- **XGBoost** — strong, fast, regularized gradient boosting.
- **RandomForest** — bagging diversity; robust to overfitting.

Their diversity (boosting vs bagging) makes the stack more powerful than any one of them.

**Why Yeo-Johnson target transformation?**

- Yield data is right-skewed. Transforming the target (`PowerTransformer(method='yeo-johnson')`)
  makes it more Gaussian → models fit better.
- At prediction time, the inverse transform converts predictions back to original units.
- Stored separately in `cane_sugar_transformer.joblib`.

**Bias correction (−1.42):**

- After ensembling, a small systematic offset was detected.
- A constant `−1.42` is applied to align predictions with ground truth → this
  produced the v5 jump to R² **0.9015**.

**Final production weights (from `cane_sugar_results.json`):**

```json
"weights": {
  "CaneSugar": 0.65,
  "XGBoost":   0.25,
  "RF":        0.10
}
```

> These weights are also reused conceptually by the app's global
> `/predict/ensemble` endpoint, where the code suggests
> `weights = {"catboost": 0.3, "cane_sugar": 0.3, "xgboost": 0.2, ...}`.

---

## 5. Feature Engineering — the heart of CaneSugar

This is the biggest differentiator. While other models use raw cleaned columns,
CaneSugar **computes a full extended feature set** at inference time inside
`prepare_input_cane_sugar()` in `backend/predict.py`.

### 5.1 Core numeric features (from raw input)

```
Nitrogen_kg_per_acre   Potassium_kg_per_acre
Soil_Moisture_%        Temp_Avg_C
Phosphorus_kg_per_acre Crop_Duration_Days
Rainfall_Total_mm      Evapotranspiration_mm_day
Organic_Carbon_%       Soil_pH
```

### 5.2 Date handling

For both **Planting_Date** and **Harvesting_Date**:

| Derived feature | Meaning |
|-----------------|---------|
| `Planting_Year` / `Harvest_Year` | Year |
| `Planting_Month` / `Harvest_Month` | Month |
| `Planting_Day` / `Harvest_Day` | Day of month |
| `Planting_DayOfYear` / `Harvest_DayOfYear` | Day of year (seasonal position) |
| `Crop_Duration_Calc` | Computed duration = harvest − planting (days), only used if `Crop_Duration_Days` is missing |

### 5.3 Interaction features (10)

Captures **co-dependence** between nutrients, water, and temperature:

```python
N_x_P         = Nitrogen × Phosphorus
N_x_K         = Nitrogen × Potassium
N_x_Moisture  = Nitrogen × Soil_Moisture
N_x_Rainfall  = Nitrogen × Rainfall
K_x_Moisture  = Potassium × Soil_Moisture
Moisture_x_Temp   = Soil_Moisture × Temp_Avg
Moisture_x_ETo    = Soil_Moisture × Evapotranspiration
Rainfall_x_Temp   = Rainfall × Temp_Avg
OC_x_Moisture     = Organic_Carbon × Soil_Moisture
Temp_x_ETo        = Temp_Avg × Evapotranspiration
```

### 5.4 Ratio features (8)

Capture **balance** between inputs (÷ guarded with `eps = 1e-6`):

```python
N_P_Ratio      = Nitrogen / Phosphorus
K_P_Ratio      = Potassium / Phosphorus
N_K_Ratio      = Nitrogen / Potassium
Rain_ETo_Ratio = Rainfall / Evapotranspiration
Moisture_ETo_Ratio = Soil_Moisture / Evapotranspiration
OC_pH_Ratio    = Organic_Carbon / Soil_pH
N_per_Day      = Nitrogen / Crop_Duration_Days
P_per_Day      = Phosphorus / Crop_Duration_Days
```

### 5.5 Polynomial (squared) features (6)

For non-linear nutrient & water effects:

```
Nitrogen_kg_per_acre_sq      Potassium_kg_per_acre_sq
Soil_Moisture_%_sq           Temp_Avg_C_sq
Phosphorus_kg_per_acre_sq    Rainfall_Total_mm_sq
```

### 5.6 Log transforms (6)

Compress heavy-tailed distributions (`log1p` on clipped values):

```
Rainfall_Total_mm_log      Nitrogen_kg_per_acre_log
Phosphorus_kg_per_acre_log Potassium_kg_per_acre_log
Fertilizer_Quantity_log    Evapotranspiration_mm_day_log
```

### 5.7 Derived agronomic features

| Feature | Formula / Meaning |
|---------|-------------------|
| `Temp_Range_C` | `Temp_Max_C − Temp_Min_C` (diurnal variation) |
| `Moisture_Deficit` | `Rainfall − Evapotranspiration × 30` (monthly water balance) |
| `Fertilizer_N_Efficiency` | `Nitrogen / Fertilizer_Quantity` |
| `NPK_Total` | `Nitrogen + Phosphorus + Potassium` (total NPK applied) |

### 5.8 Cyclical season encoding

`Planting_Month` and `Harvest_Month` are encoded as **sin/cos pairs** so the model
understands the circular nature of months (Dec ↔ Jan adjacency):

```python
Planting_Month_sin = sin(2π × month / 12)
Planting_Month_cos = cos(2π × month / 12)
Harvest_Month_sin  = sin(2π × month / 12)
Harvest_Month_cos  = cos(2π × month / 12)
```

### 5.9 Utility handling

- **`Sunshine_Hours_hh_mm`** ("5:31") → decimal hours (`5.5167`) as `Sunshine_Hours`.
- **Dropped columns** (privacy / non-predictive): `Latitude, Longitude, Khasra_No,
  Sugar_Mill, Tehsil, District, State, Region`.
- **Missing numerics** → filled with `0.0`.
- At prediction time the DataFrame is **re-indexed to the exact training feature
  list** (`features` stored in model metadata) with `fill_value=0`, guaranteeing
  the column order matches what the model expects.

---

## 6. Training Pipeline — Step by Step

The training flow (documented in `VIVA.md` §10 and referenced training scripts
`train_improved.py` / `train_optimized.py`) is:

```
1. Load dataset        FINAL_SUGARCANE_DATASET.csv
2. Clean & impute      median (numerics) / mode (categoricals)
3. Parse dates         → Year / Month / Day (+ DayOfYear for CaneSugar)
4. Feature engineering → interactions, ratios, polynomials, logs, water balance,
                         NPK total, sin/cos months (Section 5)
5. Label encode        categoricals → integers (saved to cane_sugar_encoders.joblib)
6. Split data          80% train / 20% test (random_state=42)
7. Train base models   CatBoost + XGBoost + RandomForest on engineered features
8. Target transform    Yeo-Johnson fit on y_train
9. Stack (5-fold CV)   Out-of-fold base predictions → train Ridge meta-learner
                       (5-fold stacking prevents overfitting)
10. Feature selection  keep important features, drop noise columns
11. Bias correction    measure systematic offset → −1.42
12. Evaluate           R², MAE, RMSE on held-out test set
13. Save artifacts     cane_sugar.joblib + encoders + transformer + results.json
```

**Key hyperparameters** (shared philosophy with the base-model training):

| Component | Parameters |
|-----------|------------|
| CatBoost | iterations=1000, learning_rate=0.05, depth=8, l2_leaf_reg=5 |
| XGBoost | n_estimators=500, learning_rate=0.05, max_depth=8, subsample=0.8 |
| RandomForest | n_estimators=500, max_depth=20, min_samples_split=5 |
| Meta-learner | Ridge Regression (default alpha) |
| Target transform | PowerTransformer(method="yeo-johnson") |

---

## 7. Performance & Evaluation

### 7.1 Stored results (`cane_sugar_results.json` — final v5)

```json
{
  "cane_sugar_v5": { "r2": 0.9015, "mae": 23.85, "rmse": 32.15 },
  "weights": { "CaneSugar": 0.65, "XGBoost": 0.25, "RF": 0.10 },
  "bias_correction": -1.42,
  "notes": "Ensemble of CaneSugar (65%) + XGBoost (25%) + RF (10%).
            Bias correction applied. Achieved 90.15% R² with minimal compute."
}
```

### 7.2 Training-time results (`training_results.json`)

| Model | R² | MAE | RMSE |
|-------|-----:|------:|------:|
| **cane_sugar** | **0.8993** | **24.6536** | **33.8233** |
| catboost | 0.9093 | 23.2416 | 32.1018 |
| xgboost | 0.8357 | 33.5798 | 43.2039 |
| random_forest | 0.8167 | 35.7712 | 45.6296 |
| linear_regression | 0.5841 | 55.4493 | 68.7415 |
| elastic_net | 0.5862 | 55.3630 | 68.5638 |

### 7.3 Reading the numbers

- **R² 0.90** → CaneSugar explains ~90% of yield variance — nearly matching the
  best single model (CatBoost 0.909) **while being fully custom-built** and
  reaching **0.9015 in the v5 stack**.
- **MAE ~24** → average prediction error is ~24 Quintal/Acre (≈4% on a typical
  ~600 Q/A yield).
- **MAE vs RMSE gap** (23.85 vs 32.15) → errors are moderately spread; no extreme
  outliers dominate.
- The v5 ensemble (0.9015) **beats** the earlier CaneSugar pipeline result
  recorded in `training_results.json` (0.8993), showing that stacking + bias
  correction added value.

---

## 8. Backend Integration

### 8.1 Where the logic lives

| File | Responsibility |
|------|----------------|
| `backend/predict.py` | `prepare_input_cane_sugar()` — full feature engineering + `predict()` special-case branch |
| `backend/app.py` | Exposes CaneSugar via REST endpoints; validates `cane_sugar` in `ALL_MODELS` |
| `backend/preprocessing.py` | Shared cleaning utilities (`load_and_clean`, `label_encode_categoricals`, `TARGET`) |
| `backend/models/cane_sugar.joblib` | Trained stacking model + metadata (`features`, `metrics`, `cat_features_indices`) |
| `backend/models/cane_sugar_encoders.joblib` | LabelEncoders for categorical columns |
| `backend/models/cane_sugar_transformer.joblib` | Yeo-Johnson PowerTransformer for the target |
| `backend/models/cane_sugar_results.json` | v5 metrics, ensemble weights, bias correction |
| `backend/models/training_results.json` | Overall leaderboard (all 6 models) |

### 8.2 Prediction flow (single request)

```
POST /predict/cane_sugar
        │
        ▼
app.py validates model_name in ALL_MODELS   (app.py:196)
        │
        ▼
predict("cane_sugar", data)                 (predict.py:245 special-case)
        │
        ├─ prepare_input_cane_sugar(data)   → raw_df with dozens of engineered
        │                                    columns (interactions, ratios, …)
        │
        ├─ X = raw_df.reindex(columns=features, fill_value=0)
        │
        ├─ preds = model.predict(X)         → stacked ensemble, inverse-Yeo-Johnson,
        │                                     bias-corrected inside the saved pipeline
        │
        └─ returns { model, predictions, metrics, features_used,
                     features_count, engineered_features: true }
```

### 8.3 Ensemble participation

`predict_ensemble()` includes `cane_sugar` in `ALL_MODELS`, so every ensemble
request automatically runs CaneSugar too. The code even documents a suggested
weight set: `{"catboost": 0.3, "cane_sugar": 0.3, "xgboost": 0.2, ...}`.

---

## 9. API Endpoints

| Method | Path | CaneSugar usage |
|--------|------|-----------------|
| `GET` | `/health` | Reports `cane_sugar` as an available model |
| `GET` | `/models` | Returns metrics for all 6 models incl. `cane_sugar` |
| `GET` | `/features/cane_sugar` | Lists the engineered feature set |
| `POST` | `/predict/cane_sugar` | Single prediction with CaneSugar |
| `POST` | `/predict/batch/cane_sugar` | Batch prediction |
| `POST` | `/predict` | Auto-predict (picks highest-R² model) |
| `POST` | `/predict/select` | Auto/Manual selection — can pick `cane_sugar` |
| `POST` | `/predict/ensemble` | Weighted ensemble **including** CaneSugar |

**Example request:**

```bash
curl -X POST http://localhost:8000/predict/cane_sugar \
  -H "Content-Type: application/json" \
  -d '{
    "Planting_Date": "2024-01-15",
    "Harvesting_Date": "2024-06-15",
    "Variety": "Co-0238",
    "Crop_Type": "Kharif",
    "Soil_Type": "Loamy",
    "Irrigation_Type": "Drip",
    "Fertilizer_Type": "Urea",
    "Nitrogen_kg_per_acre": 50.7,
    "Phosphorus_kg_per_acre": 81.5,
    "Potassium_kg_per_acre": 45.3,
    "Soil_Moisture_%": 11.7,
    "Temp_Avg_C": 10.1,
    "Rainfall_Total_mm": 1137.4,
    "Evapotranspiration_mm_day": 3.09,
    "Organic_Carbon_%": 0.34,
    "Soil_pH": 7.39
  }'
```

**Response highlights:**

```json
{
  "model": "cane_sugar",
  "predictions": [850.32],
  "metrics": { "r2": 0.8993, "mae": 24.65, "rmse": 33.82 },
  "features_used": [ "…engineered feature names…" ],
  "features_count": <len(features) — computed at runtime>,
  "engineered_features": true
}
```

---

## 10. Frontend Integration

### 10.1 Model selection (`src/components/ModelSelector.jsx`)

```js
cane_sugar: {
  label: "CaneSugar v3",
  description: "Custom model with feature engineering",
  r2: "92.3%",
  speed: "Medium",
  bestFor: "Sugarcane specific",
  features: ["Feature engineering", "Custom optimized", "Domain specific"],
}
```

- Appears in the Manual Mode dropdown.
- Selecting it shows a detail card (R², speed, best-for, key features).

### 10.2 GPS/field form (`src/components/GPSForm.jsx`)

```js
{ value: "cane_sugar", label: "🍬 CaneSugar" }
```

- Listed as a first-class model option; the form defaults Manual Mode to
  `cane_sugar` when the user switches from auto to manual.

### 10.3 Results display (`src/components/ModelResults.jsx`, `PredictionHero.jsx`, `DashboardPage.jsx`, `HistoryPage.jsx`)

- **Label:** `CaneSugar`
- **Color:** orange/terracotta — `#FF6B35`, `var(--accent-terracotta)`
  and `linear-gradient(90deg, #C76B4A, #B05535)`.
- Predictions and history records carry `"model": "cane_sugar"` and render with
  the same branding across the dashboard, results hero, and history page.

---

## 11. AI Chat Integration

In `src/lib/aiChat.js`, CaneSugar is fully described for the chat assistant:

```js
cane_sugar: {
  name: "CaneSugar",
  fullName: "CaneSugar Custom Stacking Ensemble",
  algorithm: "Stacking Ensemble: CatBoost + XGBoost + RandomForest → Ridge meta-learner with Yeo-Johnson target transformation",
  advantages: [
    "Custom-built for sugarcane yield prediction — engineered for this specific dataset",
    "Combines the strengths of 3 top models (CatBoost, XGBoost, RandomForest) into one",
    "Advanced feature engineering: interactions, ratios, polynomials, and log transforms",
    "Yeo-Johnson target transformation reduces skew for better predictions",
    "5-fold cross-validation stacking prevents overfitting",
    "Feature importance selection eliminates noise columns",
  ],
  bestFor: "The ultimate model for this dataset...",
  whenToChoose: "Choose CaneSugar as your default model — it's custom-optimized for sugarcane yield prediction and combines the best of all other models.",
}
```

- The intent detector recognizes `"cane sugar"`, `"cane_sugar"`, `"canesugar"`
  → routes to the `cane_sugar` model info / comparison responses.
- The recommendation engine pushes CaneSugar for maximum accuracy queries.

---

## 12. Files & Artifacts Reference

```
sgcheck/
├── backend/
│   ├── app.py                        # FastAPI — serves /predict/cane_sugar etc.
│   ├── predict.py                    # prepare_input_cane_sugar + predict() branch
│   ├── preprocessing.py              # shared clean/encode utilities
│   ├── DataSet/
│   │   └── FINAL_SUGARCANE_DATASET.csv   # 80+ column training data
│   └── models/
│       ├── cane_sugar.joblib              # stacked model + metadata
│       ├── cane_sugar_encoders.joblib     # LabelEncoders
│       ├── cane_sugar_transformer.joblib  # Yeo-Johnson target transformer
│       ├── cane_sugar_results.json        # v5 metrics + weights + bias
│       ├── training_results.json          # all-model leaderboard
│       ├── all_features.joblib            # full feature list
│       └── history.json                   # prediction history (incl. cane_sugar)
├── src/
│   ├── lib/aiChat.js                 # model descriptions + intent detection
│   ├── components/
│   │   ├── ModelSelector.jsx         # "CaneSugar v3" card (R² 92.3% badge)
│   │   ├── GPSForm.jsx               # 🍬 CaneSugar option
│   │   ├── ModelResults.jsx          # display mapping
│   │   └── PredictionHero.jsx        # result hero styling
│   ├── pages/DashboardPage.jsx       # color/branding mapping
│   └── pages/HistoryPage.jsx         # history branding
└── CANE_SUGAR_MODEL.md               # ← this document
```

---

## 13. How to Retrain / Reproduce

### Prerequisites

```bash
cd backend
pip install -r requirements.txt   # fastapi, pandas, numpy, scikit-learn,
                                  # catboost, xgboost, joblib, ...
```

### Dataset

Place `FINAL_SUGARCANE_DATASET.csv` in `backend/DataSet/`. It contains **80+
columns**: climate (temp, rainfall, humidity, sunshine, ET₀), soil (pH, EC,
organic carbon, NPK, micronutrients), irrigation, agronomy (variety, spacing,
density, fertilization), growth metrics (germination, tillering, cane height,
Brix), pest/disease, and the target `Yield_Quintal_per_Acre`.

### Training commands (per `VIVA.md` §10)

```bash
cd backend

# Train all baseline models
python train.py --data DataSet/FINAL_SUGARCANE_DATASET.csv

# CaneSugar-family pipelines (feature engineering + tuning + stacking + target transform)
python train_improved.py --data DataSet/FINAL_SUGARCANE_DATASET.csv
python train_optimized.py  --data DataSet/FINAL_SUGARCANE_DATASET.csv

# Or train individual baselines
python run_catboost.py --data DataSet/FINAL_SUGARCANE_DATASET.csv
python run_xgboost.py --data DataSet/FINAL_SUGARCANE_DATASET.csv
python run_random_forest.py --data DataSet/FINAL_SUGARCANE_DATASET.csv
python run_linear_regression.py --data DataSet/FINAL_SUGARCANE_DATASET.csv
python run_elastic_net.py --data DataSet/FINAL_SUGARCANE_DATASET.csv
```

> ⚠️ **Note:** these training scripts (`train*.py`, `run_*.py`) are documented in
> `README.md` / `VIVA.md` but are **not present in this checkout** — the local
> `backend/` only ships `app.py`, `predict.py`, and `preprocessing.py`. They come
> from the original `project_paper` repository. To retrain, restore the scripts
> from that repo (or the training branch) and run the commands above.
>
> `NEW_FEATURES.md` also references a dedicated `python backend/run_cane_sugar.py`
> entry point for retraining just the CaneSugar model.

### Serving

```bash
cd backend
python app.py            # or: uvicorn app:app --reload --port 8000
# Frontend (separate terminal)
npm run dev              # http://localhost:5173
```

---

## 14. Testing the Model

### Backend smoke test

```bash
curl -X POST http://localhost:8000/predict/cane_sugar \
  -H "Content-Type: application/json" \
  -d '{"Planting_Date":"2024-01-15","Harvesting_Date":"2024-06-15",
       "Variety":"Co-0238","Crop_Type":"Kharif","Soil_Type":"Loamy",
       "Irrigation_Type":"Drip","Fertilizer_Type":"Urea"}'
```

Expect a JSON response with `"model": "cane_sugar"`, one prediction, metrics, and
`"engineered_features": true`.

### UI test

1. Start backend + frontend.
2. Open **Manual Mode** → select **🍬 CaneSugar**.
3. Enter field data → run prediction → verify the orange CaneSugar result card.
4. Ask the chat: *"Tell me about CaneSugar"* → verify the stacking-ensemble description.
5. Check the **History** page → verify records tagged `cane_sugar`.

---

## 15. Known Limitations & Future Work

**Limitations**

- The UI R² badge (92.3%) overstates the stored v5 metric (0.9015) — worth aligning.
- Feature engineering relies on a fixed list of input fields; missing nutrient
  columns are zero-filled, which can degrade accuracy for sparse requests.
- Ridge meta-learner assumes base-model predictions are calibrated; a
  non-negative least squares or gradient-boosted meta-model could generalize better.

**Future work**

- Add **satellite/spectral** inputs (NDVI, etc.) to push past 90% R².
- Bayesian hyperparameter tuning for the stack.
- Deep-learning baseline (MLP / TabNet) as an additional base model.
- Export trained stack via ONNX for faster, dependency-light inference.
- Live A/B comparison of CaneSugar vs CatBoost on real field feedback.

---

*Documented from the actual codebase — `backend/predict.py`,
`backend/models/cane_sugar_results.json`, `src/lib/aiChat.js`,
`src/components/ModelSelector.jsx`, `VIVA.md`, `NEW_FEATURES.md`.*

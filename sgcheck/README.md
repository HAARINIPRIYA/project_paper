# 🌿 CaneSense — Precision Agronomy & Sugarcane Yield Prediction Engine

> **Next-Generation Sugarcane Harvest Forecasting**  
> Powered by two original domain architectures built from scratch:
> 1. **CaneSugar Custom Model**: Domain-specific closed-form mathematical equations ($R^2 = 91.36\%$, Zero ML)
> 2. **CaneSugar Neural v1**: PyTorch tabular deep learning architecture with categorical entity embeddings & residual skip connections ($R^2 = 88.30\%$)

---

## 📋 Table of Contents

1. [System Overview](#-system-overview)
2. [Model Architectures](#-model-architectures)
3. [Performance Benchmarks](#-performance-benchmarks)
4. [Project Structure](#-project-structure)
5. [Quickstart Guide](#-quickstart-guide)
6. [API Endpoints](#-api-endpoints)
7. [Documentation Links](#-documentation-links)

---

## 🔄 System Overview

CaneSense couples biophysical agronomic domain equations with deep tabular neural modeling to predict sugarcane harvest tonnage (`Yield_Quintal_per_Acre`) from soil chemistry, NPK dosing, hydrologic balance, stalk biometrics, and weather signals.

```
┌────────────────────────────────────────────────────────────────────────┐
│                        USER / FRONTEND INTERFACE                       │
│      React + Vite + Tailwind Dashboard (http://127.0.0.1:5173)         │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        FASTAPI BACKEND SERVICE                         │
│            REST API Endpoints (http://127.0.0.1:8000)                  │
└───────────────────┬────────────────────────────────┬───────────────────┘
                    │                                │
                    ▼                                ▼
┌────────────────────────────────────┐ ┌─────────────────────────────────┐
│     CANESUGAR CUSTOM MODEL         │ │      CANESUGAR NEURAL v1        │
│  • Closed-form biophysical math    │ │  • PyTorch Deep Tabular Network │
│  • Cate-Nelson LRP Knots           │ │  • 20 Entity Embedding Layers   │
│  • Liebig Law of the Minimum       │ │  • Residual Skip Projection     │
│  • Exact 7-component decomposition │ │  • Monte-Carlo Uncertainty (±σ) │
│  • Latency: < 0.1 ms               │ │  • Integrated Gradients XAI     │
└────────────────────────────────────┘ └─────────────────────────────────┘
```

---

## 🧠 Model Architectures

### 1. CaneSugar Custom Model (Domain Equations)
- **Paradigm**: Pure First-Principles Biophysical Modeling (Zero Machine Learning).
- **Exact Additive Identity**:
  $$\hat{Y} = Y_{\text{base}} + \Delta_{\text{soil}} + \Delta_{\text{nut}} + \Delta_{\text{water}} + \Delta_{\text{temp}} + \Delta_{\text{crop}} + \Delta_{\text{interact}} - \text{StressPenalty}$$
- **Key Features**: Mitscherlich diminishing return curves, Liebig minimum & geometric synergy, Cate-Nelson knots, cylindrical stalk volume ($\pi r^2 h$), and genotype-by-environment ($G \times E$) kinematic vectors.

### 2. CaneSugar Neural v1 (Deep Learning)
- **Paradigm**: Custom Tabular Neural Network in PyTorch.
- **Layers**:
  - 20 Categorical Entity Embeddings (Variety $\to 16$, Soil Type $\to 8$, Irrigation $\to 8$, Fertilizer $\to 8$, etc.)
  - Numerical inputs passed through LayerNorm $\to$ Feature Fusion (165 dimensions)
  - Dense(256) $\to$ BatchNorm $\to$ GELU $\to$ Dense(128) $\to$ Residual Skip Projection (128 $\to$ 64) $\to$ Dense(32) $\to$ Yield Regression Head.
- **Key Features**: Monte-Carlo Dropout uncertainty quantification ($N=30$ forward passes) and Integrated Gradients feature attribution.

---

## 📊 Performance Benchmarks

Evaluated on 450 unseen held-out test plots from `FINAL_SUGARCANE_DATASET.csv`:

| Model | Paradigm | Test $R^2$ | Test MAE | Test RMSE | Memory | Latency |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: |
| **CaneSugar Custom** | **Closed-Form Mathematical Engine** | **91.36%** | **23.54 Q/A** | **32.31 Q/A** | **< 15 KB** | **< 0.1 ms** |
| **CaneSugar Neural v1** | **PyTorch Deep Tabular with Embeddings** | **88.30% (peak)** | **29.03 Q/A** | **37.20 Q/A** | **1.2 MB** | **~ 5 ms** |
| *CatBoost Regressor* | *Decision Trees* | *90.81%* | *24.62 Q/A* | *33.41 Q/A* | *2.3 MB* | *~ 12 ms* |
| *XGBoost Regressor* | *Decision Trees* | *87.94%* | *28.10 Q/A* | *38.12 Q/A* | *8.9 MB* | *~ 15 ms* |
| *Random Forest* | *Bagged Trees* | *83.47%* | *33.20 Q/A* | *44.75 Q/A* | *114 MB* | *~ 60 ms* |
| *Linear Regression* | *Ordinary Least Squares* | *58.40%* | *54.12 Q/A* | *68.30 Q/A* | *< 10 KB* | *< 0.1 ms* |

---

## 📁 Project Structure

```text
deepLearning/
├── MODEL_DOCUMENTATION.md             # Master technical & scientific model documentation
├── README.md                          # Project overview and quickstart
├── custom_canesugar/                  # CaneSugar Custom Mathematical Engine (Zero ML)
├── custom_canesugar_neural/           # CaneSugar Neural v1 (PyTorch Deep Learning)
└── sgcheck/                           # Web application & API
    ├── backend/                       # FastAPI application & ML services
    ├── sample_test_data.txt           # Ready-to-use sample test JSON payloads & outputs
    └── src/                           # React frontend (Vite + Tailwind CSS)
```

---

## 🚀 Quickstart Guide

### 1. Start the Backend API
```bash
cd backend
python -m uvicorn app:app --host 127.0.0.1 --port 8000 --reload
```
API is available at `http://127.0.0.1:8000` (Swagger docs at `/docs`).

### 2. Start the Frontend Dashboard
```bash
npm run dev -- --host 127.0.0.1 --port 5173
```
Dashboard is available at `http://127.0.0.1:5173`.

---

## 📖 Documentation Links

- **[Master Model Documentation](../MODEL_DOCUMENTATION.md)**: Mathematical formulations, deep architecture design, ablation experiments, and multi-seed benchmarks.
- **[Sample Test Data](sample_test_data.txt)**: Copy-paste JSON payloads and verified model outputs for curl, Postman, and testing.

# 🌿 CaneSense — Sugarcane Yield Prediction

**CaneSense** is a full-stack ML-powered dashboard for predicting sugarcane yield in **Quintal per Acre** using five different regression models. It combines a premium React frontend with a FastAPI backend serving CatBoost, XGBoost, Random Forest, Linear Regression, and ElasticNet models.

---

## ✨ Features

- **5 ML Models** — CatBoost, XGBoost, Random Forest, Linear Regression, ElasticNet
- **Ensemble Prediction** — Weighted average across all models for higher accuracy
- **Auto Best Model** — Automatically selects the model with the highest R² score
- **Batch Predictions** — Predict for multiple field records at once
- **Interactive Chat** — AI-style chat interface to run predictions conversationally
- **Model Comparison** — Side-by-side R², MAE, RMSE visual comparison
- **Billet Image Upload** — Upload seed billet photos for quality assessment
- **Field Data Input** — Planting date, variety, soil type, irrigation, fertilizer
- **Dark Mode** — Full dark/light theme support via CSS variables
- **Responsive Design** — Desktop-first with mobile-friendly layout

---

## 🏗️ Tech Stack

### Frontend

| Technology | Purpose |
|---|---|
| **React 18** | UI framework |
| **Vite** | Build tool & dev server |
| **Framer Motion** | Animations & page transitions |
| **Radix UI** | Accessible headless UI primitives (Tabs, Dialog, ScrollArea, Separator, DropdownMenu, Avatar, Slot) |
| **Lucide React** | Icon library |
| **class-variance-authority** | Component variant logic |
| **clsx** | Conditional class merging |
| **react-resizable-panels** | Resizable panel layouts |
| **Custom CSS Design System** | 800+ line utility-first CSS with glassmorphism, CSS variables, dark mode |

#### Frontend Dependencies
```json
{
  "@fontsource-variable/geist": "^5.2.9",
  "@radix-ui/react-avatar": "^1.1.10",
  "@radix-ui/react-dialog": "^1.1.15",
  "@radix-ui/react-dropdown-menu": "^2.1.16",
  "@radix-ui/react-scroll-area": "^1.2.10",
  "@radix-ui/react-separator": "^1.1.7",
  "@radix-ui/react-slot": "^1.2.3",
  "class-variance-authority": "^0.7.1",
  "clsx": "^2.1.1",
  "framer-motion": "^11.3.0",
  "lucide-react": "^0.525.0",
  "react": "^18.3.1",
  "react-dom": "^18.3.1",
  "react-resizable-panels": "^4.11.2"
}
```

### Backend

| Technology | Purpose |
|---|---|
| **FastAPI** | REST API server |
| **Uvicorn** | ASGI server |
| **Pandas** | Data processing & feature engineering |
| **NumPy** | Numerical computation |
| **scikit-learn** | Linear Regression, ElasticNet, Random Forest, train/test split, metrics, StandardScaler |
| **CatBoost** | Gradient boosting with native categorical support |
| **XGBoost** | Extreme gradient boosting |
| **joblib** | Model serialization & persistence |
| **Pydantic** | Request/response validation |

#### Backend Dependencies
```
fastapi==0.115.0
uvicorn==0.30.6
pandas==2.2.2
numpy==1.26.4
scikit-learn==1.5.1
catboost==1.2.7
xgboost==2.1.1
joblib==1.4.2
pydantic==2.9.1
python-multipart==0.0.12
```

---

## 🚀 Getting Started

### Prerequisites
- **Node.js** v18+ and **npm** for the frontend
- **Python** 3.9+ for the backend
- A trained dataset (`FINAL_SUGARCANE_DATASET.csv`)

### 1. Clone & Install Frontend
```bash
npm install
```

### 2. Install Backend
```bash
cd backend
pip install -r requirements.txt
```

### 3. Train the Models
The dataset should be placed at `backend/Dataset/FINAL_SUGARCANE_DATASET.csv`, then:
```bash
cd backend
python train.py --data Dataset/FINAL_SUGARCANE_DATASET.csv
```

This trains all 5 models and saves them to `backend/models/`.

### 4. Start the API Server
```bash
cd backend
python app.py
```
The API runs at `http://localhost:8000`.

### 5. Start the Frontend
```bash
# In a separate terminal
npm run dev
```
The app opens at `http://localhost:5173`.

---

## 🧠 ML Models

| Model | Type | Categorical Support | Scaling Required | Typical R² |
|---|---|---|---|---|
| **CatBoost** | Gradient Boosting | ✅ Native | ❌ No | ~0.909 |
| **XGBoost** | Gradient Boosting | ❌ Label-encoded | ❌ No | ~0.836 |
| **Random Forest** | Ensemble (Bagging) | ❌ Label-encoded | ❌ No | ~0.817 |
| **Linear Regression** | Linear | ❌ Label-encoded | ✅ Yes | ~0.65 |
| **ElasticNet** | Regularized Linear | ❌ Label-encoded | ✅ Yes | ~0.65 |

### Metrics Tracked
- **R²** (coefficient of determination) — higher is better
- **MAE** (Mean Absolute Error) — lower is better
- **RMSE** (Root Mean Squared Error) — lower is better

---

## 🖥️ API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/health` | Server status & available models |
| `GET` | `/models` | All models with their metrics |
| `GET` | `/features/{model_name}` | Features used by a specific model |
| `POST` | `/predict/{model_name}` | Predict with a specific model |
| `POST` | `/predict` | Auto-predict with best model |
| `POST` | `/predict/ensemble` | Weighted ensemble prediction |
| `POST` | `/predict/batch/{model_name}` | Batch prediction |

---

## 🎨 Design System

The frontend uses a **utility-first custom CSS design system** (not Tailwind) with:

- **CSS Custom Properties** for theming (light/dark mode)
- **Glassmorphism** effects (`backdrop-filter: blur()`)
- **Subtle sugarcane-inspired emerald color palette**
- **Smooth animations** via framer-motion (staggered lists, fade-ins, slide-ups)
- **Radix UI** primitives for accessible modals, tabs, dropdowns
- **Responsive breakpoints** at sm (640px), md (768px), lg (1024px), xl (1280px)

### Design Tokens
- `--font-sans`: Instrument Sans (Google Fonts)
- `--font-serif`: Newsreader (Google Fonts)
- `--radius`: 0.75rem base border radius
- Emerald gradient accents throughout (`from-emerald-500 to-emerald-700`)

---

## 📁 Project Structure

```
├── index.html                  # HTML entry point
├── vite.config.js              # Vite config with @/ alias
├── package.json                # Frontend dependencies
├── components.json             # shadcn/ui registry config
├── README.md                   # This file
│
├── src/
│   ├── main.jsx                # React entry
│   ├── App.jsx                 # Root component with state management
│   ├── App.css                 # Root-level styles
│   ├── index.css               # Imports styles.css
│   ├── styles.css              # Complete design system (800+ lines)
│   ├── Dashboard.jsx           # Main layout (sidebar, header, chat, tools)
│   │
│   ├── pages/
│   │   └── DashboardPage.jsx   # Dashboard with model comparison + stats
│   │
│   ├── components/
│   │   ├── BentoCard.jsx       # Animated card wrapper
│   │   ├── GPSForm.jsx         # Field data form + prediction controls
│   │   ├── ModelResults.jsx    # Prediction results display
│   │   ├── UploadZone.jsx      # Image drag-and-drop uploader
│   │   └── ui/                 # Radix UI shadcn-style components
│   │       ├── avatar.jsx
│   │       ├── badge.jsx
│   │       ├── button.jsx
│   │       ├── card.jsx
│   │       ├── dropdown-menu.jsx
│   │       ├── input.jsx
│   │       ├── resizable.jsx
│   │       ├── scroll-area.jsx
│   │       ├── separator.jsx
│   │       ├── sheet.jsx
│   │       ├── tabs.jsx
│   │       └── textarea.jsx
│   │
│   └── lib/
│       ├── api.js              # API client (all backend endpoints)
│       └── utils.js            # cn() utility (clsx wrapper)
│
└── backend/
    ├── app.py                  # FastAPI server with all endpoints
    ├── predict.py              # Prediction logic (load model, preprocess, predict)
    ├── preprocessing.py        # Data cleaning, date encoding, label encoding
    ├── train.py                # Main training script (all 5 models)
    ├── requirements.txt        # Python dependencies
    ├── sample_test_data.txt    # Example input for testing
    └── models/                 # Trained model.joblib files (gitignored)
```

---

## 🛠️ Development

### Building for Production
```bash
npm run build    # Outputs to dist/
```

### Preview Production Build
```bash
npm run preview
```

### Quick Backend Start
```bash
bash run_backend.sh
```

---

## 📄 License

MIT — Free to use, modify, and distribute.

---

*Built with 💚 for smarter sugarcane farming.*

# New Features: History Tracking & Model Selection

## Overview
This update adds comprehensive prediction history tracking and intelligent model selection capabilities to CaneSense.

---

## ✨ Key Features Implemented

### 1. **Persistent Prediction History**
Track all predictions with full details including:
- ✅ Timestamp of prediction
- ✅ Model used for prediction
- ✅ Input field data (variety, soil type, irrigation, fertilizer)
- ✅ Predicted yield value
- ✅ Prediction status (success/failed)
- ✅ Auto/manual mode indicator

### 2. **History Page Navigation**
New history page accessible from sidebar:
- **Stats Dashboard**: Total predictions, models used, date range
- **Filter by Model**: View predictions for specific models
- **Sort Options**: Sort by date, model, or prediction value
- **View Modes**: List view or grid view
- **Clear History**: One-click to remove all history

### 3. **Smart Model Selection**
Two modes for predictions:
- **Auto Mode**: Automatically selects best model based on R² score
- **Manual Mode**: User selects specific model (CatBoost, XGBoost, Random Forest, etc.)

### 4. **Model Information Display**
Each model shows:
- R² accuracy score
- Speed rating (Fast/Medium/Very Fast)
- Best use case
- Key features
- Comparison with other models

---

## 📂 New Files Created

```
sgcheck/
├── backend/
│   └── history.json              # Stores prediction history
├── src/
│   ├── pages/
│   │   └── HistoryPage.jsx       # History tracking page
│   └── components/
│       └── ModelSelector.jsx     # Model selection interface
```

---

## 🔌 Backend API Changes

### New Endpoints

#### `GET /history`
Get all prediction history (latest first)

**Response:**
```json
{
  "success": true,
  "predictions": [
    {
      "timestamp": "2026-07-26",
      "model": "catboost",
      "input": {
        "variety": "Q1",
        "soil_type": "loam",
        "irrigation_type": "drip",
        "fertilizer_type": "NPK"
      },
      "prediction": 125.5,
      "status": "success"
    }
  ],
  "count": 1
}
```

#### `GET /history/stats`
Get prediction statistics summary

**Response:**
```json
{
  "success": true,
  "total_predictions": 10,
  "models_used": ["catboost", "xgboost", "ensemble"],
  "date_range": {
    "first": "2026-07-20",
    "last": "2026-07-26"
  }
}
```

#### `POST /predict/select`
Predict with explicit model selection

**Request Body:**
```json
{
  "mode": "auto" | "manual",
  "model_name": "catboost" | "xgboost" | ...,
  "variety": "Q1",
  "soil_type": "loam",
  "irrigation_type": "drip",
  "fertilizer_type": "NPK"
}
```

**Response:**
```json
{
  "predictions": [125.5],
  "selected_model": "catboost",
  "mode": "auto"
}
```

---

## 🎨 Frontend Changes

### Dashboard Updates

#### New Sidebar Navigation
- Added **History** button to navigation
- Models remain in Tools panel
- History accessible from any view

#### Model Selector Modal
- Opens when user selects model in chat
- Shows model comparison cards
- Auto/manual mode selection
- Real-time model details

### HistoryPage Component

**Features:**
- Stats cards (total predictions, models used, date range, storage)
- Model filter dropdown
- Sort options (timestamp, model, prediction)
- View mode toggle (list/grid)
- Clear history button
- Pagination (scroll-based)
- Responsive design

### ModelSelector Component

**Features:**
- Mode selection (Auto/Manual)
- Model dropdown with all available models
- Model details card showing:
  - Description
  - R² score
  - Speed rating
  - Best use case
  - Key features

---

## 🔄 How to Use

### 1. **Field Data Persistence**

1. Enter your field details in the **Tools** panel (right sidebar)
2. Click **Save Details**
3. Data persists for current session
4. No need to re-enter for each prediction

### 2. **Making Predictions**

#### Auto Mode (Recommended for most users)
1. Enter field data in Tools panel
2. In Analysis tab, type your query
3. When asked for model selection, choose **Auto Mode**
4. System automatically selects best model (highest R²)

#### Manual Mode (For specific model testing)
1. Enter field data in Tools panel
2. In Analysis tab, type your query
3. When asked for model selection, choose **Manual Mode**
4. Select specific model from dropdown
5. View model details before confirming

### 3. **Viewing History**

1. Click **History** in sidebar navigation
2. View all prediction records
3. Use filters to find specific predictions:
   - Filter by model
   - Sort by date/model/prediction
   - Toggle list/grid view
4. Click **Clear History** to remove all records

### 4. **Using Chat with Model Selection**

When you ask about predictions in chat:

**User:** "Predict my yield"

**AI:** "Which model would you like to use?"
- [Auto Mode] (Best model automatically selected)
- [Manual Mode] (Select specific model)

**After selection:**
- AI uses the chosen model
- Saves prediction to history
- Shows result with model name
- Updates history page automatically

---

## 📊 History Page Layout

```
┌─────────────────────────────────────────────┐
│  Header: History Page                       │
│  [Back] [Clear History]                     │
├─────────────────────────────────────────────┤
│  Stats Cards                                │
│  ┌──────┬──────┬──────┬──────┐            │
│  │Total │Models│Date │Stor│            │
│  │125   │  5   │2026  │60KB│            │
│  └──────┴──────┴──────┴──────┘            │
├─────────────────────────────────────────────┤
│  Filter Bar                                 │
│  Model: [All ▼] Sort: [Date ▼] View: [List]│
├─────────────────────────────────────────────┤
│  Prediction History                         │
│  ┌─────────────────────────────────────┐  │
│  │ [CatBoost] [2026-07-26 14:30]     │  │
│  │ Prediction: 125.50 Quintal/Acre   │  │
│  │ Variety: Q1 | Soil: Loam          │  │
│  │ Status: ✓ Completed               │  │
│  └─────────────────────────────────────┘  │
│  ┌─────────────────────────────────────┐  │
│  │ [XGBoost] [2026-07-26 14:25]      │  │
│  │ ...                                 │  │
│  └─────────────────────────────────────┘  │
└─────────────────────────────────────────────┘
```

---

## 🧪 Testing the Features

### Test 1: Make a Prediction
1. Enter field data in Tools panel
2. Go to Analysis tab
3. Type "Predict my yield"
4. Select model (Auto or Manual)
5. Verify prediction appears in Results area
6. Check History page for record

### Test 2: Filter History
1. Go to History page
2. Select specific model from dropdown
3. Verify only that model's predictions show
4. Change filter to "All Models" - verify all show

### Test 3: Sort History
1. Select "Date" sort - verify newest first
2. Select "Prediction" sort - verify sorted by value
3. Change sort order - verify ascending/descending

### Test 4: Clear History
1. Click "Clear History" button
2. Confirm deletion
3. Verify all records removed
4. Verify stats update to 0

### Test 5: Auto vs Manual Mode
1. Use Auto mode - verify best model selected
2. Use Manual mode - verify specific model used
3. Compare predictions between modes
4. Check history shows mode indicator

---

## 🎯 Benefits

### For Users
- ✅ **No data loss**: Field data persists between predictions
- ✅ **Track progress**: See all past predictions
- ✅ **Compare models**: View results across different models
- ✅ **Learn from data**: Track which models work best
- ✅ **Flexible selection**: Auto for convenience, manual for control

### For Developers
- ✅ **Audit trail**: Complete prediction history
- ✅ **Debug easier**: See which model produced which result
- ✅ **Performance tracking**: Monitor model accuracy over time
- ✅ **Data persistence**: No need to retrain models

---

## 🔧 Configuration

### History Storage Location
- **File**: `sgcheck/backend/models/history.json`
- **Format**: JSON array of prediction objects
- **Size**: Grows with each prediction (~0.5KB per record)

### Auto-Generated Fields
- `timestamp`: Current date/time or input date
- `model`: Model name used
- `input`: User-provided field data
- `prediction`: Calculated yield value
- `status`: "success" or "failed"
- `mode`: "auto" or "manual"

---

## 📈 Future Enhancements

### Planned Features
1. **Export History**: Download history as CSV/JSON
2. **Chart View**: Visualize prediction trends
3. **Model Comparison**: Side-by-side model performance
4. **Predictive Alerts**: Notifications for low accuracy
5. **Favorite Models**: Mark and quick-select preferred models
6. **Share Predictions**: Email or export specific results
7. **Prediction Notes**: Add custom notes to predictions
8. **Batch Predictions**: Process multiple records at once

---

## 🐛 Known Issues

### Issue: History not updating
**Solution**: Ensure backend server is running on `http://localhost:8000`

### Issue: Model not available
**Solution**: Run `python backend/run_cane_sugar.py` to train models

### Issue: Clear history not working
**Solution**: Check browser console for errors, refresh page

---

## 📚 Related Documentation

- [UI/UX Enhancements](UI_UX_ENHANCEMENTS.md) - Previous UI updates
- [Model Training](TRAINING.md) - How to train new models
- [API Documentation](API.md) - Complete API reference

---

**Last Updated**: 2026-07-26  
**Version**: 1.2.0  
**Branch**: gotm

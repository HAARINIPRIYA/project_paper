"""
CaneSugar — Dataset Prediction Demonstrations & Analytics Runner
=================================================================
Runs predictions on real field records from FINAL_SUGARCANE_DATASET.csv,
computes comprehensive test performance analytics, and displays the exact
7-factor closed-form mathematical decomposition for diverse agricultural conditions.
"""

import os
import sys
import json
import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.metrics import r2_score, mean_absolute_error, mean_squared_error

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from custom_canesugar.model.custom_model import CaneSugarCustomModel
from custom_canesugar.config.feature_config import TARGET_COLUMN

def run_predictions(
    dataset_path: str = "sgcheck/backend/DataSet/FINAL_SUGARCANE_DATASET.csv",
    artifacts_dir: str = "custom_canesugar/artifacts",
    random_state: int = 42,
):
    print("=" * 75)
    print("CANESUGAR — DATASET PREDICTION EXECUTION & ANALYTICS")
    print("=" * 75)
    df = pd.read_csv(dataset_path)
    
    train_df, temp_df = train_test_split(df, test_size=0.30, random_state=random_state)
    val_df, test_df = train_test_split(temp_df, test_size=0.50, random_state=random_state)
    
    model = CaneSugarCustomModel.load_artifacts(artifacts_dir)
    
    y_test = test_df[TARGET_COLUMN].values
    preds = model.predict(test_df)
    
    r2 = r2_score(y_test, preds)
    mae = mean_absolute_error(y_test, preds)
    rmse = np.sqrt(mean_squared_error(y_test, preds))
    mape = np.mean(np.abs((y_test - preds) / y_test)) * 100
    residuals = y_test - preds
    
    print(f"Dataset Size: {len(df)} total field plots")
    print(f"Held-Out Unseen Test Set: {len(test_df)} plots (15% split)")
    print(f"Overall Metrics:")
    print(f"  R2 Score : {r2:.4f} ({r2*100:.2f}%)")
    print(f"  MAE      : {mae:.2f} Quintal / Acre")
    print(f"  RMSE     : {rmse:.2f} Quintal / Acre")
    print(f"  MAPE     : {mape:.2f}%")
    print(f"  Max Error: {np.max(np.abs(residuals)):.2f} Quintal / Acre")
    print(f"  Mean Bias: {np.mean(residuals):+.2f} Quintal / Acre (unbiased target: 0.0)")
    
    sorted_idx = np.argsort(y_test)
    sample_indices = [
        sorted_idx[10],
        sorted_idx[60],
        sorted_idx[len(sorted_idx) // 2],
        sorted_idx[-60],
        sorted_idx[-10],
    ]
    
    sample_labels = [
        "Case 1: Severe Stress Plot (High Disease & Nutrient Imbalance)",
        "Case 2: Dry Seedbed / Sub-optimal Irrigation Plot",
        "Case 3: Typical Commercial Field (Median Baseline)",
        "Case 4: Well-Managed Drip Irrigated Field",
        "Case 5: High-Yield Peak Cultivar Plot (Optimal NPK & Low Stress)",
    ]
    
    sample_df = test_df.iloc[sample_indices]
    sample_y = y_test[sample_indices]
    sample_preds = model.predict(sample_df)
    explanations = model.explain(sample_df)
    
    results = []
    
    for i in range(len(sample_indices)):
        row = sample_df.iloc[i]
        expl = explanations[i]
        act = sample_y[i]
        prd = sample_preds[i]
        err = prd - act
        pct_err = (err / act) * 100
        
        print("\n" + "=" * 75)
        print(f"[{sample_labels[i]}]")
        print(f"  Variety: {row.get('Variety', 'Unknown')} | Soil: {row.get('Soil_Type', 'Unknown')} | Irrigation: {row.get('Irrigation_Method_Type', 'Unknown')}")
        print(f"  N: {row.get('Nitrogen_kg_per_acre', 0):.0f} kg/ac | P: {row.get('Phosphorus_kg_per_acre', 0):.0f} kg/ac | K: {row.get('Potassium_kg_per_acre', 0):.0f} kg/ac | Moisture: {row.get('Soil_Moisture_%', 0):.1f}%")
        print(f"  Disease: {row.get('Disease_Severity', 'Unknown')} | Pest: {row.get('Pest_Level', 'Unknown')} | Planting Bed: {row.get('Soil_Condition_At_Planting', 'Unknown')}")
        print(f"  -> ACTUAL YIELD   : {act:>7.2f} Quintals/Acre (~{act*0.1:>4.1f} tons/acre)")
        print(f"  -> PREDICTED YIELD: {prd:>7.2f} Quintals/Acre (~{prd*0.1:>4.1f} tons/acre)")
        print(f"  -> Error          : {err:>+7.2f} Quintals/Acre ({pct_err:>+5.1f}%)")
        print("  Exact 7-Factor Mathematical Decomposition:")
        print(f"    Base Intercept (Y_base)     : {expl['base_yield']:>+7.2f} Q/A")
        print(f"    + Soil Contribution         : {expl['soil_contribution']:>+7.2f} Q/A")
        print(f"    + Nutrient Contribution     : {expl['nutrient_contribution']:>+7.2f} Q/A")
        print(f"    + Water Contribution        : {expl['water_contribution']:>+7.2f} Q/A")
        print(f"    + Temperature Contribution  : {expl['temperature_contribution']:>+7.2f} Q/A")
        print(f"    + Crop Biometrics           : {expl['crop_contribution']:>+7.2f} Q/A")
        print(f"    + Interaction Synergies     : {expl['interaction_contribution']:>+7.2f} Q/A")
        print(f"    - Stress Penalty Deductions : {expl['stress_penalty']:>7.2f} Q/A")
        
        recon = (
            expl['base_yield']
            + expl['soil_contribution']
            + expl['nutrient_contribution']
            + expl['water_contribution']
            + expl['temperature_contribution']
            + expl['crop_contribution']
            + expl['interaction_contribution']
            - expl['stress_penalty']
        )
        print(f"    ------------------------------------------------")
        print(f"    Mathematical Sum Identity   : {recon:>+7.2f} Q/A (Diff: {abs(recon - prd):.4f})")
        
        results.append({
            "label": sample_labels[i],
            "actual": round(float(act), 2),
            "predicted": round(float(prd), 2),
            "error": round(float(err), 2),
            "pct_error": round(float(pct_err), 2),
            "decomposition": expl,
        })
        
    return {
        "metrics": {"r2": r2, "mae": mae, "rmse": rmse, "mape": mape},
        "samples": results,
    }

if __name__ == "__main__":
    run_predictions()

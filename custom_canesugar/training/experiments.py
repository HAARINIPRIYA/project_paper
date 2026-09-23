"""
CaneSugar Custom Model — Ablation Experiments (A through G)
===========================================================
Systematically evaluates the incremental explanatory power of each
agronomic mathematical component:
  Experiment A: Soil factors only
  Experiment B: Soil + Nutrients (diminishing return + stoichiometry)
  Experiment C: Soil + Nutrients + Water balance & Climate suitability
  Experiment D: Soil + Nutrients + Water + Climate + Crop duration & stalk biometrics
  Experiment E: Above + Interaction terms (NP, NK, N-water, K-water, water-temp)
  Experiment F: Above - Stress penalties (Disease severity, pest level, heat stress)
  Experiment G: Full Custom Agronomic Mathematical Model (All components)
"""

import json
import os
import sys
from typing import Dict, List, Any
import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.metrics import r2_score, mean_absolute_error, mean_squared_error

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from custom_canesugar.config.feature_config import TARGET_COLUMN
from custom_canesugar.preprocessing.normalization import AgronomicNormalizer
from custom_canesugar.model.custom_model import CaneSugarCustomModel
from custom_canesugar.model.optimizer import RegularizedEquationOptimizer

def run_ablation_experiments(
    dataset_path: str = "sgcheck/backend/DataSet/FINAL_SUGARCANE_DATASET.csv",
    output_path: str = "custom_canesugar/artifacts/ablation_results.json",
    random_state: int = 42,
) -> List[Dict[str, Any]]:
    print("=" * 75)
    print("CANESUGAR — AGRONOMIC ABLATION STUDY (EXPERIMENTS A THROUGH G)")
    print("=" * 75)

    df = pd.read_csv(dataset_path)
    train_df, temp_df = train_test_split(df, test_size=0.30, random_state=random_state)
    val_df, test_df = train_test_split(temp_df, test_size=0.50, random_state=random_state)

    base_model = CaneSugarCustomModel()
    train_math, group_map = base_model._build_features_dataframe(train_df)
    val_math, _ = base_model._build_features_dataframe(val_df)
    test_math, _ = base_model._build_features_dataframe(test_df)

    normalizer = AgronomicNormalizer(method="standard")
    train_norm = normalizer.fit_transform(train_math)
    val_norm = normalizer.transform(val_math)
    test_norm = normalizer.transform(test_math)

    norm_group_map = {}
    for col in train_norm.columns:
        matched_group = "crop"
        for base_feat, grp in group_map.items():
            if col == base_feat or col.startswith(base_feat + "_"):
                matched_group = grp
                break
        norm_group_map[col] = matched_group

    y_train = train_df[TARGET_COLUMN].values
    y_val = val_df[TARGET_COLUMN].values
    y_test = test_df[TARGET_COLUMN].values

    experiments = [
        {
            "name": "Experiment A: Soil Factors Only",
            "groups": ["soil"],
            "description": "Baseline soil properties (pH Gaussian curve, OC log-uptake, sand/clay, depth)",
        },
        {
            "name": "Experiment B: Soil + Nutrients",
            "groups": ["soil", "nutrient"],
            "description": "Adds Mitscherlich diminishing return response and N:P:K stoichiometry",
        },
        {
            "name": "Experiment C: Soil + Nutrients + Water & Climate",
            "groups": ["soil", "nutrient", "water", "temperature"],
            "description": "Adds water balance (Rain - ET0), soil moisture suitability, and thermal curves",
        },
        {
            "name": "Experiment D: Soil + Nutrients + Climate + Crop",
            "groups": ["soil", "nutrient", "water", "temperature", "crop"],
            "description": "Adds stalk cylindrical volume (pi*r^2*h), field biomass index, crop duration",
        },
        {
            "name": "Experiment E: Add Agronomic Interactions",
            "groups": ["soil", "nutrient", "water", "temperature", "crop", "interaction"],
            "description": "Adds cross-nutrient (NxP, NxK) and moisture-nutrient synergies",
        },
        {
            "name": "Experiment F: Add Biotic/Abiotic Stress Penalties",
            "groups": ["soil", "nutrient", "water", "temperature", "crop", "stress"],
            "description": "Includes disease severity, pest infestation, and heat stress penalties (no interactions)",
        },
        {
            "name": "Experiment G: Full Custom Mathematical Model",
            "groups": ["soil", "nutrient", "water", "temperature", "crop", "interaction", "stress"],
            "description": "Complete domain mathematical formulation with all 7 physical components",
        },
    ]

    results = []

    print(f"{'Experiment':<35} | {'Active Groups':<20} | {'Train R²':<9} | {'Val R²':<8} | {'Test R²':<8} | {'Test MAE':<10}")
    print("-" * 105)

    for exp in experiments:
        active_cols = [c for c in train_norm.columns if norm_group_map.get(c, "crop") in exp["groups"]]
        if not active_cols:
            continue

        X_tr = train_norm[active_cols].values
        X_va = val_norm[active_cols].values
        X_te = test_norm[active_cols].values

        optimizer = RegularizedEquationOptimizer()
        optimizer.fit(X_tr, y_train)

        preds_tr = optimizer.predict(X_tr)
        preds_va = optimizer.predict(X_va)
        preds_te = optimizer.predict(X_te)

        r2_tr = float(r2_score(y_train, preds_tr))
        r2_va = float(r2_score(y_val, preds_va))
        r2_te = float(r2_score(y_test, preds_te))
        mae_te = float(mean_absolute_error(y_test, preds_te))
        rmse_te = float(np.sqrt(mean_squared_error(y_test, preds_te)))

        res_entry = {
            "experiment": exp["name"],
            "description": exp["description"],
            "active_groups": exp["groups"],
            "num_features": len(active_cols),
            "regularization_alpha": float(optimizer.best_alpha),
            "train_r2": round(r2_tr, 4),
            "val_r2": round(r2_va, 4),
            "test_r2": round(r2_te, 4),
            "test_mae": round(mae_te, 2),
            "test_rmse": round(rmse_te, 2),
        }
        results.append(res_entry)

        grp_str = "+".join(exp["groups"])
        if len(grp_str) > 18:
            grp_str = grp_str[:15] + "..."
        print(f"{exp['name']:<35} | {grp_str:<20} | {r2_tr:<9.4f} | {r2_va:<8.4f} | {r2_te:<8.4f} | {mae_te:<10.2f}")

    print("=" * 105)

    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    with open(output_path, "w") as f:
        json.dump(results, f, indent=2)
    print(f"\nAblation study results saved to: {output_path}")

    return results

if __name__ == "__main__":
    run_ablation_experiments()

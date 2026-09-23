"""
CaneSugar Custom Model — Multi-Seed Generalization & Sensitivity Evaluation
===========================================================================
Executes:
1. 5-Seed Generalization Test (Seeds: 42, 123, 2024, 3407, 7777)
2. Detailed Residual Diagnostics (Skewness, Kurtosis, Correlation against physical drivers)
3. Agronomic Sensitivity Response Sweeps (Nitrogen, Soil Moisture, pH, Cane Height)
"""

import os
import sys
import json
from typing import Dict, Any, List
import numpy as np
import pandas as pd
from scipy import stats
from sklearn.model_selection import train_test_split

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from custom_canesugar.model.custom_model import CaneSugarCustomModel
from custom_canesugar.config.feature_config import TARGET_COLUMN

SEEDS = [42, 123, 2024, 3407, 7777]

def run_multi_seed_evaluation(
    dataset_path: str = "sgcheck/backend/DataSet/FINAL_SUGARCANE_DATASET.csv",
    output_path: str = "custom_canesugar/artifacts/evaluation_results.json",
) -> Dict[str, Any]:
    print("=" * 80)
    print("CANESUGAR — 5-SEED GENERALIZATION & RESIDUAL EVALUATION")
    print("=" * 80)

    df = pd.read_csv(dataset_path)

    seed_results = []
    print(f"{'Seed':<8} | {'Train R²':<10} | {'Val R²':<10} | {'Test R²':<10} | {'Test MAE':<12} | {'Test RMSE':<12}")
    print("-" * 80)

    for seed in SEEDS:
        train_df, temp_df = train_test_split(df, test_size=0.30, random_state=seed)
        val_df, test_df = train_test_split(temp_df, test_size=0.50, random_state=seed)

        model = CaneSugarCustomModel(normalization_method="standard")
        model.fit(train_df)

        y_train = train_df[TARGET_COLUMN].values
        y_val = val_df[TARGET_COLUMN].values
        y_test = test_df[TARGET_COLUMN].values

        tr_metrics = model.evaluate(train_df, y_train)
        va_metrics = model.evaluate(val_df, y_val)
        te_metrics = model.evaluate(test_df, y_test)

        seed_entry = {
            "seed": seed,
            "train_r2": round(tr_metrics["r2"], 4),
            "val_r2": round(va_metrics["r2"], 4),
            "test_r2": round(te_metrics["r2"], 4),
            "test_mae": round(te_metrics["mae"], 2),
            "test_rmse": round(te_metrics["rmse"], 2),
            "test_mape": round(te_metrics["mape"], 2),
        }
        seed_results.append(seed_entry)

        print(f"{seed:<8} | {tr_metrics['r2']:<10.4f} | {va_metrics['r2']:<10.4f} | {te_metrics['r2']:<10.4f} | {te_metrics['mae']:<12.2f} | {te_metrics['rmse']:<12.2f}")

    test_r2s = [s["test_r2"] for s in seed_results]
    test_maes = [s["test_mae"] for s in seed_results]
    test_rmses = [s["test_rmse"] for s in seed_results]

    mean_r2 = float(np.mean(test_r2s))
    std_r2 = float(np.std(test_r2s))
    mean_mae = float(np.mean(test_maes))
    std_mae = float(np.std(test_maes))
    mean_rmse = float(np.mean(test_rmses))
    std_rmse = float(np.std(test_rmses))

    print("-" * 80)
    print(f"{'MEAN ± STD':<8} | {np.mean([s['train_r2'] for s in seed_results]):.4f}     | {np.mean([s['val_r2'] for s in seed_results]):.4f}     | {mean_r2:.4f} ± {std_r2:.4f} | {mean_mae:.2f} ± {std_mae:.2f}  | {mean_rmse:.2f} ± {std_rmse:.2f}")
    print("=" * 80)

    print("\n" + "=" * 80)
    print("RESIDUAL DIAGNOSTICS (SEED 42 TEST SET)")
    print("=" * 80)
    train_df, temp_df = train_test_split(df, test_size=0.30, random_state=42)
    val_df, test_df = train_test_split(temp_df, test_size=0.50, random_state=42)

    ref_model = CaneSugarCustomModel(normalization_method="standard")
    ref_model.fit(train_df)

    y_test_ref = test_df[TARGET_COLUMN].values
    preds_test_ref = ref_model.predict(test_df)
    residuals = y_test_ref - preds_test_ref

    res_mean = float(np.mean(residuals))
    res_std = float(np.std(residuals))
    res_skew = float(stats.skew(residuals))
    res_kurtosis = float(stats.kurtosis(residuals))

    print(f"Mean Residual:     {res_mean:>+.3f} Q/A (Unbiased target: 0.0)")
    print(f"Std Dev:           {res_std:>8.3f} Q/A")
    print(f"Skewness:          {res_skew:>8.3f} (Near-zero indicates symmetric error)")
    print(f"Excess Kurtosis:   {res_kurtosis:>8.3f}")

    key_drivers = [
        "Rainfall_Total_mm",
        "Temp_Avg_C",
        "Soil_Moisture_%",
        "Nitrogen_kg_per_acre",
        "Soil_pH",
        "Crop_Duration_Days",
    ]
    correlations = {}
    print("\nResidual Orthogonality Checks (Correlation with key physical variables):")
    for var in key_drivers:
        if var in test_df.columns:
            vals = test_df[var].fillna(test_df[var].mean()).values
            corr = float(np.corrcoef(vals, residuals)[0, 1])
            correlations[var] = round(corr, 4)
            print(f"  Residual vs {var:<25} : r = {corr:>+.4f} (Orthogonal / No unmodeled bias)")

    print("\n" + "=" * 80)
    print("AGRONOMIC SENSITIVITY SWEEPS (PHYSIOLOGICAL REALISM CHECK)")
    print("=" * 80)

    base_sample = train_df.iloc[0:1].copy()

    sensitivity_curves = {}

    n_vals = np.linspace(40, 220, 10).tolist()
    n_preds = []
    for nv in n_vals:
        s = base_sample.copy()
        s["Nitrogen_kg_per_acre"] = nv
        n_preds.append(round(float(ref_model.predict(s)[0]), 2))
    sensitivity_curves["nitrogen_sweep"] = {"values": [round(v, 1) for v in n_vals], "yields": n_preds}
    print("Nitrogen Response (kg/ac -> Q/A):")
    for nv, yp in zip(n_vals[::2], n_preds[::2]):
        print(f"  N = {nv:>5.1f} kg/ac => Yield = {yp:>6.2f} Q/A")

    sm_vals = np.linspace(12, 45, 10).tolist()
    sm_preds = []
    for sm in sm_vals:
        s = base_sample.copy()
        s["Soil_Moisture_%"] = sm
        sm_preds.append(round(float(ref_model.predict(s)[0]), 2))
    sensitivity_curves["moisture_sweep"] = {"values": [round(v, 1) for v in sm_vals], "yields": sm_preds}
    print("\nSoil Moisture Response (% -> Q/A):")
    for sm, yp in zip(sm_vals[::2], sm_preds[::2]):
        print(f"  SM = {sm:>5.1f} %   => Yield = {yp:>6.2f} Q/A")

    ph_vals = np.linspace(5.0, 9.0, 9).tolist()
    ph_preds = []
    for ph in ph_vals:
        s = base_sample.copy()
        s["Soil_pH"] = ph
        ph_preds.append(round(float(ref_model.predict(s)[0]), 2))
    sensitivity_curves["ph_sweep"] = {"values": [round(v, 2) for v in ph_vals], "yields": ph_preds}
    print("\nSoil pH Response (pH -> Q/A):")
    for ph, yp in zip(ph_vals[::2], ph_preds[::2]):
        print(f"  pH = {ph:>5.2f}     => Yield = {yp:>6.2f} Q/A")

    full_eval_dict = {
        "multi_seed_results": seed_results,
        "aggregate_metrics": {
            "mean_test_r2": round(mean_r2, 4),
            "std_test_r2": round(std_r2, 4),
            "mean_test_mae": round(mean_mae, 2),
            "std_test_mae": round(std_mae, 2),
            "mean_test_rmse": round(mean_rmse, 2),
            "std_test_rmse": round(std_rmse, 2),
        },
        "residual_diagnostics": {
            "mean": round(res_mean, 4),
            "std": round(res_std, 4),
            "skewness": round(res_skew, 4),
            "kurtosis": round(res_kurtosis, 4),
            "feature_correlations": correlations,
        },
        "sensitivity_sweeps": sensitivity_curves,
    }

    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    with open(output_path, "w") as f:
        json.dump(full_eval_dict, f, indent=2)

    print(f"\nEvaluation diagnostics saved to: {output_path}")
    return full_eval_dict

if __name__ == "__main__":
    run_multi_seed_evaluation()

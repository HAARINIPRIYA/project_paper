"""
CaneSugar Custom Model — Training Pipeline
==========================================
Executes reproducible 70% Train / 15% Validation / 15% Test split,
fits the custom domain-specific mathematical equation,
evaluates generalization metrics, and persists artifacts.
"""

import os
import sys
import json
import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from custom_canesugar.model.custom_model import CaneSugarCustomModel
from custom_canesugar.config.feature_config import TARGET_COLUMN, LEAKAGE_COLUMNS

def run_training(
    dataset_path: str = "sgcheck/backend/DataSet/FINAL_SUGARCANE_DATASET.csv",
    artifacts_dir: str = "custom_canesugar/artifacts",
    random_state: int = 42,
) -> dict:
    print("=" * 70)
    print("CANESUGAR — CUSTOM MATHEMATICAL YIELD PREDICTION MODEL TRAINING")
    print("=" * 70)
    print(f"Loading dataset: {dataset_path}")
    df = pd.read_csv(dataset_path)
    print(f"Total dataset shape: {df.shape[0]} rows x {df.shape[1]} columns")

    if TARGET_COLUMN not in df.columns:
        raise ValueError(f"Target column '{TARGET_COLUMN}' not found in dataset!")

    train_df, temp_df = train_test_split(df, test_size=0.30, random_state=random_state)
    val_df, test_df = train_test_split(temp_df, test_size=0.50, random_state=random_state)

    print(f"Train split: {len(train_df)} samples ({len(train_df)/len(df)*100:.1f}%)")
    print(f"Val split:   {len(val_df)} samples ({len(val_df)/len(df)*100:.1f}%)")
    print(f"Test split:  {len(test_df)} samples ({len(test_df)/len(df)*100:.1f}%)")

    model = CaneSugarCustomModel(normalization_method="standard")

    print("\nFitting custom mathematical equations on training set...")
    model.fit(train_df)

    y_train = train_df[TARGET_COLUMN].values
    y_val = val_df[TARGET_COLUMN].values
    y_test = test_df[TARGET_COLUMN].values

    train_metrics = model.evaluate(train_df, y_train)
    val_metrics = model.evaluate(val_df, y_val)
    test_metrics = model.evaluate(test_df, y_test)

    test_preds = model.predict(test_df)
    test_metrics["max_error"] = float(np.max(np.abs(y_test - test_preds)))
    val_preds = model.predict(val_df)
    val_metrics["max_error"] = float(np.max(np.abs(y_val - val_preds)))
    train_preds = model.predict(train_df)
    train_metrics["max_error"] = float(np.max(np.abs(y_train - train_preds)))

    print("\n" + "=" * 70)
    print("MODEL EVALUATION RESULTS (STRICT CLOSED-FORM EQUATION)")
    print("=" * 70)
    print(f"{'Split':<12} | {'R²':<8} | {'MAE (Q/A)':<10} | {'RMSE (Q/A)':<12} | {'MAPE (%)':<10} | {'Max Err':<10}")
    print("-" * 70)
    print(f"{'Train':<12} | {train_metrics['r2']:.4f} | {train_metrics['mae']:.2f}     | {train_metrics['rmse']:.2f}       | {train_metrics['mape']:.2f}%     | {train_metrics['max_error']:.2f}")
    print(f"{'Validation':<12} | {val_metrics['r2']:.4f} | {val_metrics['mae']:.2f}     | {val_metrics['rmse']:.2f}       | {val_metrics['mape']:.2f}%     | {val_metrics['max_error']:.2f}")
    print(f"{'Test':<12} | {test_metrics['r2']:.4f} | {test_metrics['mae']:.2f}     | {test_metrics['rmse']:.2f}       | {test_metrics['mape']:.2f}%     | {test_metrics['max_error']:.2f}")
    print("=" * 70)

    sample_expl = model.explain(test_df.iloc[:3])
    print("\nSAMPLE PREDICTION EXPLANATIONS (TEST SET):")
    for i, expl in enumerate(sample_expl):
        actual = y_test[i]
        print(f"\n[Sample {i+1}] Actual: {actual:.1f} Q/A | Predicted: {expl['predicted_yield']} Q/A")
        print(f"  Base Yield:               {expl['base_yield']:>7.2f} Q/A")
        print(f"  + Soil Contribution:      {expl['soil_contribution']:>7.2f} Q/A")
        print(f"  + Nutrient Contribution:  {expl['nutrient_contribution']:>7.2f} Q/A")
        print(f"  + Water Contribution:     {expl['water_contribution']:>7.2f} Q/A")
        print(f"  + Temperature Contrib:    {expl['temperature_contribution']:>7.2f} Q/A")
        print(f"  + Crop Biometrics Contrib:{expl['crop_contribution']:>7.2f} Q/A")
        print(f"  + Interaction Effects:    {expl['interaction_contribution']:>7.2f} Q/A")
        print(f"  - Stress Penalty:         {expl['stress_penalty']:>7.2f} Q/A")
        recon = (expl['base_yield'] + expl['soil_contribution'] + expl['nutrient_contribution'] +
                 expl['water_contribution'] + expl['temperature_contribution'] +
                 expl['crop_contribution'] + expl['interaction_contribution'] - expl['stress_penalty'])
        print(f"  Mathematical Sum Check:   {recon:>7.2f} Q/A (Diff: {abs(recon - expl['predicted_yield']):.4f})")

    print(f"\nSaving artifacts to {artifacts_dir}...")
    os.makedirs(artifacts_dir, exist_ok=True)
    model.save_artifacts(artifacts_dir)

    metrics_dict = {
        "train": train_metrics,
        "validation": val_metrics,
        "test": test_metrics,
        "random_state": random_state,
        "train_samples": len(train_df),
        "val_samples": len(val_df),
        "test_samples": len(test_df),
        "target_mean": float(np.mean(y_train)),
        "target_std": float(np.std(y_train)),
    }
    metrics_path = os.path.join(artifacts_dir, "metrics.json")
    with open(metrics_path, "w") as f:
        json.dump(metrics_dict, f, indent=2)
    print(f"Metrics persisted to: {metrics_path}")

    print("\nTOP 10 LEARNED MATHEMATICAL COEFFICIENTS (MAGNITUDE):")
    sorted_weights = sorted(model.parameters.feature_weights.items(), key=lambda x: abs(x[1]), reverse=True)
    for name, w in sorted_weights[:15]:
        group = model.feature_groups.get(name, "unknown")
        print(f"  {name:<35} [{group:<12}] : {w:>+8.4f}")

    return {
        "model": model,
        "train_metrics": train_metrics,
        "val_metrics": val_metrics,
        "test_metrics": test_metrics,
    }

if __name__ == "__main__":
    run_training()

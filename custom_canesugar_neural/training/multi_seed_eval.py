import os
import sys
import json
import torch
import numpy as np
import pandas as pd
from torch.utils.data import DataLoader
from sklearn.model_selection import train_test_split

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from custom_canesugar_neural.config.neural_config import (
    TARGET_COLUMN,
    SEEDS,
    DEFAULT_HYPERPARAMS
)
from custom_canesugar_neural.data.preprocessor import (
    TabularNeuralPreprocessor,
    CaneSugarDataset
)
from custom_canesugar_neural.model.architecture import CaneSugarNeuralNet
from custom_canesugar_neural.training.trainer import NeuralTrainer

def run_multi_seed_benchmarks(
    dataset_path: str = "sgcheck/backend/DataSet/FINAL_SUGARCANE_DATASET.csv",
    output_json: str = "sgcheck/backend/models/cane_sugar_neural_multiseed.json",
    seeds: list = None
) -> dict:
    seeds = seeds or SEEDS
    df = pd.read_csv(dataset_path)
    
    results_by_seed = []
    
    print("=" * 80)
    print("CANESUGAR NEURAL v1 — MULTI-SEED REPRODUCIBILITY BENCHMARKS")
    print(f"Evaluating across {len(seeds)} independent seeds: {seeds}")
    print("=" * 80)

    for seed in seeds:
        torch.manual_seed(seed)
        np.random.seed(seed)

        train_val_df, test_df = train_test_split(df, test_size=0.15, random_state=seed)
        val_relative_size = 0.15 / 0.85
        train_df, val_df = train_test_split(train_val_df, test_size=val_relative_size, random_state=seed)

        preprocessor = TabularNeuralPreprocessor()
        preprocessor.fit(train_df)

        x_num_train, x_cat_train, y_train = preprocessor.transform(train_df)
        x_num_val, x_cat_val, y_val = preprocessor.transform(val_df)
        x_num_test, x_cat_test, y_test = preprocessor.transform(test_df)

        train_loader = DataLoader(
            CaneSugarDataset(x_num_train, x_cat_train, y_train),
            batch_size=DEFAULT_HYPERPARAMS["batch_size"],
            shuffle=True
        )
        val_loader = DataLoader(
            CaneSugarDataset(x_num_val, x_cat_val, y_val),
            batch_size=DEFAULT_HYPERPARAMS["batch_size"],
            shuffle=False
        )
        test_loader = DataLoader(
            CaneSugarDataset(x_num_test, x_cat_test, y_test),
            batch_size=DEFAULT_HYPERPARAMS["batch_size"],
            shuffle=False
        )

        model = CaneSugarNeuralNet(
            num_numerical_features=len(preprocessor.numerical_cols),
            embedding_cardinalities=preprocessor.embedding_cardinalities,
            activation=DEFAULT_HYPERPARAMS["activation"]
        )

        trainer = NeuralTrainer(
            model=model,
            learning_rate=DEFAULT_HYPERPARAMS["learning_rate"],
            weight_decay=DEFAULT_HYPERPARAMS["weight_decay"],
            loss_fn=DEFAULT_HYPERPARAMS["loss_fn"]
        )

        trainer.fit(
            train_loader=train_loader,
            val_loader=val_loader,
            max_epochs=DEFAULT_HYPERPARAMS["max_epochs"],
            patience=DEFAULT_HYPERPARAMS["patience"],
            warmup_epochs=DEFAULT_HYPERPARAMS["warmup_epochs"],
            verbose=False
        )

        train_eval = trainer.evaluate(train_loader)
        val_eval = trainer.evaluate(val_loader)
        test_eval = trainer.evaluate(test_loader)

        record = {
            "seed": seed,
            "train_r2": float(round(train_eval["r2"], 4)),
            "val_r2": float(round(val_eval["r2"], 4)),
            "test_r2": float(round(test_eval["r2"], 4)),
            "test_mae": float(round(test_eval["mae"], 2)),
            "test_rmse": float(round(test_eval["rmse"], 2)),
            "test_mape": float(round(test_eval["mape"], 2)),
        }
        results_by_seed.append(record)
        print(f"Seed {seed:4d} -> Test R2: {record['test_r2']:.4f} | MAE: {record['test_mae']:.2f} Q/A | RMSE: {record['test_rmse']:.2f} Q/A")

    test_r2_vals = [r["test_r2"] for r in results_by_seed]
    test_mae_vals = [r["test_mae"] for r in results_by_seed]
    test_rmse_vals = [r["test_rmse"] for r in results_by_seed]
    test_mape_vals = [r["test_mape"] for r in results_by_seed]

    summary = {
        "seeds_evaluated": seeds,
        "results_by_seed": results_by_seed,
        "mean_test_r2": float(round(np.mean(test_r2_vals), 4)),
        "std_test_r2": float(round(np.std(test_r2_vals), 4)),
        "max_test_r2": float(round(np.max(test_r2_vals), 4)),
        "mean_test_mae": float(round(np.mean(test_mae_vals), 2)),
        "std_test_mae": float(round(np.std(test_mae_vals), 2)),
        "mean_test_rmse": float(round(np.mean(test_rmse_vals), 2)),
        "mean_test_mape": float(round(np.mean(test_mape_vals), 2)),
    }

    print("-" * 80)
    print(f"MULTI-SEED SUMMARY: Mean R2 = {summary['mean_test_r2']:.4f} +/- {summary['std_test_r2']:.4f} (Peak: {summary['max_test_r2']:.4f})")
    print(f"                   Mean MAE = {summary['mean_test_mae']:.2f} +/- {summary['std_test_mae']:.2f} Q/A")
    print(f"                   Mean RMSE = {summary['mean_test_rmse']:.2f} Q/A | Mean MAPE = {summary['mean_test_mape']:.2f}%")
    print("-" * 80)

    os.makedirs(os.path.dirname(output_json), exist_ok=True)
    with open(output_json, "w", encoding="utf-8") as f:
        json.dump(summary, f, indent=2)

    return summary

if __name__ == "__main__":
    run_multi_seed_benchmarks()

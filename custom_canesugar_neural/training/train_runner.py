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

def train_canesugar_neural(
    dataset_path: str = "sgcheck/backend/DataSet/FINAL_SUGARCANE_DATASET.csv",
    artifacts_dir: str = "sgcheck/backend/models",
    random_state: int = 42,
    hyperparams: dict = None
) -> dict:
    hp = {**DEFAULT_HYPERPARAMS, **(hyperparams or {})}
    
    print("=" * 75)
    print("CANESUGAR NEURAL v1 — CUSTOM DEEP LEARNING MODEL TRAINING PIPELINE")
    print("=" * 75)
    print(f"Random Seed: {random_state} | Batch Size: {hp['batch_size']} | LR: {hp['learning_rate']}")
    
    df = pd.read_csv(dataset_path)
    if TARGET_COLUMN not in df.columns:
        raise ValueError(f"Target column '{TARGET_COLUMN}' missing from dataset.")

    torch.manual_seed(random_state)
    np.random.seed(random_state)

    train_val_df, test_df = train_test_split(df, test_size=0.15, random_state=random_state)
    val_relative_size = 0.15 / 0.85
    train_df, val_df = train_test_split(train_val_df, test_size=val_relative_size, random_state=random_state)
    
    print(f"Split Summary: Train={len(train_df)} plots, Val={len(val_df)} plots, Test={len(test_df)} plots")

    preprocessor = TabularNeuralPreprocessor()
    preprocessor.fit(train_df)
    
    x_num_train, x_cat_train, y_train = preprocessor.transform(train_df)
    x_num_val, x_cat_val, y_val = preprocessor.transform(val_df)
    x_num_test, x_cat_test, y_test = preprocessor.transform(test_df)

    train_dataset = CaneSugarDataset(x_num_train, x_cat_train, y_train)
    val_dataset = CaneSugarDataset(x_num_val, x_cat_val, y_val)
    test_dataset = CaneSugarDataset(x_num_test, x_cat_test, y_test)

    train_loader = DataLoader(train_dataset, batch_size=hp["batch_size"], shuffle=True)
    val_loader = DataLoader(val_dataset, batch_size=hp["batch_size"], shuffle=False)
    test_loader = DataLoader(test_dataset, batch_size=hp["batch_size"], shuffle=False)

    model = CaneSugarNeuralNet(
        num_numerical_features=len(preprocessor.numerical_cols),
        embedding_cardinalities=preprocessor.embedding_cardinalities,
        dense1_dim=hp["dense1_dim"],
        dense2_dim=hp["dense2_dim"],
        dense3_dim=hp["dense3_dim"],
        dense4_dim=hp["dense4_dim"],
        dropout_p1=hp["dropout_p1"],
        dropout_p2=hp["dropout_p2"],
        activation=hp["activation"]
    )

    trainer = NeuralTrainer(
        model=model,
        learning_rate=hp["learning_rate"],
        weight_decay=hp["weight_decay"],
        loss_fn=hp["loss_fn"],
        huber_delta=hp["huber_delta"]
    )

    train_res = trainer.fit(
        train_loader=train_loader,
        val_loader=val_loader,
        max_epochs=hp["max_epochs"],
        patience=hp["patience"],
        warmup_epochs=hp["warmup_epochs"]
    )

    train_metrics = trainer.evaluate(train_loader)
    val_metrics = trainer.evaluate(val_loader)
    test_metrics = trainer.evaluate(test_loader)

    print("-" * 75)
    print("FINAL EVALUATION METRICS:")
    print(f"  Train R2: {train_metrics['r2']:.4f} | MAE: {train_metrics['mae']:.2f} Q/A | RMSE: {train_metrics['rmse']:.2f} Q/A")
    print(f"  Val   R2: {val_metrics['r2']:.4f} | MAE: {val_metrics['mae']:.2f} Q/A | RMSE: {val_metrics['rmse']:.2f} Q/A")
    print(f"  Test  R2: {test_metrics['r2']:.4f} | MAE: {test_metrics['mae']:.2f} Q/A | RMSE: {test_metrics['rmse']:.2f} Q/A | MAPE: {test_metrics['mape']:.2f}%")
    print("-" * 75)

    os.makedirs(artifacts_dir, exist_ok=True)
    model_pt_path = os.path.join(artifacts_dir, "cane_sugar_neural_v1.pt")
    scaler_path = os.path.join(artifacts_dir, "cane_sugar_neural_scaler.joblib")
    embeddings_path = os.path.join(artifacts_dir, "cane_sugar_neural_embeddings.json")
    features_path = os.path.join(artifacts_dir, "cane_sugar_neural_features.json")
    metrics_path = os.path.join(artifacts_dir, "cane_sugar_neural_metrics.json")
    config_path = os.path.join(artifacts_dir, "cane_sugar_neural_config.json")

    torch.save(model.state_dict(), model_pt_path)
    preprocessor.save_artifacts(scaler_path, embeddings_path, features_path)

    metrics_dict = {
        "train": {
            "r2": float(round(train_metrics["r2"], 4)),
            "mae": float(round(train_metrics["mae"], 2)),
            "rmse": float(round(train_metrics["rmse"], 2)),
            "mape": float(round(train_metrics["mape"], 2)),
        },
        "val": {
            "r2": float(round(val_metrics["r2"], 4)),
            "mae": float(round(val_metrics["mae"], 2)),
            "rmse": float(round(val_metrics["rmse"], 2)),
            "mape": float(round(val_metrics["mape"], 2)),
        },
        "test": {
            "r2": float(round(test_metrics["r2"], 4)),
            "mae": float(round(test_metrics["mae"], 2)),
            "rmse": float(round(test_metrics["rmse"], 2)),
            "mape": float(round(test_metrics["mape"], 2)),
            "max_error": float(round(test_metrics["max_error"], 2)),
            "mean_bias": float(round(test_metrics["mean_bias"], 2)),
        },
        "architecture": "CaneSugar Neural v1 (Entity Embeddings + Residual Skip Projection)",
        "framework": "PyTorch"
    }

    with open(metrics_path, "w", encoding="utf-8") as f:
        json.dump(metrics_dict, f, indent=2)

    with open(config_path, "w", encoding="utf-8") as f:
        json.dump(hp, f, indent=2)

    print("Artifacts saved successfully to:", artifacts_dir)

    return {
        "model": model,
        "preprocessor": preprocessor,
        "train_metrics": train_metrics,
        "val_metrics": val_metrics,
        "test_metrics": test_metrics,
        "history": train_res["history"],
        "paths": {
            "model": model_pt_path,
            "scaler": scaler_path,
            "embeddings": embeddings_path,
            "features": features_path,
            "metrics": metrics_path,
            "config": config_path
        }
    }

if __name__ == "__main__":
    train_canesugar_neural()

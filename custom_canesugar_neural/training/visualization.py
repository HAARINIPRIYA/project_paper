import os
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np

def generate_training_plots(
    history: dict,
    y_true: np.ndarray,
    y_pred: np.ndarray,
    top_features: list,
    output_dir: str = "sgcheck/backend/models"
):
    os.makedirs(output_dir, exist_ok=True)

    fig, ax1 = plt.subplots(figsize=(8, 5))
    epochs = range(1, len(history["train_loss"]) + 1)
    ax1.plot(epochs, history["train_loss"], label="Train Huber Loss", color="#2563eb", lw=2)
    ax1.plot(epochs, history["val_loss"], label="Val Huber Loss", color="#dc2626", lw=2)
    ax1.set_xlabel("Epoch")
    ax1.set_ylabel("Huber Loss")
    ax1.set_title("CaneSugar Neural v1 — Training & Validation Learning Curves")
    ax1.grid(True, alpha=0.3)
    ax1.legend()
    plt.tight_layout()
    loss_path = os.path.join(output_dir, "neural_learning_curves.png")
    fig.savefig(loss_path, dpi=150)
    plt.close(fig)

    fig, ax = plt.subplots(figsize=(7, 7))
    ax.scatter(y_true, y_pred, alpha=0.6, edgecolors="none", color="#059669", s=30)
    min_val = min(float(np.min(y_true)), float(np.min(y_pred)))
    max_val = max(float(np.max(y_true)), float(np.max(y_pred)))
    ax.plot([min_val, max_val], [min_val, max_val], color="#dc2626", linestyle="--", lw=2, label="Perfect 1:1 Identity")
    ax.set_xlabel("Actual Harvest Yield (Quintal/Acre)")
    ax.set_ylabel("CaneSugar Neural v1 Predicted Yield (Quintal/Acre)")
    ax.set_title("Actual vs. Predicted Yield on Held-Out Test Plots")
    ax.grid(True, alpha=0.3)
    ax.legend()
    plt.tight_layout()
    pred_path = os.path.join(output_dir, "neural_actual_vs_predicted.png")
    fig.savefig(pred_path, dpi=150)
    plt.close(fig)

    residuals = y_pred - y_true
    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(12, 5))
    ax1.scatter(y_pred, residuals, alpha=0.5, color="#6366f1", s=25)
    ax1.axhline(0, color="#dc2626", linestyle="--", lw=1.5)
    ax1.set_xlabel("Predicted Yield (Quintal/Acre)")
    ax1.set_ylabel("Residual (Pred - Actual)")
    ax1.set_title("Residual Error vs. Predicted")
    ax1.grid(True, alpha=0.3)

    ax2.hist(residuals, bins=30, color="#8b5cf6", edgecolor="black", alpha=0.7, density=True)
    ax2.axvline(0, color="#dc2626", linestyle="--", lw=1.5)
    ax2.set_xlabel("Residual (Quintal/Acre)")
    ax2.set_ylabel("Density")
    ax2.set_title("Residual Error Distribution")
    ax2.grid(True, alpha=0.3)
    plt.tight_layout()
    res_path = os.path.join(output_dir, "neural_residuals_distribution.png")
    fig.savefig(res_path, dpi=150)
    plt.close(fig)

    if top_features:
        fig, ax = plt.subplots(figsize=(8, 5))
        names = [f["factor"] for f in reversed(top_features)]
        scores = [f["raw_score"] for f in reversed(top_features)]
        colors = ["#10b981" if s >= 0 else "#ef4444" for s in scores]
        ax.barh(names, scores, color=colors, alpha=0.85)
        ax.axvline(0, color="gray", linestyle="-", lw=1)
        ax.set_xlabel("Integrated Gradients Attribution Score")
        ax.set_title("Top Agronomic Drivers (Neural Feature Attribution)")
        ax.grid(True, alpha=0.3, axis="x")
        plt.tight_layout()
        feat_path = os.path.join(output_dir, "neural_feature_importance.png")
        fig.savefig(feat_path, dpi=150)
        plt.close(fig)

    return {
        "loss_curve": loss_path,
        "prediction_scatter": pred_path,
        "residuals": res_path,
        "feature_importance": feat_path if top_features else None
    }

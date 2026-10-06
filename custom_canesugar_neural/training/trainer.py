import os
import copy
import numpy as np
import torch
import torch.nn as nn
from torch.utils.data import DataLoader
from sklearn.metrics import r2_score, mean_absolute_error, mean_squared_error
from typing import Dict, Any, Tuple, Optional

from custom_canesugar_neural.model.architecture import CaneSugarNeuralNet
from custom_canesugar_neural.data.preprocessor import CaneSugarDataset

class NeuralTrainer:
    def __init__(
        self,
        model: CaneSugarNeuralNet,
        learning_rate: float = 0.001,
        weight_decay: float = 1e-4,
        loss_fn: str = "huber",
        huber_delta: float = 1.0,
        device: Optional[str] = None
    ):
        self.device = torch.device(device or ("cuda" if torch.cuda.is_available() else "cpu"))
        self.model = model.to(self.device)
        self.learning_rate = learning_rate
        self.weight_decay = weight_decay
        
        if loss_fn.lower() == "mse":
            self.criterion = nn.MSELoss()
        else:
            self.criterion = nn.HuberLoss(delta=huber_delta)
            
        self.optimizer = torch.optim.AdamW(
            self.model.parameters(),
            lr=learning_rate,
            weight_decay=weight_decay
        )
        self.best_model_weights = None
        self.best_val_loss = float("inf")
        self.best_val_r2 = -float("inf")
        self.history: Dict[str, list] = {
            "train_loss": [],
            "val_loss": [],
            "val_r2": [],
            "lr": []
        }

    def train_epoch(self, dataloader: DataLoader) -> float:
        self.model.train()
        total_loss = 0.0
        n_samples = 0
        
        for x_num, x_cat, y in dataloader:
            x_num = x_num.to(self.device)
            x_cat = {k: v.to(self.device) for k, v in x_cat.items()}
            y = y.to(self.device)
            
            self.optimizer.zero_grad()
            preds = self.model(x_num, x_cat)
            loss = self.criterion(preds, y)
            loss.backward()
            
            torch.nn.utils.clip_grad_norm_(self.model.parameters(), max_norm=1.0)
            self.optimizer.step()
            
            total_loss += loss.item() * len(y)
            n_samples += len(y)
            
        return total_loss / max(1, n_samples)

    def evaluate(self, dataloader: DataLoader) -> Dict[str, float]:
        self.model.eval()
        total_loss = 0.0
        n_samples = 0
        all_preds = []
        all_targets = []
        
        with torch.no_grad():
            for x_num, x_cat, y in dataloader:
                x_num = x_num.to(self.device)
                x_cat = {k: v.to(self.device) for k, v in x_cat.items()}
                y = y.to(self.device)
                
                preds = self.model(x_num, x_cat)
                loss = self.criterion(preds, y)
                
                total_loss += loss.item() * len(y)
                n_samples += len(y)
                
                all_preds.extend(preds.cpu().numpy().tolist())
                all_targets.extend(y.cpu().numpy().tolist())
                
        y_true = np.array(all_targets)
        y_pred = np.maximum(0.0, np.array(all_preds))
        
        r2 = float(r2_score(y_true, y_pred))
        mae = float(mean_absolute_error(y_true, y_pred))
        rmse = float(np.sqrt(mean_squared_error(y_true, y_pred)))
        mape = float(np.mean(np.abs((y_true - y_pred) / np.maximum(y_true, 1e-3))) * 100.0)
        max_err = float(np.max(np.abs(y_true - y_pred)))
        mean_bias = float(np.mean(y_pred - y_true))
        
        return {
            "loss": total_loss / max(1, n_samples),
            "r2": r2,
            "mae": mae,
            "rmse": rmse,
            "mape": mape,
            "max_error": max_err,
            "mean_bias": mean_bias,
            "y_true": y_true,
            "y_pred": y_pred
        }

    def fit(
        self,
        train_loader: DataLoader,
        val_loader: DataLoader,
        max_epochs: int = 150,
        patience: int = 20,
        warmup_epochs: int = 5,
        verbose: bool = True
    ) -> Dict[str, Any]:
        scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(
            self.optimizer,
            T_max=max_epochs - warmup_epochs,
            eta_min=1e-6
        )
        
        epochs_no_improve = 0
        self.best_val_loss = float("inf")
        self.best_model_weights = copy.deepcopy(self.model.state_dict())
        
        for epoch in range(1, max_epochs + 1):
            if epoch <= warmup_epochs:
                warmup_lr = self.learning_rate * (epoch / float(warmup_epochs))
                for param_group in self.optimizer.param_groups:
                    param_group["lr"] = warmup_lr

            train_loss = self.train_epoch(train_loader)
            val_metrics = self.evaluate(val_loader)
            val_loss = val_metrics["loss"]
            val_r2 = val_metrics["r2"]
            
            if epoch > warmup_epochs:
                scheduler.step()
                
            curr_lr = self.optimizer.param_groups[0]["lr"]
            self.history["train_loss"].append(train_loss)
            self.history["val_loss"].append(val_loss)
            self.history["val_r2"].append(val_r2)
            self.history["lr"].append(curr_lr)
            
            if val_loss < self.best_val_loss:
                self.best_val_loss = val_loss
                self.best_val_r2 = val_r2
                self.best_model_weights = copy.deepcopy(self.model.state_dict())
                epochs_no_improve = 0
            else:
                epochs_no_improve += 1
                
            if verbose and (epoch % 10 == 0 or epoch == 1 or epochs_no_improve == 0):
                print(f"Epoch {epoch:3d}/{max_epochs} | Train Loss: {train_loss:.4f} | Val Loss: {val_loss:.4f} | Val R2: {val_r2:.4f} | LR: {curr_lr:.6f}")
                
            if epochs_no_improve >= patience:
                if verbose:
                    print(f"Early stopping triggered at epoch {epoch}. Best Val Loss: {self.best_val_loss:.4f}, Best Val R2: {self.best_val_r2:.4f}")
                break
                
        if self.best_model_weights is not None:
            self.model.load_state_dict(self.best_model_weights)
            
        return {
            "best_val_loss": self.best_val_loss,
            "best_val_r2": self.best_val_r2,
            "epochs_trained": epoch,
            "history": self.history
        }

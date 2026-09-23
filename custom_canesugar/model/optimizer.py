"""
CaneSugar Custom Mathematical Model — Optimizer Module
======================================================
Solves for parameters of the custom mathematical yield equation
using regularized numerical optimization on training data.
"""

from typing import Tuple, List, Optional, Dict
import numpy as np
from scipy.optimize import minimize

class RegularizedEquationOptimizer:
    """
    Solves for the linear and non-linear weights of the custom mathematical equation
    via regularized least-squares optimization with L2 shrinkage penalty.
    """

    def __init__(self, alphas: Optional[List[float]] = None):
        self.alphas = alphas or list(np.logspace(-5, 4, 120))
        self.best_alpha: float = 1.0
        self.weights: np.ndarray = np.array([])
        self.intercept: float = 0.0

    def fit(self, X: np.ndarray, y: np.ndarray, cv_splits: int = 5) -> "RegularizedEquationOptimizer":
        """
        Learns parameters (intercept and feature weights) via K-fold cross-validation on X, y.
        """
        N, M = X.shape
        y_mean = float(np.mean(y))
        X_mean = np.mean(X, axis=0)

        X_centered = X - X_mean
        y_centered = y - y_mean

        n_samples = len(X)
        indices = np.arange(n_samples)
        np.random.seed(42)
        np.random.shuffle(indices)
        fold_sizes = np.full(cv_splits, n_samples // cv_splits, dtype=int)
        fold_sizes[: n_samples % cv_splits] += 1

        fold_data = []
        current = 0
        for fold_size in fold_sizes:
            val_idx = indices[current : current + fold_size]
            tr_idx = np.concatenate([indices[:current], indices[current + fold_size :]])
            current += fold_size

            X_tr, y_tr = X_centered[tr_idx], y_centered[tr_idx]
            X_va, y_va = X_centered[val_idx], y_centered[val_idx]
            XtX = np.dot(X_tr.T, X_tr)
            Xty = np.dot(X_tr.T, y_tr)
            fold_data.append((XtX, Xty, X_va, y_va))

        best_mse = float("inf")
        best_alpha = 1.0

        for alpha in self.alphas:
            fold_mses = []
            for XtX, Xty, X_va, y_va in fold_data:
                reg_matrix = XtX + alpha * np.eye(M)
                try:
                    w = np.linalg.solve(reg_matrix, Xty)
                except np.linalg.LinAlgError:
                    w = np.linalg.lstsq(reg_matrix, Xty, rcond=None)[0]

                preds = np.dot(X_va, w)
                mse = float(np.mean((y_va - preds) ** 2))
                fold_mses.append(mse)

            avg_mse = float(np.mean(fold_mses))
            if avg_mse < best_mse:
                best_mse = avg_mse
                best_alpha = alpha

        self.best_alpha = best_alpha

        XtX = np.dot(X_centered.T, X_centered)
        reg_matrix = XtX + self.best_alpha * np.eye(M)
        Xty = np.dot(X_centered.T, y_centered)

        try:
            self.weights = np.linalg.solve(reg_matrix, Xty)
        except np.linalg.LinAlgError:
            self.weights = np.linalg.lstsq(reg_matrix, Xty, rcond=None)[0]

        self.intercept = float(y_mean - np.dot(X_mean, self.weights))
        return self

    def predict(self, X: np.ndarray) -> np.ndarray:
        return self.intercept + np.dot(X, self.weights)

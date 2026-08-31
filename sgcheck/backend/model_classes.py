"""
Model classes for CaneSense.
"""
import numpy as np
import pandas as pd

class CaneSugarStackingModel:
    """Production Stacking Ensemble Model for CaneSugar."""
    def __init__(self, base_models, meta_learner, target_transformer, bias=0.0, features=None):
        self.base_models = base_models  # list of fitted base models
        self.meta_learner = meta_learner  # fitted Ridge/BayesianRidge
        self.target_transformer = target_transformer  # PowerTransformer
        self.bias = bias
        self.features = features or []

    def predict(self, X):
        X_df = X if isinstance(X, pd.DataFrame) else pd.DataFrame(X, columns=self.features)
        if self.features:
            X_df = X_df.reindex(columns=self.features, fill_value=0.0)
            
        base_preds = [m.predict(X_df) for m in self.base_models]
        meta_features = np.column_stack(base_preds)
        meta_pred = self.meta_learner.predict(meta_features)
        
        # Inverse transform to original yield scale
        pred_inv = self.target_transformer.inverse_transform(meta_pred.reshape(-1, 1)).flatten()
        # Apply bias correction
        final_preds = pred_inv + self.bias
        return final_preds

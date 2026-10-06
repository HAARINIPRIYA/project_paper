import torch
import numpy as np
from typing import Dict, Tuple

class MonteCarloDropoutEstimator:
    def __init__(self, model: torch.nn.Module, n_samples: int = 50):
        self.model = model
        self.n_samples = n_samples

    def _enable_dropout(self):
        for m in self.model.modules():
            if isinstance(m, torch.nn.Dropout):
                m.train()

    def estimate_uncertainty(
        self,
        x_num: torch.Tensor,
        x_cat: Dict[str, torch.Tensor]
    ) -> Dict[str, np.ndarray]:
        self.model.eval()
        self._enable_dropout()
        
        preds_list = []
        with torch.no_grad():
            for _ in range(self.n_samples):
                out = self.model(x_num, x_cat)
                preds_list.append(out.cpu().numpy())
                
        preds_arr = np.stack(preds_list, axis=0)
        mean_pred = np.mean(preds_arr, axis=0)
        std_pred = np.std(preds_arr, axis=0)
        
        ci_lower = np.maximum(0.0, mean_pred - 1.96 * std_pred)
        ci_upper = mean_pred + 1.96 * std_pred
        
        self.model.eval()
        
        return {
            "mean": mean_pred,
            "uncertainty": std_pred,
            "ci_lower": ci_lower,
            "ci_upper": ci_upper,
            "samples": preds_arr
        }

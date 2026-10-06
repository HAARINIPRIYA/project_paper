import torch
import numpy as np
from typing import Dict, List, Tuple

class NeuralExplainer:
    def __init__(
        self,
        model: torch.nn.Module,
        numerical_feature_names: List[str],
        categorical_feature_names: List[str],
        n_steps: int = 30
    ):
        self.model = model
        self.num_names = numerical_feature_names
        self.cat_names = categorical_feature_names
        self.n_steps = n_steps

    def explain_instance(
        self,
        x_num: torch.Tensor,
        x_cat: Dict[str, torch.Tensor],
        top_k: int = 6
    ) -> List[Dict[str, any]]:
        self.model.eval()
        
        if x_num.dim() == 1:
            x_num = x_num.unsqueeze(0)
            x_cat = {k: v.unsqueeze(0) if v.dim() == 0 else v for k, v in x_cat.items()}

        x_num_norm = self.model.num_layer_norm(x_num)
        emb_list = [self.model.embeddings[col](x_cat[col]) for col in self.model.embedding_keys]
        x_emb = torch.cat(emb_list, dim=-1)
        x_fused = torch.cat([x_num_norm, x_emb], dim=-1).detach().clone().requires_grad_(True)
        
        baseline_fused = torch.zeros_like(x_fused)
        
        grads = []
        for step in range(1, self.n_steps + 1):
            alpha = float(step) / float(self.n_steps)
            interpolated = baseline_fused + alpha * (x_fused - baseline_fused)
            interpolated = interpolated.detach().clone().requires_grad_(True)
            out = self.model.forward_fused(interpolated)
            out.backward(torch.ones_like(out))
            grads.append(interpolated.grad.detach().cpu().numpy())
            
        avg_grads = np.mean(np.stack(grads, axis=0), axis=0)[0]
        diff = (x_fused - baseline_fused).detach().cpu().numpy()[0]
        attributions = avg_grads * diff
        
        feature_scores = {}
        for i, name in enumerate(self.num_names):
            if i < len(attributions):
                feature_scores[name] = float(attributions[i])
                
        curr_idx = len(self.num_names)
        for col in self.model.embedding_keys:
            emb_dim = self.model.embeddings[col].embedding_dim
            slice_attr = attributions[curr_idx : curr_idx + emb_dim]
            score = float(np.sum(slice_attr))
            feature_scores[col] = score
            curr_idx += emb_dim

        sorted_features = sorted(feature_scores.items(), key=lambda x: abs(x[1]), reverse=True)
        
        total_abs = sum(abs(v) for _, v in sorted_features) or 1.0
        
        top_factors = []
        for feat_name, score in sorted_features[:top_k]:
            pct = round((abs(score) / total_abs) * 100.0, 1)
            sign = "+" if score >= 0 else "-"
            top_factors.append({
                "factor": feat_name.replace("_", " "),
                "raw_score": round(score, 4),
                "impact": f"{sign}{pct}%",
                "positive": score >= 0
            })
            
        return top_factors

import torch
import torch.nn as nn
from typing import Dict, Tuple, List, Optional

class CaneSugarNeuralNet(nn.Module):
    def __init__(
        self,
        num_numerical_features: int,
        embedding_cardinalities: Dict[str, Tuple[int, int]],
        dense1_dim: int = 256,
        dense2_dim: int = 128,
        dense3_dim: int = 64,
        dense4_dim: int = 32,
        dropout_p1: float = 0.20,
        dropout_p2: float = 0.15,
        activation: str = "gelu"
    ):
        super().__init__()
        self.num_numerical_features = num_numerical_features
        self.embedding_keys = list(embedding_cardinalities.keys())
        
        self.num_layer_norm = nn.LayerNorm(num_numerical_features)
        
        self.embeddings = nn.ModuleDict({
            col: nn.Embedding(num_embeddings=card[0], embedding_dim=card[1])
            for col, card in embedding_cardinalities.items()
        })
        
        total_emb_dim = sum(card[1] for card in embedding_cardinalities.values())
        fusion_dim = num_numerical_features + total_emb_dim
        self.fusion_dim = fusion_dim

        act_lower = activation.lower()
        if act_lower == "silu":
            act_fn = nn.SiLU
        elif act_lower == "relu":
            act_fn = nn.ReLU
        else:
            act_fn = nn.GELU

        self.dense1 = nn.Linear(fusion_dim, dense1_dim)
        self.bn1 = nn.BatchNorm1d(dense1_dim)
        self.act1 = act_fn()
        self.drop1 = nn.Dropout(dropout_p1)

        self.dense2 = nn.Linear(dense1_dim, dense2_dim)
        self.bn2 = nn.BatchNorm1d(dense2_dim)
        self.act2 = act_fn()
        self.drop2 = nn.Dropout(dropout_p2)

        self.dense3 = nn.Linear(dense2_dim, dense3_dim)
        self.act3 = act_fn()

        self.residual_proj = nn.Linear(dense2_dim, dense3_dim)

        self.dense4 = nn.Linear(dense3_dim, dense4_dim)
        self.act4 = act_fn()

        self.reg_head = nn.Linear(dense4_dim, 1)

    def forward(self, x_num: torch.Tensor, x_cat: Dict[str, torch.Tensor]) -> torch.Tensor:
        x_num_norm = self.num_layer_norm(x_num)
        
        emb_list = [self.embeddings[col](x_cat[col]) for col in self.embedding_keys]
        x_emb = torch.cat(emb_list, dim=-1)
        
        x_fused = torch.cat([x_num_norm, x_emb], dim=-1)
        
        h1 = self.drop1(self.act1(self.bn1(self.dense1(x_fused))))
        h2 = self.drop2(self.act2(self.bn2(self.dense2(h1))))
        
        h3 = self.act3(self.dense3(h2))
        res = self.residual_proj(h2)
        h_res = h3 + res
        
        h4 = self.act4(self.dense4(h_res))
        out = self.reg_head(h4)
        return out.squeeze(-1)

    def forward_fused(self, x_fused: torch.Tensor) -> torch.Tensor:
        h1 = self.drop1(self.act1(self.bn1(self.dense1(x_fused))))
        h2 = self.drop2(self.act2(self.bn2(self.dense2(h1))))
        h3 = self.act3(self.dense3(h2))
        res = self.residual_proj(h2)
        h_res = h3 + res
        h4 = self.act4(self.dense4(h_res))
        out = self.reg_head(h4)
        return out.squeeze(-1)

import json
import joblib
import numpy as np
import pandas as pd
import torch
from torch.utils.data import Dataset
from typing import Dict, List, Tuple, Optional
from sklearn.preprocessing import StandardScaler

from custom_canesugar_neural.config.neural_config import (
    TARGET_COLUMN,
    LEAKAGE_COLUMNS,
    CATEGORICAL_EMBEDDINGS,
)
from custom_canesugar_neural.data.feature_engineering import engineer_agronomic_features

class CaneSugarDataset(Dataset):
    def __init__(
        self,
        x_num: np.ndarray,
        x_cat: Dict[str, np.ndarray],
        y: Optional[np.ndarray] = None
    ):
        self.x_num = torch.tensor(x_num, dtype=torch.float32)
        self.x_cat = {
            k: torch.tensor(v, dtype=torch.long)
            for k, v in x_cat.items()
        }
        self.y = torch.tensor(y, dtype=torch.float32) if y is not None else None

    def __len__(self):
        return len(self.x_num)

    def __getitem__(self, idx):
        cat_sample = {k: self.x_cat[k][idx] for k in self.x_cat}
        if self.y is not None:
            return self.x_num[idx], cat_sample, self.y[idx]
        return self.x_num[idx], cat_sample

class TabularNeuralPreprocessor:
    def __init__(self, cat_embedding_dims: Optional[Dict[str, int]] = None):
        self.cat_embedding_dims = cat_embedding_dims or CATEGORICAL_EMBEDDINGS
        self.numerical_cols: List[str] = []
        self.categorical_cols: List[str] = list(self.cat_embedding_dims.keys())
        self.vocab_maps: Dict[str, Dict[str, int]] = {}
        self.embedding_cardinalities: Dict[str, Tuple[int, int]] = {}
        self.num_imputer_medians: Dict[str, float] = {}
        self.scaler = StandardScaler()
        self.is_fitted = False

    def fit(self, df: pd.DataFrame):
        df_feat = engineer_agronomic_features(df)
        
        drop_cols = list(set(LEAKAGE_COLUMNS + [TARGET_COLUMN]))
        df_clean = df_feat.drop(columns=[c for c in drop_cols if c in df_feat.columns], errors="ignore")
        
        self.vocab_maps = {}
        self.embedding_cardinalities = {}
        for col, emb_dim in self.cat_embedding_dims.items():
            if col in df_clean.columns:
                unique_vals = sorted(df_clean[col].dropna().astype(str).unique().tolist())
                vocab = {"<unk>": 0}
                for i, val in enumerate(unique_vals, start=1):
                    vocab[val] = i
                self.vocab_maps[col] = vocab
                num_classes = len(vocab)
                self.embedding_cardinalities[col] = (num_classes, emb_dim)
            else:
                self.vocab_maps[col] = {"<unk>": 0}
                self.embedding_cardinalities[col] = (1, emb_dim)

        num_candidates = df_clean.select_dtypes(include=[np.number]).columns.tolist()
        self.numerical_cols = [c for c in num_candidates if c not in self.cat_embedding_dims]
        
        self.num_imputer_medians = {}
        for col in self.numerical_cols:
            med = float(df_clean[col].median()) if not df_clean[col].dropna().empty else 0.0
            if np.isnan(med):
                med = 0.0
            self.num_imputer_medians[col] = med

        df_num = df_clean[self.numerical_cols].copy()
        for col in self.numerical_cols:
            df_num[col] = df_num[col].fillna(self.num_imputer_medians[col])
            
        self.scaler.fit(df_num.values)
        self.is_fitted = True
        return self

    def transform(self, df: pd.DataFrame) -> Tuple[np.ndarray, Dict[str, np.ndarray], Optional[np.ndarray]]:
        if not self.is_fitted:
            raise RuntimeError("Preprocessor must be fitted before transforming.")
            
        df_feat = engineer_agronomic_features(df)
        
        y = None
        if TARGET_COLUMN in df_feat.columns:
            y = df_feat[TARGET_COLUMN].values.astype(np.float32)

        df_num = pd.DataFrame(index=df_feat.index)
        for col in self.numerical_cols:
            if col in df_feat.columns:
                series = pd.to_numeric(df_feat[col], errors="coerce")
                df_num[col] = series.fillna(self.num_imputer_medians[col])
            else:
                df_num[col] = self.num_imputer_medians[col]

        x_num = self.scaler.transform(df_num.values).astype(np.float32)

        x_cat = {}
        for col in self.categorical_cols:
            vocab = self.vocab_maps.get(col, {"<unk>": 0})
            if col in df_feat.columns:
                col_vals = df_feat[col].fillna("<unk>").astype(str)
                encoded = col_vals.map(lambda v: vocab.get(v, 0)).values.astype(np.int64)
            else:
                encoded = np.zeros(len(df_feat), dtype=np.int64)
            x_cat[col] = encoded

        return x_num, x_cat, y

    def fit_transform(self, df: pd.DataFrame) -> Tuple[np.ndarray, Dict[str, np.ndarray], Optional[np.ndarray]]:
        return self.fit(df).transform(df)

    def save_artifacts(
        self,
        scaler_path: str,
        embeddings_json_path: str,
        features_json_path: str
    ):
        joblib.dump({
            "scaler": self.scaler,
            "medians": self.num_imputer_medians
        }, scaler_path)
        
        with open(embeddings_json_path, "w", encoding="utf-8") as f:
            json.dump({
                "vocab_maps": self.vocab_maps,
                "cardinalities": self.embedding_cardinalities
            }, f, indent=2)

        with open(features_json_path, "w", encoding="utf-8") as f:
            json.dump({
                "numerical_features": self.numerical_cols,
                "categorical_features": self.categorical_cols
            }, f, indent=2)

    @classmethod
    def load_artifacts(
        cls,
        scaler_path: str,
        embeddings_json_path: str,
        features_json_path: str
    ):
        instance = cls()
        saved_scaler = joblib.load(scaler_path)
        instance.scaler = saved_scaler["scaler"]
        instance.num_imputer_medians = saved_scaler["medians"]
        
        with open(embeddings_json_path, "r", encoding="utf-8") as f:
            emb_data = json.load(f)
            instance.vocab_maps = emb_data["vocab_maps"]
            instance.embedding_cardinalities = {
                k: (v[0], v[1]) for k, v in emb_data["cardinalities"].items()
            }
            
        with open(features_json_path, "r", encoding="utf-8") as f:
            feat_data = json.load(f)
            instance.numerical_cols = feat_data["numerical_features"]
            instance.categorical_cols = feat_data["categorical_features"]
            
        instance.is_fitted = True
        return instance

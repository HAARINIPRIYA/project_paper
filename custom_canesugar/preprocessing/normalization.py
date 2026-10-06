"""
CaneSugar Custom Mathematical Model — Normalization Module
===========================================================
Computes and applies mathematically grounded normalization parameters.
All parameters (median, IQR, mean, std, min, max, imputation values,
and categorical mappings) are learned strictly from the training dataset.
"""

import json
from typing import Dict, Any, List, Optional
import numpy as np
import pandas as pd

from ..config.feature_config import TARGET_COLUMN, LEAKAGE_COLUMNS, DATE_COLUMNS

class AgronomicNormalizer:
    """
    Mathematical normalizer that stores train-time parameters
    and applies identical deterministic transformations at inference.
    """

    def __init__(self, method: str = "standard"):
        """
        method: 'standard' (z-score: (x-mean)/std),
                'minmax' ((x-min)/(max-min)),
                or 'robust' ((x-median)/IQR)
        """
        self.method = method
        self.is_fitted = False
        self.numeric_cols: List[str] = []
        self.categorical_cols: List[str] = []
        self.params: Dict[str, Dict[str, float]] = {}
        self.imputation_values: Dict[str, Any] = {}
        self.categorical_dummies: List[str] = []

    def fit(self, df: pd.DataFrame) -> "AgronomicNormalizer":
        data = df.copy()

        cols_to_drop = [c for c in LEAKAGE_COLUMNS if c in data.columns]
        if TARGET_COLUMN in data.columns:
            cols_to_drop.append(TARGET_COLUMN)
        data = data.drop(columns=cols_to_drop, errors="ignore")

        if "Planting_Date" in data.columns and "Harvesting_Date" in data.columns:
            p_date = pd.to_datetime(data["Planting_Date"], errors="coerce")
            h_date = pd.to_datetime(data["Harvesting_Date"], errors="coerce")
            dur = (h_date - p_date).dt.days
            if "Crop_Duration_Days" in data.columns:
                data["Crop_Duration_Days"] = data["Crop_Duration_Days"].fillna(dur)
            else:
                data["Crop_Duration_Days"] = dur
        data = data.drop(columns=[c for c in DATE_COLUMNS if c in data.columns], errors="ignore")

        self.numeric_cols = [c for c in data.select_dtypes(include=[np.number]).columns]
        self.categorical_cols = [c for c in data.select_dtypes(include=["object"]).columns]

        for col in self.numeric_cols:
            med = float(data[col].median()) if not data[col].dropna().empty else 0.0
            self.imputation_values[col] = med

        for col in self.categorical_cols:
            mode_vals = data[col].dropna().mode()
            mode_val = str(mode_vals.iloc[0]) if len(mode_vals) > 0 else "Unknown"
            self.imputation_values[col] = mode_val

        filled_num = data[self.numeric_cols].copy()
        for col in self.numeric_cols:
            filled_num[col] = filled_num[col].fillna(self.imputation_values[col])

        for col in self.numeric_cols:
            series = filled_num[col].values
            mean_val = float(np.mean(series))
            std_val = float(np.std(series))
            min_val = float(np.min(series))
            max_val = float(np.max(series))
            med_val = float(np.median(series))
            q25 = float(np.percentile(series, 25))
            q75 = float(np.percentile(series, 75))
            iqr_val = float(q75 - q25)

            self.params[col] = {
                "mean": mean_val,
                "std": std_val if std_val > 1e-7 else 1.0,
                "min": min_val,
                "max": max_val if (max_val - min_val) > 1e-7 else min_val + 1.0,
                "median": med_val,
                "iqr": iqr_val if iqr_val > 1e-7 else 1.0,
            }

        filled_cat = data[self.categorical_cols].copy()
        for col in self.categorical_cols:
            filled_cat[col] = filled_cat[col].fillna(self.imputation_values[col]).astype(str)
        dummy_df = pd.get_dummies(filled_cat, drop_first=True)
        self.categorical_dummies = list(dummy_df.columns)

        self.is_fitted = True
        return self

    def transform(self, df: pd.DataFrame) -> pd.DataFrame:
        if not self.is_fitted:
            raise RuntimeError("AgronomicNormalizer must be fitted before calling transform().")

        data = df.copy()

        cols_to_drop = [c for c in LEAKAGE_COLUMNS if c in data.columns]
        data = data.drop(columns=cols_to_drop, errors="ignore")

        if "Planting_Date" in data.columns and "Harvesting_Date" in data.columns:
            p_date = pd.to_datetime(data["Planting_Date"], errors="coerce")
            h_date = pd.to_datetime(data["Harvesting_Date"], errors="coerce")
            dur = (h_date - p_date).dt.days
            if "Crop_Duration_Days" in data.columns:
                data["Crop_Duration_Days"] = data["Crop_Duration_Days"].fillna(dur)
            else:
                data["Crop_Duration_Days"] = dur
        data = data.drop(columns=[c for c in DATE_COLUMNS if c in data.columns], errors="ignore")

        norm_dict = {}
        for col in self.numeric_cols:
            val = data[col] if col in data.columns else pd.Series(self.imputation_values[col], index=data.index)
            val = val.fillna(self.imputation_values[col]).astype(float)
            p = self.params[col]

            if self.method == "minmax":
                norm_val = (val - p["min"]) / (p["max"] - p["min"])
            elif self.method == "robust":
                norm_val = (val - p["median"]) / p["iqr"]
            else:
                norm_val = (val - p["mean"]) / p["std"]
            norm_dict[col] = norm_val

        out_df = pd.DataFrame(norm_dict, index=data.index)

        if self.categorical_cols:
            cat_df = pd.DataFrame(index=data.index)
            for col in self.categorical_cols:
                val = data[col] if col in data.columns else pd.Series(self.imputation_values[col], index=data.index)
                cat_df[col] = val.fillna(self.imputation_values[col]).astype(str)
            raw_dummies = pd.get_dummies(cat_df, drop_first=True)
            aligned_dummies = raw_dummies.reindex(columns=self.categorical_dummies, fill_value=0.0).astype(float)
            out_df = pd.concat([out_df, aligned_dummies], axis=1)

        return out_df

    def fit_transform(self, df: pd.DataFrame) -> pd.DataFrame:
        return self.fit(df).transform(df)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "method": self.method,
            "is_fitted": self.is_fitted,
            "numeric_cols": self.numeric_cols,
            "categorical_cols": self.categorical_cols,
            "params": self.params,
            "imputation_values": self.imputation_values,
            "categorical_dummies": self.categorical_dummies,
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "AgronomicNormalizer":
        norm = cls(method=data.get("method", "standard"))
        norm.is_fitted = data.get("is_fitted", True)
        norm.numeric_cols = data.get("numeric_cols", [])
        norm.categorical_cols = data.get("categorical_cols", [])
        norm.params = data.get("params", {})
        norm.imputation_values = data.get("imputation_values", {})
        norm.categorical_dummies = data.get("categorical_dummies", [])
        return norm

    def save_json(self, filepath: str) -> None:
        with open(filepath, "w") as f:
            json.dump(self.to_dict(), f, indent=2)

    @classmethod
    def load_json(cls, filepath: str) -> "AgronomicNormalizer":
        with open(filepath, "r") as f:
            data = json.load(f)
        return cls.from_dict(data)

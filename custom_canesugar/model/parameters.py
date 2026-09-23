"""
CaneSugar Custom Mathematical Model — Parameters Module
========================================================
Defines container, serialization, and constraints for learned mathematical coefficients.
"""

import json
from typing import Dict, Any, List, Optional

class ModelParameters:
    """
    Holds learned mathematical coefficients, base yield intercept,
    and feature group associations for the custom yield equation.
    """

    def __init__(
        self,
        base_yield: float = 280.0,
        feature_weights: Optional[Dict[str, float]] = None,
        feature_groups: Optional[Dict[str, str]] = None,
        regularization_lambda: float = 0.01,
    ):
        self.base_yield = float(base_yield)
        self.feature_weights = feature_weights or {}
        self.feature_groups = feature_groups or {}
        self.regularization_lambda = float(regularization_lambda)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "base_yield": self.base_yield,
            "feature_weights": self.feature_weights,
            "feature_groups": self.feature_groups,
            "regularization_lambda": self.regularization_lambda,
            "total_parameters": len(self.feature_weights) + 1,
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "ModelParameters":
        return cls(
            base_yield=data.get("base_yield", 280.0),
            feature_weights=data.get("feature_weights", {}),
            feature_groups=data.get("feature_groups", {}),
            regularization_lambda=data.get("regularization_lambda", 0.01),
        )

    def save_json(self, filepath: str) -> None:
        with open(filepath, "w") as f:
            json.dump(self.to_dict(), f, indent=2)

    @classmethod
    def load_json(cls, filepath: str) -> "ModelParameters":
        with open(filepath, "r") as f:
            data = json.load(f)
        return cls.from_dict(data)

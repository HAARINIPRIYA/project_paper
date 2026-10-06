"""
CaneSugar Custom Mathematical Model — Main Model Class
======================================================
Custom domain-specific mathematical equation for sugarcane yield prediction.
Predicts Yield_Quintal_per_Acre using an interpretable closed-form equation.
Contains NO black-box ML models, decision trees, or neural networks.
"""

from typing import Dict, Any, List, Union, Optional, Tuple
import json
import numpy as np
import pandas as pd
from sklearn.metrics import r2_score, mean_absolute_error, mean_squared_error

from ..config.feature_config import (
    TARGET_COLUMN,
    LEAKAGE_COLUMNS,
    DATE_COLUMNS,
    SOIL_FEATURES,
    NUTRIENT_FEATURES,
    WATER_FEATURES,
    CLIMATE_FEATURES,
    CROP_FEATURES,
    STRESS_FEATURES,
)
from ..preprocessing.normalization import AgronomicNormalizer
from ..preprocessing.validation import AgronomicValidator
from ..equations.soil import compute_soil_factors
from ..equations.nutrients import compute_nutrient_factors
from ..equations.water import compute_water_factors
from ..equations.temperature import compute_temperature_factors
from ..equations.crop import compute_crop_factors
from ..equations.stress import compute_stress_penalties
from ..equations.interactions import compute_interaction_factors
from .parameters import ModelParameters
from .optimizer import RegularizedEquationOptimizer

class CaneSugarCustomModel:
    """
    Original domain-specific mathematical prediction function for sugarcane yield.
    Represents yield as the sum of Base Yield + Agronomic Components - Stress Penalties:
    Y = Base + Soil + Nutrient + Water + Temperature + Crop + Interactions - Stress
    """

    def __init__(self, normalization_method: str = "standard"):
        self.normalization_method = normalization_method
        self.normalizer = AgronomicNormalizer(method=normalization_method)
        self.validator = AgronomicValidator()
        self.optimizer = RegularizedEquationOptimizer()
        self.parameters = ModelParameters()
        self.feature_names: List[str] = []
        self.feature_groups: Dict[str, str] = {}
        self.is_fitted: bool = False

    def _build_features_dataframe(self, df: pd.DataFrame) -> Tuple[pd.DataFrame, Dict[str, str]]:
        """
        Applies mathematical domain equations to generate feature representation.
        Tags every feature to its agronomic component group.
        """
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

        soil_df = compute_soil_factors(data)
        nut_df = compute_nutrient_factors(data)
        water_df = compute_water_factors(data)
        temp_df = compute_temperature_factors(data)
        crop_df = compute_crop_factors(data)
        stress_df = compute_stress_penalties(data)
        inter_df = compute_interaction_factors(data)

        feature_group_map = {}
        for c in soil_df.columns:
            feature_group_map[c] = "soil"
        for c in nut_df.columns:
            feature_group_map[c] = "nutrient"
        for c in water_df.columns:
            feature_group_map[c] = "water"
        for c in temp_df.columns:
            feature_group_map[c] = "temperature"
        for c in crop_df.columns:
            feature_group_map[c] = "crop"
        for c in stress_df.columns:
            feature_group_map[c] = "stress"
        for c in inter_df.columns:
            feature_group_map[c] = "interaction"

        math_all = pd.concat([data, soil_df, nut_df, water_df, temp_df, crop_df, stress_df, inter_df], axis=1)

        for c in data.columns:
            if c not in feature_group_map:
                if c in SOIL_FEATURES:
                    feature_group_map[c] = "soil"
                elif c in NUTRIENT_FEATURES:
                    feature_group_map[c] = "nutrient"
                elif c in WATER_FEATURES:
                    feature_group_map[c] = "water"
                elif c in CLIMATE_FEATURES:
                    feature_group_map[c] = "temperature"
                elif c in STRESS_FEATURES:
                    feature_group_map[c] = "stress"
                elif c in CROP_FEATURES:
                    feature_group_map[c] = "crop"
                else:
                    feature_group_map[c] = "crop"

        return math_all, feature_group_map

    def fit(self, X: pd.DataFrame, y: Optional[np.ndarray] = None) -> "CaneSugarCustomModel":
        """
        Fits the custom mathematical model:
        1. Learns normalization parameters on raw X.
        2. Computes all mathematical domain equations.
        3. Normalizes terms using learned training normalizer.
        4. Solves regularized normal equations for weights & base yield.
        """
        raw_df = X.copy()
        if y is None:
            if TARGET_COLUMN in raw_df.columns:
                y = raw_df[TARGET_COLUMN].values
            else:
                raise ValueError(f"Target vector y must be provided or '{TARGET_COLUMN}' must be in X.")

        math_df, group_map = self._build_features_dataframe(raw_df)

        norm_df = self.normalizer.fit_transform(math_df)
        self.feature_names = list(norm_df.columns)

        full_group_map = {}
        for col in self.feature_names:
            matched_group = "crop"
            for base_feat, grp in group_map.items():
                if col == base_feat or col.startswith(base_feat + "_"):
                    matched_group = grp
                    break
            full_group_map[col] = matched_group

        self.feature_groups = full_group_map

        X_mat = norm_df.values
        y_vec = np.asarray(y, dtype=float)

        self.optimizer.fit(X_mat, y_vec)

        weights_dict = {
            self.feature_names[i]: float(self.optimizer.weights[i])
            for i in range(len(self.feature_names))
        }

        self.parameters = ModelParameters(
            base_yield=float(self.optimizer.intercept),
            feature_weights=weights_dict,
            feature_groups=self.feature_groups,
            regularization_lambda=float(self.optimizer.best_alpha),
        )

        self.is_fitted = True
        return self

    def predict(self, X: Union[pd.DataFrame, Dict[str, Any], List[Dict[str, Any]]]) -> np.ndarray:
        """
        Predicts Yield_Quintal_per_Acre using the custom mathematical equation:
        y_hat = Base_Yield + sum(w_j * X_j)
        """
        if not self.is_fitted:
            raise RuntimeError("CaneSugarCustomModel is not fitted. Call fit() or load_artifacts() first.")

        if isinstance(X, dict):
            df = pd.DataFrame([X])
        elif isinstance(X, list):
            df = pd.DataFrame(X)
        else:
            df = X.copy()

        math_df, _ = self._build_features_dataframe(df)
        norm_df = self.normalizer.transform(math_df)

        aligned_df = norm_df.reindex(columns=self.feature_names, fill_value=0.0)
        X_mat = aligned_df.values

        preds = self.parameters.base_yield + np.dot(X_mat, [self.parameters.feature_weights[c] for c in self.feature_names])
        return np.maximum(0.0, preds)

    def explain(self, X: Union[pd.DataFrame, Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Deconstructs predictions into explicit mathematical component contributions:
        - Base Yield (Y_base)
        - Soil Contribution (Delta_soil)
        - Nutrient Contribution (Delta_nutrient)
        - Water Contribution (Delta_water)
        - Temperature Contribution (Delta_temp)
        - Crop Contribution (Delta_crop)
        - Interaction Contribution (Delta_interact)
        - Stress Penalty (StressPenalty >= 0)
        The sum of components minus stress penalty exactly equals the predicted yield.
        """
        if isinstance(X, dict):
            df = pd.DataFrame([X])
        else:
            df = X.copy()

        math_df, _ = self._build_features_dataframe(df)
        norm_df = self.normalizer.transform(math_df)
        aligned_df = norm_df.reindex(columns=self.feature_names, fill_value=0.0)

        explanations = []
        base = self.parameters.base_yield

        for idx in range(len(aligned_df)):
            row = aligned_df.iloc[idx]
            comps = {
                "soil": 0.0,
                "nutrient": 0.0,
                "water": 0.0,
                "temperature": 0.0,
                "crop": 0.0,
                "interaction": 0.0,
                "stress": 0.0,
            }

            for feat, val in row.items():
                w = self.parameters.feature_weights.get(feat, 0.0)
                contribution = float(w * val)
                grp = self.feature_groups.get(feat, "crop")
                comps[grp] += contribution

            stress_val = comps["stress"]
            if stress_val < 0:
                stress_penalty = float(-stress_val)
            else:
                stress_penalty = 0.0
                comps["crop"] += float(stress_val)

            total_yield = float(
                base
                + comps["soil"]
                + comps["nutrient"]
                + comps["water"]
                + comps["temperature"]
                + comps["crop"]
                + comps["interaction"]
                - stress_penalty
            )
            total_yield = max(0.0, total_yield)

            explanations.append({
                "base_yield": round(base, 2),
                "soil_contribution": round(comps["soil"], 2),
                "nutrient_contribution": round(comps["nutrient"], 2),
                "water_contribution": round(comps["water"], 2),
                "temperature_contribution": round(comps["temperature"], 2),
                "crop_contribution": round(comps["crop"], 2),
                "interaction_contribution": round(comps["interaction"], 2),
                "stress_penalty": round(stress_penalty, 2),
                "predicted_yield": round(total_yield, 2),
                "unit": "quintal_per_acre",
                "equation_format": "Predicted = Base + Soil + Nutrient + Water + Temp + Crop + Interact - Stress",
            })

        return explanations

    def score(self, X: pd.DataFrame, y: np.ndarray) -> float:
        preds = self.predict(X)
        return float(r2_score(y, preds))

    def evaluate(self, X: pd.DataFrame, y: np.ndarray) -> Dict[str, float]:
        preds = self.predict(X)
        y_arr = np.asarray(y, dtype=float)
        r2 = float(r2_score(y_arr, preds))
        mae = float(mean_absolute_error(y_arr, preds))
        rmse = float(np.sqrt(mean_squared_error(y_arr, preds)))
        mape = float(np.mean(np.abs((y_arr - preds) / np.maximum(y_arr, 1e-6))) * 100.0)
        return {"r2": r2, "mae": mae, "rmse": rmse, "mape": mape}

    def save_artifacts(self, artifacts_dir: str) -> None:
        """
        Saves all mathematical parameters and configuration to artifacts folder.
        """
        import os
        os.makedirs(artifacts_dir, exist_ok=True)

        self.parameters.save_json(os.path.join(artifacts_dir, "parameters.json"))
        self.normalizer.save_json(os.path.join(artifacts_dir, "normalization.json"))

        feature_config_dict = {
            "feature_names": self.feature_names,
            "feature_groups": self.feature_groups,
            "total_features": len(self.feature_names),
            "normalization_method": self.normalization_method,
        }
        with open(os.path.join(artifacts_dir, "feature_config.json"), "w") as f:
            json.dump(feature_config_dict, f, indent=2)

        equation_dict = {
            "model_name": "CaneSugar Custom Agronomic Mathematical Model",
            "version": "1.0.0",
            "target": TARGET_COLUMN,
            "equation_structure": "Y_hat = Base_Yield + Delta_Soil + Delta_Nutrient + Delta_Water + Delta_Temp + Delta_Crop + Delta_Interact - Stress_Penalty",
            "components": [
                "soil_factor",
                "nutrient_factor",
                "water_factor",
                "temperature_factor",
                "crop_factor",
                "interaction_factor",
                "stress_penalty",
            ],
            "base_yield": self.parameters.base_yield,
            "regularization_lambda": self.parameters.regularization_lambda,
        }
        with open(os.path.join(artifacts_dir, "model_equation.json"), "w") as f:
            json.dump(equation_dict, f, indent=2)

    @classmethod
    def load_artifacts(cls, artifacts_dir: str) -> "CaneSugarCustomModel":
        """
        Reconstructs the custom mathematical model from serialized artifacts.
        """
        import os
        norm_path = os.path.join(artifacts_dir, "normalization.json")
        param_path = os.path.join(artifacts_dir, "parameters.json")
        feat_path = os.path.join(artifacts_dir, "feature_config.json")

        model = cls()
        model.normalizer = AgronomicNormalizer.load_json(norm_path)
        model.parameters = ModelParameters.load_json(param_path)

        with open(feat_path, "r") as f:
            f_cfg = json.load(f)

        model.feature_names = f_cfg.get("feature_names", [])
        model.feature_groups = f_cfg.get("feature_groups", {})
        model.normalization_method = f_cfg.get("normalization_method", "standard")
        model.is_fitted = True
        return model

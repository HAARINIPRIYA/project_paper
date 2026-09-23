"""
CaneSugar Custom Mathematical Model — Validation Module
========================================================
Implements domain sanity checks, boundary validation, and
explicit feature-availability classification (No silent defaults).
"""

from typing import Dict, Any, List, Tuple
from ..config.feature_config import DOMAIN_BOUNDS

class AgronomicValidator:
    """
    Validates field and environmental inputs according to agronomic domain constraints.
    Rejects scientifically impossible values and tracks missingness explicitly.
    """

    def __init__(self, bounds: Dict[str, Tuple[float, float]] = None):
        self.bounds = bounds or DOMAIN_BOUNDS

    def validate(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Validates input dictionary.
        Returns:
            {
                "valid": bool,
                "errors": List[str],
                "warnings": List[str],
                "feature_status": Dict[str, str], # available, derived, missing, manual, unavailable
                "cleaned_data": Dict[str, Any]
            }
        """
        errors = []
        warnings = []
        feature_status = {}
        cleaned_data = {}

        for key, val in data.items():
            if val is None or val == "":
                feature_status[key] = "missing"
            elif isinstance(val, (int, float)) and val == 0 and key in ["Rainfall_Total_mm", "Soil_Moisture_%"]:
                feature_status[key] = "manual"
                cleaned_data[key] = float(val)
            else:
                feature_status[key] = "available"
                try:
                    cleaned_data[key] = float(val) if not isinstance(val, str) else val
                except (ValueError, TypeError):
                    cleaned_data[key] = val

        for feat, (min_b, max_b) in self.bounds.items():
            if feat in cleaned_data and cleaned_data[feat] is not None:
                try:
                    num_val = float(cleaned_data[feat])
                    if num_val < min_b:
                        errors.append(f"{feat} value {num_val} is below biological minimum {min_b}")
                    elif num_val > max_b:
                        errors.append(f"{feat} value {num_val} exceeds biological maximum {max_b}")
                except (ValueError, TypeError):
                    errors.append(f"{feat} must be numeric, got: {cleaned_data[feat]}")
            else:
                if feat not in feature_status:
                    feature_status[feat] = "unavailable"

        for nut in ["Nitrogen_kg_per_acre", "Phosphorus_kg_per_acre", "Potassium_kg_per_acre"]:
            if nut in cleaned_data and cleaned_data[nut] is not None:
                if float(cleaned_data[nut]) < 0:
                    errors.append(f"Nutrient {nut} cannot be negative")

        if "Soil_pH" in cleaned_data and cleaned_data["Soil_pH"] is not None:
            ph = float(cleaned_data["Soil_pH"])
            if ph < 4.0 or ph > 9.5:
                warnings.append(f"Soil pH {ph:.1f} is extreme for sugarcane (optimal 6.0-7.8)")

        if "Soil_Moisture_%" in cleaned_data and cleaned_data["Soil_Moisture_%"] is not None:
            sm = float(cleaned_data["Soil_Moisture_%"])
            if sm > 85.0:
                warnings.append(f"Soil moisture {sm:.1f}% indicates waterlogged/saturated soil")
            elif sm < 12.0:
                warnings.append(f"Soil moisture {sm:.1f}% indicates severe drought stress")

        if "Crop_Duration_Days" in cleaned_data and cleaned_data["Crop_Duration_Days"] is not None:
            dur = float(cleaned_data["Crop_Duration_Days"])
            if dur < 60:
                warnings.append(f"Crop duration {dur:.0f} days is very short (cane requires 240-540 days)")

        is_valid = len(errors) == 0

        return {
            "valid": is_valid,
            "errors": errors,
            "warnings": warnings,
            "feature_status": feature_status,
            "cleaned_data": cleaned_data,
        }

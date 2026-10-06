"""
CaneSugar Custom Mathematical Model — Environmental Stress Equations
=====================================================================
Computes explicit stress penalties from biotic pressures (disease severity, pest infestation)
and abiotic extremes (heat stress days, frost days, dry planting soil conditions).
All stress penalties are non-negative and reduce final projected yield.
"""

from typing import Dict, Any
import numpy as np
import pandas as pd

def compute_stress_penalties(df: pd.DataFrame) -> pd.DataFrame:
    """
    Compute mathematical environmental and biological stress penalty factors.
    All variables represent negative stressors (yield reduction).
    """
    factors = pd.DataFrame(index=df.index)

    heat_days = df["Heat_Stress_Days"].values if "Heat_Stress_Days" in df.columns else np.zeros(len(df))
    frost_days = df["Frost_Days"].values if "Frost_Days" in df.columns else np.zeros(len(df))

    factors["stress_heat_days"] = np.maximum(0, heat_days) / 10.0
    factors["stress_frost_days"] = np.maximum(0, frost_days) / 5.0

    if "Soil_Condition_At_Planting" in df.columns and "Soil_Moisture_%" in df.columns:
        is_dry = (df["Soil_Condition_At_Planting"] == "Dry").astype(float).values
        sm = df["Soil_Moisture_%"].values
        factors["stress_dry_planting"] = is_dry * np.maximum(0, 25.0 - sm) / 10.0
    else:
        factors["stress_dry_planting"] = np.zeros(len(df))

    if "Disease_Severity" in df.columns:
        is_high_disease = (df["Disease_Severity"] == "High").astype(float).values
        is_med_disease = (df["Disease_Severity"] == "Medium").astype(float).values
        factors["stress_disease_high"] = is_high_disease
        factors["stress_disease_med"] = is_med_disease
    else:
        factors["stress_disease_high"] = np.zeros(len(df))
        factors["stress_disease_med"] = np.zeros(len(df))

    if "Pest_Level" in df.columns:
        is_high_pest = (df["Pest_Level"] == "High").astype(float).values
        is_med_pest = (df["Pest_Level"] == "Medium").astype(float).values
        factors["stress_pest_high"] = is_high_pest
        factors["stress_pest_med"] = is_med_pest
    else:
        factors["stress_pest_high"] = np.zeros(len(df))
        factors["stress_pest_med"] = np.zeros(len(df))

    if "Drainage_Condition" in df.columns:
        is_poor_drainage = (df["Drainage_Condition"] == "Poor").astype(float).values
        factors["stress_poor_drainage"] = is_poor_drainage
    else:
        factors["stress_poor_drainage"] = np.zeros(len(df))

    return factors

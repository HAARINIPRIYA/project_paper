"""
CaneSugar Custom Mathematical Model — Crop Phenology & Biometrics Equations
============================================================================
Computes crop duration suitability, daily nutrient demand rates, stalk geometry volume,
biomass indices, sucrose yield indices, and canopy row configuration.
"""

import numpy as np
import pandas as pd

def compute_duration_suitability(duration: np.ndarray, opt_duration: float = 330.0, sigma_duration: float = 50.0) -> np.ndarray:
    """
    Gaussian suitability curve for crop duration:
    S(D) = exp( - (D - opt_duration)^2 / (2 * sigma_duration^2) )
    Sugarcane requires sufficient vegetative growth (typically 300 to 360 days) to maximize
    millable stalk tonnage and internode sucrose concentration.
    """
    return np.exp(-((duration - opt_duration) ** 2) / (2.0 * (sigma_duration ** 2)))

def compute_crop_factors(df: pd.DataFrame, eps: float = 1e-6) -> pd.DataFrame:
    """
    Compute mathematical crop phenology and biometric variables.
    """
    factors = pd.DataFrame(index=df.index)

    dur = df["Crop_Duration_Days"].values if "Crop_Duration_Days" in df.columns else np.full(len(df), 330.0)
    dur_safe = np.maximum(30.0, dur)

    height = df["Cane_Height_cm"].values if "Cane_Height_cm" in df.columns else np.full(len(df), 250.0)
    diam = df["Cane_Diameter_cm"].values if "Cane_Diameter_cm" in df.columns else np.full(len(df), 3.0)
    brix = df["Brix_Value"].values if "Brix_Value" in df.columns else np.full(len(df), 20.0)
    tiller = df["Tillering_Count"].values if "Tillering_Count" in df.columns else np.full(len(df), 10.0)
    density = df["Plant_Density"].values if "Plant_Density" in df.columns else np.full(len(df), 90000.0)
    germ = df["Germination_%"].values if "Germination_%" in df.columns else np.full(len(df), 80.0)
    row_gap = df["Row_Gap_cm"].values if "Row_Gap_cm" in df.columns else np.full(len(df), 90.0)
    row_space = df["Row_Spacing_cm"].values if "Row_Spacing_cm" in df.columns else np.full(len(df), 120.0)

    n = df["Nitrogen_kg_per_acre"].values if "Nitrogen_kg_per_acre" in df.columns else np.full(len(df), 150.0)
    k = df["Potassium_kg_per_acre"].values if "Potassium_kg_per_acre" in df.columns else np.full(len(df), 100.0)
    rain = df["Rainfall_Total_mm"].values if "Rainfall_Total_mm" in df.columns else np.full(len(df), 1300.0)

    factors["crop_duration_suitability"] = compute_duration_suitability(dur, opt_duration=330.0, sigma_duration=50.0)
    factors["crop_N_daily_demand"] = n / dur_safe
    factors["crop_K_daily_demand"] = k / dur_safe
    factors["crop_water_daily_rate"] = rain / dur_safe

    radius = diam / 2.0
    stalk_volume = np.pi * (radius ** 2) * height
    factors["crop_stalk_volume"] = stalk_volume / 1000.0

    factors["crop_biomass_index"] = (stalk_volume * tiller * density) / 1e8

    factors["crop_sugar_index"] = (stalk_volume * (brix / 100.0)) / 100.0

    factors["crop_row_architecture"] = row_gap / (row_space + eps)

    factors["crop_germination_factor"] = germ / 100.0

    return factors

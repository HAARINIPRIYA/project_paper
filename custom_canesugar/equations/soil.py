"""
CaneSugar Custom Mathematical Model — Soil Equations
=====================================================
Computes soil productivity factors, pH suitability, organic carbon contributions,
and soil texture balances using explicit domain equations.
"""

from typing import Dict, Any
import numpy as np
import pandas as pd

def compute_soil_ph_suitability(ph: np.ndarray, opt_ph: float = 7.1, sigma_ph: float = 0.8) -> np.ndarray:
    """
    Gaussian suitability curve for soil pH:
    S(pH) = exp( - (pH - opt_ph)^2 / (2 * sigma_ph^2) )
    Sugarcane thrives in slightly acidic to neutral soils (pH 6.0 to 7.8).
    Extreme acidity (<5.0) or alkalinity (>8.5) induces micronutrient lockup.
    """
    return np.exp(-((ph - opt_ph) ** 2) / (2.0 * (sigma_ph ** 2)))

def compute_soil_factors(df: pd.DataFrame, eps: float = 1e-6) -> pd.DataFrame:
    """
    Compute mathematical soil productivity variables.
    """
    factors = pd.DataFrame(index=df.index)

    ph = df["Soil_pH"].values if "Soil_pH" in df.columns else np.full(len(df), 7.2)
    oc = df["Organic_Carbon_%"].values if "Organic_Carbon_%" in df.columns else np.full(len(df), 0.8)
    sand = df["Sand_%"].values if "Sand_%" in df.columns else np.full(len(df), 35.0)
    clay = df["Clay_%"].values if "Clay_%" in df.columns else np.full(len(df), 30.0)
    silt = df["Silt_%"].values if "Silt_%" in df.columns else np.full(len(df), 35.0)
    depth = df["Soil_Depth_cm"].values if "Soil_Depth_cm" in df.columns else np.full(len(df), 150.0)
    whc = df["Water_Holding_Capacity_%"].values if "Water_Holding_Capacity_%" in df.columns else np.full(len(df), 40.0)
    ec = df["EC"].values if "EC" in df.columns else np.full(len(df), 1.2)

    factors["soil_pH_suitability"] = compute_soil_ph_suitability(ph)
    factors["soil_OC_log"] = np.log1p(np.maximum(0, oc))
    factors["soil_texture_sand_clay"] = sand / (clay + eps)
    factors["soil_texture_silt_clay"] = silt / (clay + eps)
    factors["soil_depth_sqrt"] = np.sqrt(np.maximum(0, depth))
    factors["soil_whc_fraction"] = whc / 100.0
    factors["soil_salinity_penalty"] = np.maximum(0, ec - 2.0)

    return factors

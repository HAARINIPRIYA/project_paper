"""
CaneSugar Custom Mathematical Model — Water Availability Equations
===================================================================
Computes water balance, soil moisture field capacity suitability,
evaporative demand deficit, and capillary groundwater contribution.
"""

import numpy as np
import pandas as pd

def compute_moisture_suitability(moisture: np.ndarray, opt_moisture: float = 27.5, sigma: float = 7.0) -> np.ndarray:
    """
    Gaussian suitability curve for soil moisture:
    S(M) = exp( - (M - opt_moisture)^2 / (2 * sigma^2) )
    Optimal field capacity for sugarcane root growth is 24% to 32% volumetric water content.
    Severe drought (<15%) or waterlogging (>40%) penalizes yield.
    """
    return np.exp(-((moisture - opt_moisture) ** 2) / (2.0 * (sigma ** 2)))

def compute_water_factors(df: pd.DataFrame, eps: float = 1e-6) -> pd.DataFrame:
    """
    Compute mathematical water availability and hydrologic balance variables.
    """
    factors = pd.DataFrame(index=df.index)

    rain = df["Rainfall_Total_mm"].values if "Rainfall_Total_mm" in df.columns else np.full(len(df), 1300.0)
    rain_seas = df["Rainfall_Seasonal_mm"].values if "Rainfall_Seasonal_mm" in df.columns else np.full(len(df), 750.0)
    et0 = df["Evapotranspiration_mm_day"].values if "Evapotranspiration_mm_day" in df.columns else np.full(len(df), 4.5)
    sm = df["Soil_Moisture_%"].values if "Soil_Moisture_%" in df.columns else np.full(len(df), 25.0)
    gw = df["Groundwater_Level_meters"].values if "Groundwater_Level_meters" in df.columns else np.full(len(df), 6.0)

    monthly_et = et0 * 30.0
    water_bal = rain - monthly_et
    factors["water_balance"] = water_bal / 500.0

    sm_suit = compute_moisture_suitability(sm, opt_moisture=27.5, sigma=7.0)
    factors["water_SM_suitability"] = sm_suit
    for threshold in [18.0, 24.0, 30.0, 36.0]:
        factors[f"water_SM_knot_{int(threshold)}"] = np.maximum(0.0, sm - threshold) / 10.0
    factors["water_SM_deficit_hinge"] = np.maximum(0.0, 25.0 - sm) / 10.0

    factors["water_deficit_stress"] = np.maximum(0, monthly_et - rain) / 100.0

    factors["water_rain_moisture_synergy"] = (rain * sm) / 1000.0

    factors["water_groundwater_suitability"] = np.exp(-((gw - 5.0) ** 2) / (2.0 * (3.5 ** 2)))

    factors["water_seasonal_rain_ratio"] = rain_seas / (rain + eps)

    if "Nitrogen_kg_per_acre" in df.columns:
        n_val = df["Nitrogen_kg_per_acre"].values
        f_n = 1.0 - np.exp(-0.012 * np.maximum(0, n_val))
        factors["water_nutrient_min_colimit"] = np.minimum(f_n, sm_suit)
    else:
        factors["water_nutrient_min_colimit"] = sm_suit

    return factors

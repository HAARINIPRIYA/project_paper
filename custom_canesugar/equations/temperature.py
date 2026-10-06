"""
CaneSugar Custom Mathematical Model — Temperature & Climate Equations
======================================================================
Computes thermal suitability for C4 photosynthesis, diurnal temperature range,
vapor pressure deficit, and atmospheric moisture status.
"""

import numpy as np
import pandas as pd

def compute_temperature_suitability(temp: np.ndarray, opt_temp: float = 28.5, sigma_temp: float = 5.5) -> np.ndarray:
    """
    Gaussian thermal suitability curve:
    S(T) = exp( - (T - opt_temp)^2 / (2 * sigma_temp^2) )
    Sugarcane is a C4 tropical grass with optimal tillering and elongation at 26°C to 32°C.
    Chilling temperatures (<15°C) arrest growth; extreme heat (>38°C) damages chloroplasts.
    """
    return np.exp(-((temp - opt_temp) ** 2) / (2.0 * (sigma_temp ** 2)))

def compute_temperature_factors(df: pd.DataFrame) -> pd.DataFrame:
    """
    Compute mathematical temperature and climate suitability variables.
    """
    factors = pd.DataFrame(index=df.index)

    tavg = df["Temp_Avg_C"].values if "Temp_Avg_C" in df.columns else np.full(len(df), 27.5)
    tmax = df["Temp_Max_C"].values if "Temp_Max_C" in df.columns else np.full(len(df), 33.0)
    tmin = df["Temp_Min_C"].values if "Temp_Min_C" in df.columns else np.full(len(df), 22.0)
    dew = df["Dew_Point_C"].values if "Dew_Point_C" in df.columns else np.full(len(df), 20.0)
    humidity = df["Humidity_%"].values if "Humidity_%" in df.columns else np.full(len(df), 65.0)
    wind = df["Wind_Speed_kmph"].values if "Wind_Speed_kmph" in df.columns else np.full(len(df), 8.0)
    rad = df["Solar_Radiation_MJ_m2_day"].values if "Solar_Radiation_MJ_m2_day" in df.columns else np.full(len(df), 18.0)

    factors["temp_thermal_suitability"] = compute_temperature_suitability(tavg, opt_temp=28.5, sigma_temp=5.5)

    diurnal_range = tmax - tmin
    factors["temp_diurnal_range"] = diurnal_range / 10.0

    factors["temp_vpd_deficit"] = np.maximum(0, tavg - dew) / 10.0

    factors["climate_humidity_fraction"] = humidity / 100.0
    factors["climate_solar_rad_scaled"] = rad / 25.0
    factors["climate_wind_stress"] = np.maximum(0, wind - 25.0) / 10.0

    return factors

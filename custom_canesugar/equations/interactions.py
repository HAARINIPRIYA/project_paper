"""
CaneSugar Custom Mathematical Model — Interaction Equations
============================================================
Computes biologically meaningful interaction cross-terms between
macronutrients, moisture, thermal energy, soil chemistry, and biotic factors.
"""

import numpy as np
import pandas as pd

def compute_interaction_factors(df: pd.DataFrame) -> pd.DataFrame:
    """
    Compute mathematical agronomic interaction terms.
    """
    factors = pd.DataFrame(index=df.index)

    n = df["Nitrogen_kg_per_acre"].values if "Nitrogen_kg_per_acre" in df.columns else np.full(len(df), 150.0)
    p = df["Phosphorus_kg_per_acre"].values if "Phosphorus_kg_per_acre" in df.columns else np.full(len(df), 60.0)
    k = df["Potassium_kg_per_acre"].values if "Potassium_kg_per_acre" in df.columns else np.full(len(df), 100.0)
    sm = df["Soil_Moisture_%"].values if "Soil_Moisture_%" in df.columns else np.full(len(df), 25.0)
    temp = df["Temp_Avg_C"].values if "Temp_Avg_C" in df.columns else np.full(len(df), 27.5)
    rain = df["Rainfall_Total_mm"].values if "Rainfall_Total_mm" in df.columns else np.full(len(df), 1300.0)
    ph = df["Soil_pH"].values if "Soil_pH" in df.columns else np.full(len(df), 7.2)
    oc = df["Organic_Carbon_%"].values if "Organic_Carbon_%" in df.columns else np.full(len(df), 0.8)

    factors["inter_N_x_P"] = (n * p) / 1000.0
    factors["inter_N_x_K"] = (n * k) / 1000.0
    factors["inter_P_x_K"] = (p * k) / 1000.0

    factors["inter_N_x_Moisture"] = (n * sm) / 100.0
    factors["inter_K_x_Moisture"] = (k * sm) / 100.0

    factors["inter_Moisture_x_Temp"] = (sm * temp) / 100.0
    factors["inter_Rain_x_Moisture"] = (rain * sm) / 1000.0

    factors["inter_OC_x_pH"] = (oc * ph) / 10.0
    if "Clay_%" in df.columns:
        clay = df["Clay_%"].values
        factors["inter_Clay_x_Rain"] = (clay * rain) / 10000.0
    if "Sand_%" in df.columns and "Water_Quantity_liters_per_acre" in df.columns:
        sand = df["Sand_%"].values
        wq = df["Water_Quantity_liters_per_acre"].values
        factors["inter_Sand_x_IrrigWater"] = (sand * wq) / 1000000.0

    if "Disease_Severity" in df.columns:
        is_high_disease = (df["Disease_Severity"] == "High").astype(float).values
        factors["inter_Disease_High_x_N"] = is_high_disease * (n / 100.0)
        factors["inter_Disease_High_x_Moisture"] = is_high_disease * (sm / 25.0)
    else:
        factors["inter_Disease_High_x_N"] = np.zeros(len(df))
        factors["inter_Disease_High_x_Moisture"] = np.zeros(len(df))

    if "Soil_Condition_At_Planting" in df.columns:
        is_dry_planting = (df["Soil_Condition_At_Planting"] == "Dry").astype(float).values
        is_wet_planting = (df["Soil_Condition_At_Planting"] == "Wet").astype(float).values
        factors["inter_DryPlanting_x_MoistureDeficit"] = is_dry_planting * (np.maximum(0.0, 25.0 - sm) / 10.0)
        factors["inter_DryPlanting_x_Rain"] = is_dry_planting * (rain / 1000.0)
        factors["inter_WetPlanting_x_Rain"] = is_wet_planting * (rain / 1000.0)

    if "Variety" in df.columns:
        for v in ["Co0238", "Co98014", "CoJ64"]:
            is_var = (df["Variety"] == v).astype(float).values
            factors[f"inter_Var_{v}_x_N"] = is_var * (n / 100.0)
            factors[f"inter_Var_{v}_x_SM"] = is_var * (sm / 25.0)
            factors[f"inter_Var_{v}_x_Rain"] = is_var * (rain / 1000.0)

    return factors

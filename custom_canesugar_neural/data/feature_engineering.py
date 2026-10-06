import numpy as np
import pandas as pd

def engineer_agronomic_features(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    eps = 1e-5
    
    if "Sunshine_Hours_hh_mm" in df.columns:
        def parse_sunshine(val):
            if pd.isna(val):
                return np.nan
            try:
                parts = str(val).split(":")
                return float(parts[0]) + float(parts[1]) / 60.0
            except Exception:
                return np.nan
        df["Sunshine_Hours"] = df["Sunshine_Hours_hh_mm"].apply(parse_sunshine)
        df.drop("Sunshine_Hours_hh_mm", axis=1, inplace=True, errors="ignore")

    for col in ["Planting_Date", "Harvesting_Date"]:
        if col in df.columns:
            df[col] = pd.to_datetime(df[col], errors="coerce")

    if "Planting_Date" in df.columns and "Harvesting_Date" in df.columns:
        dur = (df["Harvesting_Date"] - df["Planting_Date"]).dt.days
        if "Crop_Duration_Days" not in df.columns or df["Crop_Duration_Days"].isna().all():
            df["Crop_Duration_Days"] = dur
        else:
            df["Crop_Duration_Days"] = df["Crop_Duration_Days"].fillna(dur)

    if "Planting_Date" in df.columns:
        month = df["Planting_Date"].dt.month.fillna(6).astype(float)
        doy = df["Planting_Date"].dt.dayofyear.fillna(180).astype(float)
        df["Planting_Month_sin"] = np.sin(2.0 * np.pi * month / 12.0)
        df["Planting_Month_cos"] = np.cos(2.0 * np.pi * month / 12.0)
        df["Planting_DOY_sin"] = np.sin(2.0 * np.pi * doy / 365.25)
        df["Planting_DOY_cos"] = np.cos(2.0 * np.pi * doy / 365.25)
        df.drop("Planting_Date", axis=1, inplace=True, errors="ignore")

    if "Harvesting_Date" in df.columns:
        h_month = df["Harvesting_Date"].dt.month.fillna(12).astype(float)
        df["Harvest_Month_sin"] = np.sin(2.0 * np.pi * h_month / 12.0)
        df["Harvest_Month_cos"] = np.cos(2.0 * np.pi * h_month / 12.0)
        df.drop("Harvesting_Date", axis=1, inplace=True, errors="ignore")

    n_col = "Nitrogen_kg_per_acre" if "Nitrogen_kg_per_acre" in df.columns else ("Nitrogen" if "Nitrogen" in df.columns else None)
    p_col = "Phosphorus_kg_per_acre" if "Phosphorus_kg_per_acre" in df.columns else ("Phosphorus" if "Phosphorus" in df.columns else None)
    k_col = "Potassium_kg_per_acre" if "Potassium_kg_per_acre" in df.columns else ("Potassium" if "Potassium" in df.columns else None)
    sm_col = "Soil_Moisture_%" if "Soil_Moisture_%" in df.columns else ("Soil_Moisture" if "Soil_Moisture" in df.columns else None)
    rain_col = "Rainfall_Total_mm" if "Rainfall_Total_mm" in df.columns else ("Rainfall" if "Rainfall" in df.columns else None)

    if n_col and p_col and k_col:
        npk_tot = df[n_col] + df[p_col] + df[k_col]
        df["NPK_Total"] = npk_tot
        df["N_P_Ratio"] = df[n_col] / (df[p_col] + eps)
        df["N_K_Ratio"] = df[n_col] / (df[k_col] + eps)
        df["P_K_Ratio"] = df[p_col] / (df[k_col] + eps)
        df["N_Fraction"] = df[n_col] / (npk_tot + eps)
        df["P_Fraction"] = df[p_col] / (npk_tot + eps)
        df["K_Fraction"] = df[k_col] / (npk_tot + eps)
        
        n_rel = np.clip(df[n_col] / 150.0, 0.0, 3.0)
        p_rel = np.clip(df[p_col] / 60.0, 0.0, 3.0)
        k_rel = np.clip(df[k_col] / 100.0, 0.0, 3.0)
        df["Liebig_Min_NPK"] = np.minimum(np.minimum(n_rel, p_rel), k_rel)
        df["Liebig_Geom_NPK"] = (n_rel * p_rel * k_rel) ** (1.0 / 3.0)

    if rain_col and sm_col:
        df["Rain_x_Moisture"] = df[rain_col] * df[sm_col]
        
    if rain_col and "Evapotranspiration_mm_day" in df.columns:
        eto_month = df["Evapotranspiration_mm_day"] * 30.0
        df["Rain_ETo_Ratio"] = df[rain_col] / (eto_month + eps)
        df["Moisture_Deficit"] = df[rain_col] - eto_month

    if "Temp_Max_C" in df.columns and "Temp_Min_C" in df.columns:
        df["Temp_Range"] = df["Temp_Max_C"] - df["Temp_Min_C"]

    if "Temp_Avg_C" in df.columns:
        t_opt = 28.5
        t_spread = 5.5
        df["Thermal_Suitability"] = np.exp(-0.5 * ((df["Temp_Avg_C"] - t_opt) / t_spread) ** 2)

    if "Organic_Carbon_%" in df.columns and sm_col:
        df["OC_x_Moisture"] = df["Organic_Carbon_%"] * df[sm_col]

    if "Soil_pH" in df.columns:
        df["pH_Suitability"] = np.exp(-0.5 * ((df["Soil_pH"] - 7.0) / 1.0) ** 2)

    h_col = "Cane_Height_cm" if "Cane_Height_cm" in df.columns else None
    d_col = "Cane_Diameter_cm" if "Cane_Diameter_cm" in df.columns else None

    if h_col and d_col:
        radius = df[d_col] / 2.0
        stalk_vol = np.pi * (radius ** 2) * df[h_col]
        df["Cane_Stalk_Volume"] = stalk_vol
        
        if "Tillering_Count" in df.columns and "Plant_Density" in df.columns:
            df["Field_Biomass_Index"] = stalk_vol * df["Tillering_Count"] * (df["Plant_Density"] / 1000.0)
            
        if "Brix_Value" in df.columns:
            df["Sugar_Index"] = stalk_vol * (df["Brix_Value"] / 100.0)

    if h_col and d_col and "Fertilizer_Quantity" in df.columns:
        df["Fertilizer_Efficiency"] = (df[h_col] * df[d_col]) / (df["Fertilizer_Quantity"] + 1.0)

    return df

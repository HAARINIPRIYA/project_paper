"""
CaneSugar Custom Mathematical Model — Feature Configuration
============================================================
Defines feature groups, valid domain bounds, and target leakage exclusions.
"""

TARGET_COLUMN = "Yield_Quintal_per_Acre"

LEAKAGE_COLUMNS = [
    "Latitude",
    "Longitude",
    "Khasra_No",
    "Sugar_Mill",
    "Tehsil",
    "District",
    "State",
    "Region",
    "Agro_Cluster",
    "Sunshine_Hours_hh_mm",
]

DATE_COLUMNS = [
    "Planting_Date",
    "Harvesting_Date",
]

SOIL_FEATURES = [
    "Soil_pH",
    "Organic_Carbon_%",
    "Soil_Moisture_%",
    "Sand_%",
    "Silt_%",
    "Clay_%",
    "Soil_Depth_cm",
    "Water_Holding_Capacity_%",
    "EC",
    "Soil_Type",
    "Soil_Condition_At_Planting",
]

NUTRIENT_FEATURES = [
    "Nitrogen_kg_per_acre",
    "Phosphorus_kg_per_acre",
    "Potassium_kg_per_acre",
    "Zinc_mg_per_kg",
    "Iron_mg_per_kg",
    "Copper_mg_per_kg",
    "Manganese_mg_per_kg",
    "Sulfur_kg_per_acre",
    "Fertilizer_Type",
    "Fertilizer_Quantity",
    "Fertilizer_Split",
    "Application_Timing",
]

WATER_FEATURES = [
    "Rainfall_Total_mm",
    "Rainfall_Seasonal_mm",
    "Evapotranspiration_mm_day",
    "Groundwater_Level_meters",
    "Water_Quantity_liters_per_acre",
    "Irrigation_Method_Type",
    "Irrigation_Frequency_Level",
    "Drainage_Condition",
    "Water_Quality_Category",
]

CLIMATE_FEATURES = [
    "Temp_Avg_C",
    "Temp_Max_C",
    "Temp_Min_C",
    "Humidity_%",
    "Solar_Radiation_MJ_m2_day",
    "Wind_Speed_kmph",
    "Dew_Point_C",
    "Heat_Stress_Days",
    "Frost_Days",
]

CROP_FEATURES = [
    "Crop_Duration_Days",
    "Variety",
    "Cane_Height_cm",
    "Cane_Diameter_cm",
    "Internode_Length_cm",
    "Brix_Value",
    "Tillering_Count",
    "Plant_Density",
    "Germination_%",
    "Seed_Rate",
    "Row_Spacing_cm",
    "Row_Gap_cm",
    "Planting_Method",
    "Intercropping",
    "Mulching",
    "Weed_Control",
    "Machinery_Use",
    "Labor_Input",
    "Season",
    "Growth_Stage",
]

STRESS_FEATURES = [
    "Disease_Type",
    "Disease_Severity",
    "Pest_Level",
    "Pesticide_Usage",
    "Heat_Stress_Days",
    "Frost_Days",
]

DOMAIN_BOUNDS = {
    "Nitrogen_kg_per_acre": (0.0, 450.0),
    "Phosphorus_kg_per_acre": (0.0, 250.0),
    "Potassium_kg_per_acre": (0.0, 350.0),
    "Soil_pH": (3.5, 10.5),
    "Soil_Moisture_%": (0.0, 100.0),
    "Temp_Avg_C": (0.0, 55.0),
    "Temp_Max_C": (0.0, 60.0),
    "Temp_Min_C": (-10.0, 45.0),
    "Rainfall_Total_mm": (0.0, 5000.0),
    "Crop_Duration_Days": (30.0, 1200.0),
    "Organic_Carbon_%": (0.0, 10.0),
    "Brix_Value": (0.0, 35.0),
    "Cane_Height_cm": (20.0, 550.0),
    "Cane_Diameter_cm": (0.5, 8.0),
}

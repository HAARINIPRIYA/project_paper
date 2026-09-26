from typing import Dict, List, Tuple

TARGET_COLUMN = "Yield_Quintal_per_Acre"

LEAKAGE_COLUMNS = [
    "Khasra_No",
    "Latitude",
    "Longitude",
    "State",
    "District",
    "Sugar_Mill",
    "Region",
    "Tehsil",
    "Agro_Cluster",
]

DATE_COLUMNS = ["Planting_Date", "Harvesting_Date"]

CATEGORICAL_EMBEDDINGS: Dict[str, int] = {
    "Variety": 16,
    "Soil_Type": 8,
    "Irrigation_Method_Type": 8,
    "Fertilizer_Type": 8,
    "Disease_Severity": 4,
    "Pest_Level": 4,
    "Irrigation_Frequency_Level": 4,
    "Water_Quality_Category": 4,
    "Soil_Condition_At_Planting": 4,
    "Planting_Method": 4,
    "Drainage_Condition": 4,
    "Disease_Type": 4,
    "Season": 4,
    "Growth_Stage": 4,
    "Application_Timing": 4,
    "Intercropping": 2,
    "Weed_Control": 2,
    "Mulching": 2,
    "Fertilizer_Split": 2,
    "Machinery_Use": 2,
}

SEEDS = [42, 123, 2024, 3407, 7777]

DEFAULT_HYPERPARAMS = {
    "dense1_dim": 256,
    "dense2_dim": 128,
    "dense3_dim": 64,
    "dense4_dim": 32,
    "dropout_p1": 0.20,
    "dropout_p2": 0.15,
    "learning_rate": 0.001,
    "weight_decay": 1e-4,
    "batch_size": 64,
    "max_epochs": 150,
    "patience": 20,
    "warmup_epochs": 5,
    "activation": "gelu",
    "loss_fn": "huber",
    "huber_delta": 1.0,
    "mc_dropout_samples": 50,
}

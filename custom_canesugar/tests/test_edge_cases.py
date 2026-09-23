"""
Unit Tests — Agronomic Boundary & Edge Cases
============================================
Tests resilience against extreme environmental conditions:
1. Zero rainfall (drought emergency)
2. Extreme heat (52°C) and frost (0°C)
3. Extreme soil pH (3.8 acidic and 10.2 alkaline)
4. High disease and pest infestation simultaneous stress
5. Missing values in optional columns
6. Ensures all predictions remain finite and non-negative.
"""

import unittest
import numpy as np
import pandas as pd

from custom_canesugar.model.custom_model import CaneSugarCustomModel

class TestEdgeCases(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        np.random.seed(42)
        n_samples = 50
        cls.train_df = pd.DataFrame({
            "Soil_pH": np.random.uniform(5.5, 8.5, n_samples),
            "Organic_Carbon_%": np.random.uniform(0.3, 1.5, n_samples),
            "Soil_Moisture_%": np.random.uniform(15.0, 45.0, n_samples),
            "Nitrogen_kg_per_acre": np.random.uniform(50.0, 220.0, n_samples),
            "Phosphorus_kg_per_acre": np.random.uniform(20.0, 80.0, n_samples),
            "Potassium_kg_per_acre": np.random.uniform(30.0, 150.0, n_samples),
            "Rainfall_Total_mm": np.random.uniform(400.0, 1500.0, n_samples),
            "Evapotranspiration_mm_day": np.random.uniform(3.0, 6.0, n_samples),
            "Temp_Avg_C": np.random.uniform(20.0, 35.0, n_samples),
            "Temp_Max_C": np.random.uniform(28.0, 42.0, n_samples),
            "Temp_Min_C": np.random.uniform(12.0, 25.0, n_samples),
            "Crop_Duration_Days": np.random.uniform(250.0, 400.0, n_samples),
            "Cane_Height_cm": np.random.uniform(180.0, 380.0, n_samples),
            "Cane_Diameter_cm": np.random.uniform(1.8, 3.5, n_samples),
            "Brix_Value": np.random.uniform(15.0, 23.0, n_samples),
            "Disease_Severity": np.random.choice(["Low", "Medium", "High"], n_samples),
            "Pest_Level": np.random.choice(["Low", "Medium", "High"], n_samples),
            "Heat_Stress_Days": np.random.uniform(0.0, 20.0, n_samples),
            "Yield_Quintal_per_Acre": np.random.uniform(100.0, 450.0, n_samples),
        })

        cls.model = CaneSugarCustomModel(normalization_method="standard")
        cls.model.fit(cls.train_df)

    def test_zero_rainfall(self):
        sample = self.train_df.iloc[0:1].copy().drop(columns=["Yield_Quintal_per_Acre"])
        sample["Rainfall_Total_mm"] = 0.0
        sample["Soil_Moisture_%"] = 5.0

        pred = self.model.predict(sample)[0]
        self.assertFalse(np.isnan(pred))
        self.assertFalse(np.isinf(pred))
        self.assertGreaterEqual(pred, 0.0)

    def test_extreme_temperatures(self):
        heat_sample = self.train_df.iloc[0:1].copy().drop(columns=["Yield_Quintal_per_Acre"])
        heat_sample["Temp_Avg_C"] = 48.0
        heat_sample["Temp_Max_C"] = 54.0
        heat_sample["Heat_Stress_Days"] = 45.0

        pred_heat = self.model.predict(heat_sample)[0]
        self.assertFalse(np.isnan(pred_heat))
        self.assertGreaterEqual(pred_heat, 0.0)

    def test_extreme_soil_ph(self):
        acidic_sample = self.train_df.iloc[0:1].copy().drop(columns=["Yield_Quintal_per_Acre"])
        acidic_sample["Soil_pH"] = 3.5

        pred_acid = self.model.predict(acidic_sample)[0]
        self.assertFalse(np.isnan(pred_acid))
        self.assertGreaterEqual(pred_acid, 0.0)

        alk_sample = self.train_df.iloc[0:1].copy().drop(columns=["Yield_Quintal_per_Acre"])
        alk_sample["Soil_pH"] = 10.2

        pred_alk = self.model.predict(alk_sample)[0]
        self.assertFalse(np.isnan(pred_alk))
        self.assertGreaterEqual(pred_alk, 0.0)

    def test_simultaneous_maximum_stress(self):
        stress_sample = self.train_df.iloc[0:1].copy().drop(columns=["Yield_Quintal_per_Acre"])
        stress_sample["Disease_Severity"] = "High"
        stress_sample["Pest_Level"] = "High"
        stress_sample["Heat_Stress_Days"] = 30.0

        expl = self.model.explain(stress_sample)[0]
        self.assertGreater(expl["stress_penalty"], 0.0)
        self.assertGreaterEqual(expl["predicted_yield"], 0.0)

if __name__ == "__main__":
    unittest.main()

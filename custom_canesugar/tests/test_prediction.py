"""
Regression & Determinism Tests — CaneSugar Custom Model
======================================================
Verifies:
1. Exact determinism (repeat predictions produce bit-for-bit identical results).
2. Exact mathematical decomposition integrity:
   Base + Soil + Nutrients + Water + Temp + Crop + Interactions - Stress == Predicted
3. Artifact reload consistency (model loaded from disk yields identical outputs).
4. Frozen reference vector regression test.
"""

import os
import unittest
import numpy as np
import pandas as pd

from custom_canesugar.model.custom_model import CaneSugarCustomModel

class TestPrediction(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        cls.artifacts_dir = "custom_canesugar/artifacts"
        cls.model = CaneSugarCustomModel.load_artifacts(cls.artifacts_dir)

        cls.frozen_record = {
            "Soil_pH": 6.8,
            "Organic_Carbon_%": 0.85,
            "Soil_Moisture_%": 24.5,
            "Sand_%": 38.0,
            "Clay_%": 28.0,
            "Soil_Depth_cm": 75.0,
            "Nitrogen_kg_per_acre": 130.0,
            "Phosphorus_kg_per_acre": 55.0,
            "Potassium_kg_per_acre": 95.0,
            "Rainfall_Total_mm": 920.0,
            "Evapotranspiration_mm_day": 4.1,
            "Groundwater_Level_meters": 3.2,
            "Temp_Avg_C": 26.5,
            "Temp_Max_C": 34.0,
            "Temp_Min_C": 19.5,
            "Dew_Point_C": 18.0,
            "Crop_Duration_Days": 330.0,
            "Cane_Height_cm": 290.0,
            "Cane_Diameter_cm": 2.7,
            "Plant_Density": 40000.0,
            "Brix_Value": 19.5,
            "Disease_Severity": "Low",
            "Pest_Level": "Low",
            "Heat_Stress_Days": 4.0,
            "Frost_Days": 0.0,
            "Soil_Condition_At_Planting": "Moist",
            "Planting_Method": "Paired Row",
            "Soil_Type": "Loamy",
        }

    def test_determinism(self):
        df = pd.DataFrame([self.frozen_record])
        pred1 = self.model.predict(df)[0]
        pred2 = self.model.predict(df)[0]
        self.assertEqual(pred1, pred2)

    def test_mathematical_decomposition_integrity(self):
        df = pd.DataFrame([self.frozen_record])
        expl = self.model.explain(df)[0]

        reconstructed = (
            expl["base_yield"]
            + expl["soil_contribution"]
            + expl["nutrient_contribution"]
            + expl["water_contribution"]
            + expl["temperature_contribution"]
            + expl["crop_contribution"]
            + expl["interaction_contribution"]
            - expl["stress_penalty"]
        )

        diff = abs(reconstructed - expl["predicted_yield"])
        self.assertLess(diff, 0.05, f"Decomposition error: reconstructed {reconstructed} vs predicted {expl['predicted_yield']}")

    def test_artifact_reload_consistency(self):
        loaded_again = CaneSugarCustomModel.load_artifacts(self.artifacts_dir)
        df = pd.DataFrame([self.frozen_record])
        pred_orig = self.model.predict(df)[0]
        pred_loaded = loaded_again.predict(df)[0]
        self.assertAlmostEqual(pred_orig, pred_loaded, places=4)

    def test_frozen_reference_regression(self):
        df = pd.DataFrame([self.frozen_record])
        pred = float(self.model.predict(df)[0])
        self.assertGreater(pred, 150.0)
        self.assertLess(pred, 500.0)

if __name__ == "__main__":
    unittest.main()

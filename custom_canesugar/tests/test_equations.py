"""
Unit Tests — Domain Mathematical Equations
==========================================
Tests isolated behavior, non-negativity, boundary conditions,
and shape invariants of all domain mathematical equation modules.
"""

import unittest
import numpy as np
import pandas as pd

from custom_canesugar.equations.soil import compute_soil_factors
from custom_canesugar.equations.nutrients import compute_nutrient_factors
from custom_canesugar.equations.water import compute_water_factors
from custom_canesugar.equations.temperature import compute_temperature_factors
from custom_canesugar.equations.crop import compute_crop_factors
from custom_canesugar.equations.stress import compute_stress_penalties
from custom_canesugar.equations.interactions import compute_interaction_factors

class TestDomainEquations(unittest.TestCase):

    def setUp(self):
        self.sample_data = pd.DataFrame({
            "Soil_pH": [6.5, 7.1, 8.5],
            "Organic_Carbon_%": [0.5, 1.2, 0.8],
            "Soil_Moisture_%": [18.0, 28.0, 42.0],
            "Sand_%": [40.0, 35.0, 50.0],
            "Clay_%": [30.0, 35.0, 20.0],
            "Soil_Depth_cm": [60.0, 90.0, 45.0],
            "Nitrogen_kg_per_acre": [80.0, 150.0, 220.0],
            "Phosphorus_kg_per_acre": [30.0, 60.0, 90.0],
            "Potassium_kg_per_acre": [50.0, 100.0, 180.0],
            "Rainfall_Total_mm": [600.0, 1100.0, 1500.0],
            "Evapotranspiration_mm_day": [3.5, 4.2, 5.0],
            "Groundwater_Level_meters": [2.5, 4.0, 1.2],
            "Temp_Avg_C": [24.0, 28.5, 36.0],
            "Temp_Max_C": [32.0, 36.0, 42.0],
            "Temp_Min_C": [18.0, 21.0, 27.0],
            "Dew_Point_C": [16.0, 20.0, 22.0],
            "Crop_Duration_Days": [300.0, 365.0, 400.0],
            "Cane_Height_cm": [220.0, 310.0, 380.0],
            "Cane_Diameter_cm": [2.4, 2.9, 3.2],
            "Plant_Density": [35000.0, 42000.0, 48000.0],
            "Brix_Value": [18.5, 20.2, 21.5],
            "Disease_Severity": ["Low", "Medium", "High"],
            "Pest_Level": ["Low", "Medium", "High"],
            "Heat_Stress_Days": [0.0, 5.0, 18.0],
            "Frost_Days": [0.0, 0.0, 2.0],
            "Soil_Condition_At_Planting": ["Moist", "Dry", "Wet"],
        })

    def test_soil_factors(self):
        factors = compute_soil_factors(self.sample_data)
        self.assertEqual(len(factors), 3)
        self.assertTrue("soil_pH_suitability" in factors.columns)
        self.assertTrue("soil_OC_log" in factors.columns)
        ph_suit = factors["soil_pH_suitability"].values
        self.assertGreater(ph_suit[1], ph_suit[2])
        self.assertTrue(np.all(ph_suit >= 0.0) and np.all(ph_suit <= 1.0))

    def test_nutrient_factors(self):
        factors = compute_nutrient_factors(self.sample_data)
        self.assertEqual(len(factors), 3)
        self.assertTrue("nut_N_diminishing" in factors.columns)
        self.assertTrue("nut_NP_ratio_opt" in factors.columns)
        self.assertTrue(np.all(factors["nut_N_diminishing"] >= 0.0))
        self.assertTrue(np.all(factors["nut_P_diminishing"] >= 0.0))
        self.assertTrue(np.all(factors["nut_K_diminishing"] >= 0.0))

    def test_water_factors(self):
        factors = compute_water_factors(self.sample_data)
        self.assertEqual(len(factors), 3)
        self.assertTrue("water_balance" in factors.columns)
        self.assertTrue("water_SM_suitability" in factors.columns)
        self.assertTrue(np.all(factors["water_SM_suitability"] >= 0.0))
        self.assertTrue(np.all(factors["water_SM_suitability"] <= 1.0))

    def test_temperature_factors(self):
        factors = compute_temperature_factors(self.sample_data)
        self.assertEqual(len(factors), 3)
        self.assertTrue("temp_thermal_suitability" in factors.columns)
        self.assertTrue("temp_diurnal_range" in factors.columns)
        t_suit = factors["temp_thermal_suitability"].values
        self.assertGreater(t_suit[1], t_suit[2])

    def test_crop_factors(self):
        factors = compute_crop_factors(self.sample_data)
        self.assertEqual(len(factors), 3)
        self.assertTrue("crop_stalk_volume" in factors.columns)
        self.assertTrue("crop_biomass_index" in factors.columns)
        vols = factors["crop_stalk_volume"].values
        self.assertLess(vols[0], vols[1])
        self.assertLess(vols[1], vols[2])

    def test_stress_penalties(self):
        penalties = compute_stress_penalties(self.sample_data)
        self.assertEqual(len(penalties), 3)
        self.assertTrue("stress_disease_high" in penalties.columns)
        self.assertTrue("stress_pest_high" in penalties.columns)
        self.assertEqual(penalties["stress_disease_high"].iloc[2], 1.0)
        self.assertEqual(penalties["stress_disease_high"].iloc[0], 0.0)

    def test_interaction_factors(self):
        inter = compute_interaction_factors(self.sample_data)
        self.assertEqual(len(inter), 3)
        self.assertTrue("inter_N_x_P" in inter.columns)
        self.assertTrue("inter_N_x_Moisture" in inter.columns)
        self.assertTrue(np.all(inter["inter_N_x_P"] > 0.0))

if __name__ == "__main__":
    unittest.main()

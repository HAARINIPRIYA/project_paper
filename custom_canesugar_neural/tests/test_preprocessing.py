import unittest
import numpy as np
import pandas as pd
from custom_canesugar_neural.data.preprocessor import TabularNeuralPreprocessor

class TestPreprocessing(unittest.TestCase):
    def setUp(self):
        self.sample_df = pd.DataFrame({
            "Yield_Quintal_per_Acre": [280.0, 315.0, 190.0, 420.0],
            "Nitrogen_kg_per_acre": [120.0, 160.0, 80.0, 200.0],
            "Phosphorus_kg_per_acre": [50.0, 70.0, 30.0, 80.0],
            "Potassium_kg_per_acre": [90.0, 110.0, 60.0, 140.0],
            "Soil_pH": [6.8, 7.2, 5.5, 7.0],
            "Soil_Moisture_%": [24.0, 28.0, 18.0, 32.0],
            "Cane_Height_cm": [260.0, 300.0, 210.0, 330.0],
            "Cane_Diameter_cm": [2.6, 3.0, 2.1, 3.2],
            "Brix_Value": [18.5, 20.0, 15.0, 21.5],
            "Variety": ["Co 0238", "Co98014", "CoJ64", "Co 0238"],
            "Soil_Type": ["Loamy", "Clay", "Sandy", "Loamy"],
            "Irrigation_Method_Type": ["Drip", "Flood", "Sprinkler", "Drip"],
            "Fertilizer_Type": ["Urea", "DAP", "Organic", "Urea"],
            "Disease_Severity": ["Low", "Medium", "High", "Low"],
            "Pest_Level": ["Low", "Low", "High", "Low"],
        })

    def test_fit_and_transform(self):
        prep = TabularNeuralPreprocessor()
        prep.fit(self.sample_df)
        x_num, x_cat, y = prep.transform(self.sample_df)

        self.assertEqual(len(x_num), 4)
        self.assertEqual(len(y), 4)
        self.assertIn("Variety", x_cat)
        self.assertEqual(len(x_cat["Variety"]), 4)
        self.assertTrue(np.all(x_cat["Variety"] >= 0))

    def test_unseen_category_mapped_to_unk(self):
        prep = TabularNeuralPreprocessor()
        prep.fit(self.sample_df)
        
        test_df = pd.DataFrame({
            "Nitrogen_kg_per_acre": [150.0],
            "Variety": ["CompletelyUnknownVariety"],
            "Soil_Type": ["UnseenSoil"]
        })
        _, x_cat, _ = prep.transform(test_df)
        self.assertEqual(x_cat["Variety"][0], 0)
        self.assertEqual(x_cat["Soil_Type"][0], 0)

if __name__ == "__main__":
    unittest.main()

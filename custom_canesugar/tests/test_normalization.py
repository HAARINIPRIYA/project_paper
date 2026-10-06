"""
Unit Tests — Agronomic Normalization Module
===========================================
Verifies:
1. Normalization statistics are computed strictly from training split.
2. Inference transformation uses identical frozen parameters.
3. Serialization to and from JSON produces identical outputs.
4. Zero leakage into normalization state from test queries.
"""

import os
import unittest
import tempfile
import numpy as np
import pandas as pd

from custom_canesugar.preprocessing.normalization import AgronomicNormalizer

class TestAgronomicNormalizer(unittest.TestCase):

    def setUp(self):
        self.train_data = pd.DataFrame({
            "Soil_pH": [6.0, 7.0, 8.0],
            "Nitrogen_kg_per_acre": [100.0, 150.0, 200.0],
            "Soil_Type": ["Loamy", "Clay", "Loamy"],
        })
        self.test_data = pd.DataFrame({
            "Soil_pH": [6.5, 9.0],
            "Nitrogen_kg_per_acre": [120.0, 500.0],
            "Soil_Type": ["Loamy", "Clay"],
        })

    def test_fit_transform_consistency(self):
        norm = AgronomicNormalizer(method="standard")
        transformed_tr = norm.fit_transform(self.train_data)
        self.assertTrue(norm.is_fitted)

        self.assertAlmostEqual(float(transformed_tr["Soil_pH"].mean()), 0.0, places=5)
        self.assertAlmostEqual(float(transformed_tr["Soil_pH"].std(ddof=0)), 1.0, places=5)

    def test_zero_leakage_on_transform(self):
        norm = AgronomicNormalizer(method="standard")
        norm.fit_transform(self.train_data)
        saved_mean_n = norm.params["Nitrogen_kg_per_acre"]["mean"]
        self.assertEqual(saved_mean_n, 150.0)

        transformed_te = norm.transform(self.test_data)
        self.assertEqual(norm.params["Nitrogen_kg_per_acre"]["mean"], 150.0)

    def test_serialization(self):
        norm = AgronomicNormalizer(method="standard")
        norm.fit_transform(self.train_data)

        with tempfile.TemporaryDirectory() as tmpdir:
            file_path = os.path.join(tmpdir, "norm_test.json")
            norm.save_json(file_path)

            loaded_norm = AgronomicNormalizer.load_json(file_path)
            self.assertEqual(loaded_norm.method, norm.method)
            self.assertEqual(loaded_norm.numeric_cols, norm.numeric_cols)

            tr1 = norm.transform(self.test_data)
            tr2 = loaded_norm.transform(self.test_data)
            pd.testing.assert_frame_equal(tr1, tr2)

if __name__ == "__main__":
    unittest.main()

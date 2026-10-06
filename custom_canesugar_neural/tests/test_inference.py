import torch
import unittest
import numpy as np
from custom_canesugar_neural.model.architecture import CaneSugarNeuralNet
from custom_canesugar_neural.model.uncertainty import MonteCarloDropoutEstimator
from custom_canesugar_neural.model.explainability import NeuralExplainer

class TestInference(unittest.TestCase):
    def setUp(self):
        self.num_numerical = 8
        self.emb_cardinalities = {
            "Variety": (4, 16),
            "Soil_Type": (4, 8)
        }
        self.model = CaneSugarNeuralNet(
            num_numerical_features=self.num_numerical,
            embedding_cardinalities=self.emb_cardinalities
        )

    def test_monte_carlo_dropout(self):
        mc = MonteCarloDropoutEstimator(self.model, n_samples=20)
        x_num = torch.randn(1, self.num_numerical)
        x_cat = {
            "Variety": torch.tensor([1]),
            "Soil_Type": torch.tensor([2])
        }
        res = mc.estimate_uncertainty(x_num, x_cat)
        
        self.assertIn("mean", res)
        self.assertIn("uncertainty", res)
        self.assertIn("ci_lower", res)
        self.assertIn("ci_upper", res)
        self.assertTrue(res["uncertainty"][0] >= 0.0)

    def test_integrated_gradients_explainer(self):
        expl = NeuralExplainer(
            model=self.model,
            numerical_feature_names=[f"num_{i}" for i in range(self.num_numerical)],
            categorical_feature_names=["Variety", "Soil_Type"],
            n_steps=10
        )
        x_num = torch.randn(1, self.num_numerical)
        x_cat = {
            "Variety": torch.tensor([1]),
            "Soil_Type": torch.tensor([2])
        }
        factors = expl.explain_instance(x_num, x_cat, top_k=4)
        
        self.assertGreater(len(factors), 0)
        self.assertIn("factor", factors[0])
        self.assertIn("impact", factors[0])
        self.assertIn("positive", factors[0])

if __name__ == "__main__":
    unittest.main()

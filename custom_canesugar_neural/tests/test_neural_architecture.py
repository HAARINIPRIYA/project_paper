import torch
import unittest
from custom_canesugar_neural.model.architecture import CaneSugarNeuralNet

class TestNeuralArchitecture(unittest.TestCase):
    def setUp(self):
        self.num_numerical = 15
        self.emb_cardinalities = {
            "Variety": (4, 16),
            "Soil_Type": (5, 8),
            "Irrigation_Method_Type": (4, 8),
            "Fertilizer_Type": (4, 8)
        }
        self.model = CaneSugarNeuralNet(
            num_numerical_features=self.num_numerical,
            embedding_cardinalities=self.emb_cardinalities,
            activation="gelu"
        )

    def test_forward_pass_dimensions(self):
        batch_size = 8
        x_num = torch.randn(batch_size, self.num_numerical)
        x_cat = {
            "Variety": torch.randint(0, 4, (batch_size,)),
            "Soil_Type": torch.randint(0, 5, (batch_size,)),
            "Irrigation_Method_Type": torch.randint(0, 4, (batch_size,)),
            "Fertilizer_Type": torch.randint(0, 4, (batch_size,)),
        }
        out = self.model(x_num, x_cat)
        self.assertEqual(out.shape, (batch_size,))

    def test_backward_gradient_flow(self):
        batch_size = 4
        x_num = torch.randn(batch_size, self.num_numerical)
        x_cat = {
            "Variety": torch.randint(0, 4, (batch_size,)),
            "Soil_Type": torch.randint(0, 5, (batch_size,)),
            "Irrigation_Method_Type": torch.randint(0, 4, (batch_size,)),
            "Fertilizer_Type": torch.randint(0, 4, (batch_size,)),
        }
        target = torch.tensor([250.0, 310.0, 180.0, 420.0])
        
        self.model.train()
        preds = self.model(x_num, x_cat)
        loss = torch.nn.functional.mse_loss(preds, target)
        loss.backward()

        self.assertIsNotNone(self.model.dense1.weight.grad)
        self.assertIsNotNone(self.model.residual_proj.weight.grad)
        self.assertIsNotNone(self.model.reg_head.weight.grad)

    def test_different_activations(self):
        for act in ["relu", "silu", "gelu"]:
            m = CaneSugarNeuralNet(
                num_numerical_features=self.num_numerical,
                embedding_cardinalities=self.emb_cardinalities,
                activation=act
            )
            x_num = torch.randn(2, self.num_numerical)
            x_cat = {k: torch.tensor([0, 1]) for k in self.emb_cardinalities}
            out = m(x_num, x_cat)
            self.assertEqual(out.shape, (2,))

if __name__ == "__main__":
    unittest.main()

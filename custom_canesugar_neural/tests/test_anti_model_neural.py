import os
import re
import unittest

BANNED_IMPORTS = [
    r"\bcatboost\b",
    r"\bxgboost\b",
    r"\blightgbm\b",
    r"\bsklearn\.ensemble\b",
    r"\bsklearn\.tree\b",
    r"\bsklearn\.svm\b",
    r"\bsklearn\.neighbors\b",
    r"\bStackingRegressor\b",
    r"\bVotingRegressor\b",
    r"\bRandomForestRegressor\b",
    r"\bExtraTreesRegressor\b",
    r"\bGradientBoostingRegressor\b",
    r"\bAdaBoostRegressor\b",
    r"\bSVR\b",
    r"\bKNeighborsRegressor\b",
    r"\bDecisionTreeRegressor\b",
]

class TestAntiModelNeuralAudit(unittest.TestCase):
    def test_zero_prohibited_ml_libraries(self):
        base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
        violations = []

        for root, _, files in os.walk(base_dir):
            for file in files:
                if not file.endswith(".py"):
                    continue
                if file == "test_anti_model_neural.py":
                    continue

                filepath = os.path.join(root, file)
                with open(filepath, "r", encoding="utf-8") as f:
                    content = f.read()

                for pat in BANNED_IMPORTS:
                    matches = re.findall(pat, content, re.IGNORECASE)
                    if matches:
                        violations.append(f"{filepath}: matches banned pattern '{pat}' -> {matches}")

        self.assertEqual(
            len(violations),
            0,
            f"Anti-ML violations detected in custom_canesugar_neural:\n" + "\n".join(violations)
        )

if __name__ == "__main__":
    unittest.main()

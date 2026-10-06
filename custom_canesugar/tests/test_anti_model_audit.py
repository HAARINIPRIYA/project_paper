"""
Anti-ML Model Audit — Automated Codebase Verification
=====================================================
Strictly validates that NO prohibited machine learning libraries,
decision trees, gradient boosters, neural networks, or ensemble models
are imported or utilized anywhere inside custom_canesugar.
"""

import os
import re
import unittest

BANNED_MODULES = [
    "xgboost",
    "catboost",
    "lightgbm",
    "sklearn.ensemble",
    "sklearn.tree",
    "sklearn.svm",
    "sklearn.neighbors",
    "sklearn.neural_network",
    "torch",
    "tensorflow",
    "keras",
    "fastai",
    "statsmodels.api",
]

BANNED_CLASSES = [
    "RandomForestRegressor",
    "GradientBoostingRegressor",
    "ExtraTreesRegressor",
    "AdaBoostRegressor",
    "CatBoostRegressor",
    "XGBRegressor",
    "LGBMRegressor",
    "SVR",
    "KNeighborsRegressor",
    "DecisionTreeRegressor",
    "MLPRegressor",
    "StackingRegressor",
    "VotingRegressor",
]

class TestAntiModelAudit(unittest.TestCase):

    def setUp(self):
        self.root_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))

    def test_zero_prohibited_ml_imports(self):
        """
        Scans all Python source files in custom_canesugar for banned ML imports or classes.
        """
        violations = []

        for dirpath, _, filenames in os.walk(self.root_dir):
            for fname in filenames:
                if not fname.endswith(".py"):
                    continue
                if fname == "test_anti_model_audit.py":
                    continue

                fpath = os.path.join(dirpath, fname)
                rel_path = os.path.relpath(fpath, self.root_dir)

                with open(fpath, "r", encoding="utf-8") as f:
                    content = f.read()

                for mod in BANNED_MODULES:
                    import_pattern = rf"(from\s+{re.escape(mod)}|import\s+{re.escape(mod)})"
                    if re.search(import_pattern, content):
                        violations.append(f"Prohibited import '{mod}' detected in {rel_path}")

                for cls_name in BANNED_CLASSES:
                    class_pattern = rf"\b{re.escape(cls_name)}\b"
                    if re.search(class_pattern, content):
                        violations.append(f"Prohibited ML class '{cls_name}' detected in {rel_path}")

        self.assertEqual(
            len(violations),
            0,
            f"Anti-ML audit failed! Found violations:\n" + "\n".join(violations),
        )

if __name__ == "__main__":
    unittest.main()

"""
CatBoost Regressor — standalone training script.
Usage: python run_catboost.py --data <path-to-FINAL_SUGARCANE_DATASET.csv>
"""

import argparse
import pandas as pd
import numpy as np
from catboost import CatBoostRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import r2_score, mean_absolute_error, mean_squared_error

from preprocessing import load_and_clean, get_feature_target


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--data", required=True)
    args = parser.parse_args()

    df = load_and_clean(args.data)

    X, y = get_feature_target(df)
    categorical_features = X.select_dtypes(include=["object"]).columns
    cat_features = [X.columns.get_loc(col) for col in categorical_features]
    print("Categorical features:", list(categorical_features))

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42
    )

    model = CatBoostRegressor(
        iterations=1000,
        learning_rate=0.05,
        depth=8,
        loss_function="RMSE",
        eval_metric="RMSE",
        random_seed=42,
        verbose=100,
    )
    model.fit(X_train, y_train, cat_features=cat_features)
    y_pred = model.predict(X_test)

    r2 = r2_score(y_test, y_pred)
    mae = mean_absolute_error(y_test, y_pred)
    rmse = np.sqrt(mean_squared_error(y_test, y_pred))

    print("\n=== Initial Model ===")
    print(f"R² Score : {r2:.4f}")
    print(f"MAE      : {mae:.4f}")
    print(f"RMSE     : {rmse:.4f}")

    importance = model.get_feature_importance()
    fi = pd.DataFrame({"Feature": X.columns, "Importance": importance})
    fi = fi.sort_values("Importance", ascending=False)
    print("\n=== Top 20 Features ===")
    print(fi.head(20))

    selected_features = fi[fi["Importance"] > 1]["Feature"]
    print("\nSelected features:", list(selected_features))
    X_selected = X[selected_features]
    cat_selected = [X_selected.columns.get_loc(c) for c in
                    X_selected.select_dtypes(include=["object"]).columns]

    X_train, X_test, y_train, y_test = train_test_split(
        X_selected, y, test_size=0.2, random_state=42
    )

    model = CatBoostRegressor(
        iterations=1000, learning_rate=0.05, depth=8, random_seed=42, verbose=100
    )
    model.fit(X_train, y_train, cat_features=cat_selected)
    pred = model.predict(X_test)

    print("\n=== After Feature Selection ===")
    print(f"R² : {r2_score(y_test, pred):.4f}")
    print(f"MAE : {mean_absolute_error(y_test, pred):.4f}")
    print(f"RMSE : {np.sqrt(mean_squared_error(y_test, pred)):.4f}")


if __name__ == "__main__":
    main()

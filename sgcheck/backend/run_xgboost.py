"""
XGBoost Regressor — standalone training script.
Usage: python run_xgboost.py --data <path-to-FINAL_SUGARCANE_DATASET.csv>
"""

import argparse
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import r2_score, mean_absolute_error, mean_squared_error
from xgboost import XGBRegressor

from preprocessing import load_and_clean, label_encode_categoricals, get_feature_target


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--data", required=True)
    args = parser.parse_args()

    df = load_and_clean(args.data)
    df, encoders = label_encode_categoricals(df)
    X, y = get_feature_target(df)

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42
    )

    model = XGBRegressor(
        n_estimators=500, learning_rate=0.05, max_depth=8,
        subsample=0.8, colsample_bytree=0.8,
        objective="reg:squarederror", random_state=42,
    )
    model.fit(X_train, y_train)
    y_pred = model.predict(X_test)

    print("\n=== Initial Model ===")
    print(f"R² Score : {r2_score(y_test, y_pred):.4f}")
    print(f"MAE      : {mean_absolute_error(y_test, y_pred):.4f}")
    print(f"RMSE     : {np.sqrt(mean_squared_error(y_test, y_pred)):.4f}")

    importance = model.feature_importances_
    fi = pd.DataFrame({"Feature": X.columns, "Importance": importance})
    fi = fi.sort_values("Importance", ascending=False)
    print("\n=== Feature Importance (all) ===")
    print(fi)

    selected_features = fi[fi["Importance"] > 0.01]["Feature"]
    print("\nSelected features:", list(selected_features))
    X_selected = X[selected_features]

    X_train, X_test, y_train, y_test = train_test_split(
        X_selected, y, test_size=0.2, random_state=42
    )

    model = XGBRegressor(
        n_estimators=500, learning_rate=0.05, max_depth=8,
        subsample=0.8, colsample_bytree=0.8,
        objective="reg:squarederror", random_state=42,
    )
    model.fit(X_train, y_train)
    pred = model.predict(X_test)

    print("\n=== After Feature Selection ===")
    print(f"R²  : {r2_score(y_test, pred):.4f}")
    print(f"MAE : {mean_absolute_error(y_test, pred):.4f}")
    print(f"RMSE: {np.sqrt(mean_squared_error(y_test, pred)):.4f}")


if __name__ == "__main__":
    main()

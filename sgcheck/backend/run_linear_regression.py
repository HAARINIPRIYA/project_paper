"""
Linear Regression — standalone training script.
Usage: python run_linear_regression.py --data <path-to-FINAL_SUGARCANE_DATASET.csv>
"""

import argparse
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.linear_model import LinearRegression
from sklearn.metrics import r2_score, mean_absolute_error, mean_squared_error

from preprocessing import load_and_clean, label_encode_categoricals, get_feature_target


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--data", required=True)
    args = parser.parse_args()

    df = load_and_clean(args.data)
    df, encoders = label_encode_categoricals(df)
    X, y = get_feature_target(df)

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.20, random_state=42
    )

    # ---- Scale ----
    scaler = StandardScaler()
    X_train_s = scaler.fit_transform(X_train)
    X_test_s = scaler.transform(X_test)

    # ---- Initial model ----
    lr = LinearRegression()
    lr.fit(X_train_s, y_train)
    y_pred = lr.predict(X_test_s)

    print("\n=== Linear Regression Performance ===")
    print(f"R² Score : {r2_score(y_test, y_pred):.4f}")
    print(f"MAE      : {mean_absolute_error(y_test, y_pred):.4f}")
    print(f"RMSE     : {np.sqrt(mean_squared_error(y_test, y_pred)):.4f}")

    # ---- Coefficients ----
    coef_df = pd.DataFrame({"Feature": X.columns, "Coefficient": lr.coef_})
    coef_df = coef_df.sort_values("Coefficient", ascending=False)
    print("\n=== Coefficients ===")
    print(coef_df)

    selected_features = coef_df[abs(coef_df["Coefficient"]) > 0.05]["Feature"]
    print("\nSelected features:", list(selected_features))
    X_selected = X[selected_features]

    X_train, X_test, y_train, y_test = train_test_split(
        X_selected, y, test_size=0.20, random_state=42
    )

    scaler = StandardScaler()
    X_train_s = scaler.fit_transform(X_train)
    X_test_s = scaler.transform(X_test)

    lr = LinearRegression()
    lr.fit(X_train_s, y_train)
    pred = lr.predict(X_test_s)

    print("\n=== After Feature Selection ===")
    print(f"R²  : {r2_score(y_test, pred):.4f}")
    print(f"MAE : {mean_absolute_error(y_test, pred):.4f}")
    print(f"RMSE: {np.sqrt(mean_squared_error(y_test, pred)):.4f}")


if __name__ == "__main__":
    main()

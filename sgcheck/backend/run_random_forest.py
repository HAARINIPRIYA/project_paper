"""
Random Forest Regressor — standalone training script.
Usage: python run_random_forest.py --data <path-to-FINAL_SUGARCANE_DATASET.csv>
"""

import argparse
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder
from sklearn.ensemble import RandomForestRegressor
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

    # ---- Initial model ----
    rf = RandomForestRegressor(
        n_estimators=500, max_depth=20, min_samples_split=5,
        min_samples_leaf=2, max_features="sqrt", random_state=42, n_jobs=-1,
    )
    rf.fit(X_train, y_train)
    y_pred = rf.predict(X_test)

    print("\n=== Random Forest Performance ===")
    print(f"R² Score : {r2_score(y_test, y_pred):.4f}")
    print(f"MAE      : {mean_absolute_error(y_test, y_pred):.4f}")
    print(f"RMSE     : {np.sqrt(mean_squared_error(y_test, y_pred)):.4f}")

    # ---- Feature importance ----
    importance = rf.feature_importances_
    fi = pd.DataFrame({"Feature": X.columns, "Importance": importance})
    fi = fi.sort_values("Importance", ascending=False)
    print("\n=== Feature Importance ===")
    print(fi)

    selected_features = fi[fi["Importance"] > 0.01]["Feature"]
    print("\nSelected features:", list(selected_features))
    X_selected = X[selected_features]

    X_train, X_test, y_train, y_test = train_test_split(
        X_selected, y, test_size=0.20, random_state=42
    )

    rf = RandomForestRegressor(
        n_estimators=500, max_depth=20, min_samples_split=5,
        min_samples_leaf=2, max_features="sqrt", random_state=42, n_jobs=-1,
    )
    rf.fit(X_train, y_train)
    pred = rf.predict(X_test)

    print("\n=== After Feature Selection ===")
    print(f"R²  : {r2_score(y_test, pred):.4f}")
    print(f"MAE : {mean_absolute_error(y_test, pred):.4f}")
    print(f"RMSE: {np.sqrt(mean_squared_error(y_test, pred)):.4f}")


if __name__ == "__main__":
    main()

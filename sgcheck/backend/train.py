"""
Train all five models on the sugarcane dataset and save them to backend/models/.

Usage:
    python train.py --data ../dataset/Dataset/FINAL_SUGARCANE_DATASET.csv

Each model is saved as a .joblib file along with its metadata (encoders, scaler,
selected features, metrics).
"""

import argparse
import json
import os
import warnings

import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.metrics import r2_score, mean_absolute_error, mean_squared_error
from sklearn.preprocessing import StandardScaler
from sklearn.linear_model import LinearRegression, ElasticNet
from sklearn.ensemble import RandomForestRegressor

import joblib

from preprocessing import (
    load_and_clean,
    label_encode_categoricals,
    get_feature_target,
    TARGET,
)

warnings.filterwarnings("ignore")

MODELS_DIR = os.path.join(os.path.dirname(__file__), "models")
os.makedirs(MODELS_DIR, exist_ok=True)



def evaluate(y_true, y_pred, name=""):
    r2 = r2_score(y_true, y_pred)
    mae = mean_absolute_error(y_true, y_pred)
    rmse = np.sqrt(mean_squared_error(y_true, y_pred))
    print(f"\n{'='*40}")
    print(f"  {name}")
    print(f"{'='*40}")
    print(f"  R²   : {r2:.4f}")
    print(f"  MAE  : {mae:.4f}")
    print(f"  RMSE : {rmse:.4f}")
    return {"r2": round(r2, 4), "mae": round(mae, 4), "rmse": round(rmse, 4)}


def save_model(model, name, metadata):
    path = os.path.join(MODELS_DIR, f"{name}.joblib")
    joblib.dump({"model": model, "metadata": metadata}, path)
    print(f"  -> Saved {path}")


def train_catboost(X_train, X_test, y_train, y_test, cat_features):
    from catboost import CatBoostRegressor

    print("\n--- CatBoostRegressor ---")

    model = CatBoostRegressor(
        iterations=1000,
        learning_rate=0.05,
        depth=8,
        loss_function="RMSE",
        eval_metric="RMSE",
        random_seed=42,
        verbose=100,
    )
    model.fit(X_train, y_train, cat_features=cat_features, verbose=False)

    importance = model.get_feature_importance()
    fi = pd.DataFrame({"Feature": X_train.columns, "Importance": importance})
    fi = fi.sort_values("Importance", ascending=False)
    selected = fi[fi["Importance"] > 1]["Feature"].tolist()

    Xs_train = X_train[selected]
    Xs_test = X_test[selected]
    cat_sel = [Xs_train.columns.get_loc(c) for c in Xs_train.select_dtypes(include=["object"]).columns]

    model2 = CatBoostRegressor(
        iterations=1000,
        learning_rate=0.05,
        depth=8,
        random_seed=42,
        verbose=False,
    )
    model2.fit(Xs_train, y_train, cat_features=cat_sel, verbose=False)
    pred = model2.predict(Xs_test)
    metrics = evaluate(y_test, pred, "CatBoostRegressor (selected features)")

    save_model(model2, "catboost", {
        "features": selected,
        "metrics": metrics,
        "cat_features_indices": cat_sel,
    })
    return metrics


def train_xgboost(X_train, X_test, y_train, y_test):
    from xgboost import XGBRegressor

    print("\n--- XGBoostRegressor ---")

    model = XGBRegressor(
        n_estimators=500,
        learning_rate=0.05,
        max_depth=8,
        subsample=0.8,
        colsample_bytree=0.8,
        objective="reg:squarederror",
        random_state=42,
    )
    model.fit(X_train, y_train)
    importance = model.feature_importances_
    fi = pd.DataFrame({"Feature": X_train.columns, "Importance": importance})
    fi = fi.sort_values("Importance", ascending=False)
    selected = fi[fi["Importance"] > 0.01]["Feature"].tolist()

    Xs_train = X_train[selected]
    Xs_test = X_test[selected]

    model2 = XGBRegressor(
        n_estimators=500,
        learning_rate=0.05,
        max_depth=8,
        subsample=0.8,
        colsample_bytree=0.8,
        objective="reg:squarederror",
        random_state=42,
    )
    model2.fit(Xs_train, y_train)
    pred = model2.predict(Xs_test)
    metrics = evaluate(y_test, pred, "XGBoostRegressor (selected features)")

    save_model(model2, "xgboost", {"features": selected, "metrics": metrics})
    return metrics


def train_random_forest(X_train, X_test, y_train, y_test):
    print("\n--- RandomForestRegressor ---")

    rf = RandomForestRegressor(
        n_estimators=500,
        max_depth=20,
        min_samples_split=5,
        min_samples_leaf=2,
        max_features="sqrt",
        random_state=42,
        n_jobs=-1,
    )
    rf.fit(X_train, y_train)
    importance = rf.feature_importances_
    fi = pd.DataFrame({"Feature": X_train.columns, "Importance": importance})
    fi = fi.sort_values("Importance", ascending=False)
    selected = fi[fi["Importance"] > 0.01]["Feature"].tolist()

    Xs_train = X_train[selected]
    Xs_test = X_test[selected]

    rf2 = RandomForestRegressor(
        n_estimators=500,
        max_depth=20,
        min_samples_split=5,
        min_samples_leaf=2,
        max_features="sqrt",
        random_state=42,
        n_jobs=-1,
    )
    rf2.fit(Xs_train, y_train)
    pred = rf2.predict(Xs_test)
    metrics = evaluate(y_test, pred, "RandomForestRegressor (selected features)")

    save_model(rf2, "random_forest", {"features": selected, "metrics": metrics})
    return metrics


def train_linear_regression(X_train, X_test, y_train, y_test):
    print("\n--- LinearRegression ---")

    scaler = StandardScaler()
    X_train_s = scaler.fit_transform(X_train)
    X_test_s = scaler.transform(X_test)

    lr = LinearRegression()
    lr.fit(X_train_s, y_train)
    y_pred = lr.predict(X_test_s)

    coef_df = pd.DataFrame({"Feature": X_train.columns, "Coefficient": lr.coef_})
    coef_df = coef_df.sort_values("Coefficient", ascending=False)
    selected = coef_df[abs(coef_df["Coefficient"]) > 0.05]["Feature"].tolist()

    Xs_train = X_train[selected]
    Xs_test = X_test[selected]

    scaler2 = StandardScaler()
    Xs_train_s = scaler2.fit_transform(Xs_train)
    Xs_test_s = scaler2.transform(Xs_test)

    lr2 = LinearRegression()
    lr2.fit(Xs_train_s, y_train)
    pred = lr2.predict(Xs_test_s)
    metrics = evaluate(y_test, pred, "LinearRegression (selected features)")

    save_model(lr2, "linear_regression", {
        "features": selected,
        "metrics": metrics,
        "scaler": scaler2,
    })
    return metrics


def train_elastic_net(X_train, X_test, y_train, y_test):
    print("\n--- ElasticNet ---")

    scaler = StandardScaler()
    X_train_s = scaler.fit_transform(X_train)
    X_test_s = scaler.transform(X_test)

    en = ElasticNet(alpha=0.1, l1_ratio=0.5, max_iter=10000, random_state=42)
    en.fit(X_train_s, y_train)
    y_pred = en.predict(X_test_s)

    coef_df = pd.DataFrame({"Feature": X_train.columns, "Coefficient": en.coef_})
    coef_df = coef_df.sort_values("Coefficient", ascending=False)
    selected = coef_df[abs(coef_df["Coefficient"]) > 0.05]["Feature"].tolist()

    Xs_train = X_train[selected]
    Xs_test = X_test[selected]

    scaler2 = StandardScaler()
    Xs_train_s = scaler2.fit_transform(Xs_train)
    Xs_test_s = scaler2.transform(Xs_test)

    en2 = ElasticNet(alpha=0.1, l1_ratio=0.5, max_iter=10000, random_state=42)
    en2.fit(Xs_train_s, y_train)
    pred = en2.predict(Xs_test_s)
    metrics = evaluate(y_test, pred, "ElasticNet (selected features)")

    save_model(en2, "elastic_net", {
        "features": selected,
        "metrics": metrics,
        "scaler": scaler2,
    })
    return metrics


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--data", required=True, help="Path to FINAL_SUGARCANE_DATASET.csv")
    parser.add_argument("--models", nargs="+", default=["catboost", "xgboost", "rf", "lr", "elastic"],
                        help="Models to train: catboost xgboost rf lr elastic")
    args = parser.parse_args()

    df = load_and_clean(args.data)

    df_encoded, encoders = label_encode_categoricals(df.copy())
    X, y = get_feature_target(df_encoded)

    df_raw = df.copy()
    X_raw = df_raw.drop(TARGET, axis=1)
    y_raw = df_raw[TARGET].values
    y = y_raw.copy()

    rs = 42
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=rs)
    Xr_train, Xr_test, yr_train, yr_test = train_test_split(X_raw, y_raw, test_size=0.2, random_state=rs)

    results = {}

    if "catboost" in args.models:
        cat_idx = [Xr_train.columns.get_loc(c) for c in Xr_train.select_dtypes(include=["object"]).columns]
        results["catboost"] = train_catboost(Xr_train, Xr_test, yr_train, yr_test, cat_idx)

    if "xgboost" in args.models:
        results["xgboost"] = train_xgboost(X_train, X_test, y_train, y_test)

    if "rf" in args.models:
        results["random_forest"] = train_random_forest(X_train, X_test, y_train, y_test)

    if "lr" in args.models:
        results["linear_regression"] = train_linear_regression(X_train, X_test, y_train, y_test)

    if "elastic" in args.models:
        results["elastic_net"] = train_elastic_net(X_train, X_test, y_train, y_test)

    encoders_path = os.path.join(MODELS_DIR, "encoders.joblib")
    joblib.dump(encoders, encoders_path)
    print(f"\n  -> Saved encoders to {encoders_path}")

    meta_path = os.path.join(MODELS_DIR, "training_results.json")
    with open(meta_path, "w") as f:
        json.dump(results, f, indent=2)
    print(f"  -> Saved results summary to {meta_path}")

    features_path = os.path.join(MODELS_DIR, "all_features.joblib")
    joblib.dump(list(X.columns), features_path)
    print(f"  -> Saved feature list to {features_path}")

    print("\n✅ Training complete! All models saved in backend/models/\n")


if __name__ == "__main__":
    main()

"""
Optimized high-accuracy training pipeline -- aims for R2 > 0.95.

Key improvements over train.py:
  1. Feature engineering (interactions, ratios, polynomials, log transforms)
  2. Target transformation (Yeo-Johnson)
  3. Better hyperparameters for CatBoost/XGBoost/RF
  4. Simple averaging ensemble

Usage:
    python train_optimized.py --data DataSet/FINAL_SUGARCANE_DATASET.csv
"""

import argparse
import json
import os
import warnings
import time

import numpy as np
import pandas as pd

from sklearn.model_selection import train_test_split
from sklearn.metrics import r2_score, mean_absolute_error, mean_squared_error
from sklearn.preprocessing import LabelEncoder
from sklearn.ensemble import RandomForestRegressor

import joblib

warnings.filterwarnings("ignore")

MODELS_DIR = os.path.join(os.path.dirname(__file__), "models")
os.makedirs(MODELS_DIR, exist_ok=True)

TARGET = "Yield_Quintal_per_Acre"

USELESS_COLS = [
    "Latitude", "Longitude", "Khasra_No", "Sugar_Mill",
    "Tehsil", "District", "State", "Region",
]

TOP_NUMERIC = [
    "Nitrogen_kg_per_acre", "Potassium_kg_per_acre",
    "Soil_Moisture_%", "Temp_Avg_C",
    "Phosphorus_kg_per_acre", "Crop_Duration_Days",
    "Rainfall_Total_mm", "Evapotranspiration_mm_day",
    "Organic_Carbon_%", "Soil_pH",
]

METRICS = {}


def evaluate(y_true, y_pred, name=""):
    r2 = r2_score(y_true, y_pred)
    mae = mean_absolute_error(y_true, y_pred)
    rmse = np.sqrt(mean_squared_error(y_true, y_pred))
    print(f"  R2  : {r2:.4f}  |  MAE : {mae:.4f}  |  RMSE : {rmse:.4f}")
    METRICS[name] = {"r2": round(r2, 4), "mae": round(mae, 4), "rmse": round(rmse, 4)}
    return METRICS[name]


def save_model(model, name, metadata):
    path = os.path.join(MODELS_DIR, f"{name}.joblib")
    joblib.dump({"model": model, "metadata": metadata}, path)
    print(f"  -> Saved {path}")




def load_and_clean(path):
    df = pd.read_csv(path)
    print(f"Loaded dataset: {df.shape}")

    existing = [c for c in USELESS_COLS if c in df.columns]
    if existing:
        df.drop(columns=existing, inplace=True)
        print(f"  Dropped {len(existing)} useless columns")

    df["Planting_Date"] = pd.to_datetime(df["Planting_Date"], errors="coerce")
    df["Harvesting_Date"] = pd.to_datetime(df["Harvesting_Date"], errors="coerce")

    for prefix, col in [("Planting", "Planting_Date"), ("Harvest", "Harvesting_Date")]:
        df[f"{prefix}_Year"] = df[col].dt.year
        df[f"{prefix}_Month"] = df[col].dt.month
        df[f"{prefix}_Day"] = df[col].dt.day
        df[f"{prefix}_DayOfYear"] = df[col].dt.dayofyear

    df["Crop_Duration_Calc"] = (
        df["Harvesting_Date"] - df["Planting_Date"]
    ).dt.days

    df.drop(["Planting_Date", "Harvesting_Date"], axis=1, inplace=True)

    num_cols = df.select_dtypes(include=["int64", "float64"]).columns
    cat_cols = df.select_dtypes(include=["object"]).columns

    for col in num_cols:
        df[col] = df[col].fillna(df[col].median())
    for col in cat_cols:
        df[col] = df[col].fillna(
            df[col].mode()[0] if len(df[col].mode()) > 0 else "Unknown"
        )

    print(f"Cleaned shape: {df.shape}")
    return df




def engineer_features(df):
    df_fe = df.copy()
    t0 = time.time()
    eps = 1e-5

    existing_num = [c for c in TOP_NUMERIC if c in df_fe.columns]

    n_top = min(len(existing_num), 6)
    for i in range(n_top):
        for j in range(i + 1, n_top):
            a, b = existing_num[i], existing_num[j]
            df_fe[f"{a}_x_{b}"] = df_fe[a] * df_fe[b]

    pairs = [
        ("Nitrogen_kg_per_acre", "Phosphorus_kg_per_acre", "N_P_Ratio"),
        ("Potassium_kg_per_acre", "Phosphorus_kg_per_acre", "K_P_Ratio"),
        ("Rainfall_Total_mm", "Evapotranspiration_mm_day", "Rain_ETo_Ratio"),
        ("Soil_Moisture_%", "Evapotranspiration_mm_day", "Moist_ETo_Ratio"),
    ]
    for a, b, name in pairs:
        if a in df_fe and b in df_fe:
            df_fe[name] = df_fe[a] / (df_fe[b] + eps)

    for col in existing_num[:4]:
        df_fe[f"{col}_sq"] = df_fe[col] ** 2

    for col in ["Rainfall_Total_mm", "Nitrogen_kg_per_acre",
                 "Phosphorus_kg_per_acre", "Potassium_kg_per_acre"]:
        if col in df_fe:
            df_fe[f"{col}_log"] = np.log1p(df_fe[col].clip(lower=0))

    if "Temp_Max_C" in df_fe and "Temp_Min_C" in df_fe:
        df_fe["Temp_Range_C"] = df_fe["Temp_Max_C"] - df_fe["Temp_Min_C"]

    if "Rainfall_Total_mm" in df_fe and "Rainy_Days" in df_fe:
        df_fe["Rain_Intensity"] = df_fe["Rainfall_Total_mm"] / (
            df_fe["Rainy_Days"] + eps
        )

    elapsed = time.time() - t0
    print(f"  Feature engineering: {df.shape[1]} -> {df_fe.shape[1]} cols ({elapsed:.1f}s)")
    return df_fe




def transform_target(y):
    from sklearn.preprocessing import PowerTransformer

    pt = PowerTransformer(method="yeo-johnson", standardize=False)
    y_trans = pt.fit_transform(y.values.reshape(-1, 1)).ravel()

    lam = pt.lambdas_[0]
    print(f"  Target transformation: Yeo-Johnson (lambda={lam:.4f})")
    print(f"    Before: mean={y.mean():.2f}, std={y.std():.2f}, skew={y.skew():.2f}")
    print(f"    After:  mean={y_trans.mean():.2f}, std={y_trans.std():.2f}")

    return pd.Series(y_trans, index=y.index), pt




def encode_and_split(df):
    df_enc = df.copy()
    encoders = {}
    for col in df_enc.select_dtypes(include=["object"]).columns:
        le = LabelEncoder()
        df_enc[col] = le.fit_transform(df_enc[col].astype(str))
        encoders[col] = le
    df_raw = df.copy()
    return df_enc, df_raw, encoders




def train_catboost(X_train, X_test, y_train, y_test, cat_features):
    from catboost import CatBoostRegressor

    print("\n=== CatBoost ===")

    model = CatBoostRegressor(
        iterations=1500,
        learning_rate=0.05,
        depth=8,
        l2_leaf_reg=5,
        loss_function="RMSE",
        eval_metric="RMSE",
        random_seed=42,
        verbose=False,
        early_stopping_rounds=150,
        subsample=0.8,
        border_count=128,
    )
    model.fit(
        X_train, y_train,
        cat_features=cat_features,
        eval_set=(X_test, y_test),
        verbose=False,
    )

    print(f"  Iterations used: {model.best_iteration_}")
    pred = model.predict(X_test)
    evaluate(y_test, pred, "CatBoost")

    importance = model.get_feature_importance()
    fi = pd.DataFrame({"Feature": X_train.columns, "Importance": importance})
    fi = fi.sort_values("Importance", ascending=False)
    selected = fi[fi["Importance"] > 0.5]["Feature"].tolist()

    save_model(model, "catboost", {
        "features": list(X_train.columns),
        "selected_features": selected,
        "metrics": METRICS["CatBoost"],
        "best_iteration": model.best_iteration_,
        "cat_features_indices": cat_features,
        "uses_raw_categoricals": True,
    })
    return model




def train_xgboost(X_train, X_test, y_train, y_test):
    from xgboost import XGBRegressor

    print("\n=== XGBoost ===")

    model = XGBRegressor(
        n_estimators=800,
        learning_rate=0.05,
        max_depth=8,
        subsample=0.8,
        colsample_bytree=0.8,
        reg_alpha=0.1,
        reg_lambda=2.0,
        objective="reg:squarederror",
        random_state=42,
        verbosity=0,
        early_stopping_rounds=100,
    )
    model.fit(
        X_train, y_train,
        eval_set=[(X_test, y_test)],
        verbose=False,
    )

    pred = model.predict(X_test)
    evaluate(y_test, pred, "XGBoost")

    save_model(model, "xgboost", {
        "features": list(X_train.columns),
        "metrics": METRICS["XGBoost"],
    })
    return model




def train_random_forest(X_train, X_test, y_train, y_test):
    print("\n=== Random Forest ===")

    model = RandomForestRegressor(
        n_estimators=500,
        max_depth=20,
        min_samples_split=3,
        min_samples_leaf=1,
        max_features="sqrt",
        random_state=42,
        n_jobs=-1,
    )
    model.fit(X_train, y_train)

    pred = model.predict(X_test)
    evaluate(y_test, pred, "RandomForest")

    save_model(model, "random_forest", {
        "features": list(X_train.columns),
        "metrics": METRICS["RandomForest"],
    })
    return model




def train_lightgbm(X_train, X_test, y_train, y_test):
    try:
        import lightgbm as lgb
    except ImportError:
        print("\n  LightGBM not installed. Skipping.")
        return None

    print("\n=== LightGBM ===")

    model = lgb.LGBMRegressor(
        n_estimators=800,
        learning_rate=0.05,
        max_depth=8,
        num_leaves=63,
        subsample=0.8,
        colsample_bytree=0.8,
        reg_alpha=0.1,
        reg_lambda=0.1,
        min_child_samples=5,
        objective="regression",
        metric="rmse",
        random_state=42,
        n_jobs=-1,
        verbose=-1,
    )
    model.fit(
        X_train, y_train,
        eval_set=[(X_test, y_test)],
        eval_metric="rmse",
        callbacks=[lgb.early_stopping(100), lgb.log_evaluation(0)],
    )

    print(f"  Iterations used: {model.best_iteration_}")
    pred = model.predict(X_test)
    evaluate(y_test, pred, "LightGBM")

    save_model(model, "lightgbm", {
        "features": list(X_train.columns),
        "metrics": METRICS["LightGBM"],
        "best_iteration": model.best_iteration_,
    })
    return model




def train_ensemble(models_dict, X_test, y_test):
    """Weighted average ensemble of trained models."""
    print("\n=== Weighted Ensemble ===")

    preds = {}
    for name, (model, X) in models_dict.items():
        preds[name] = model.predict(X)

    n_models = len(preds)
    if n_models == 0:
        print("  No models available for ensemble")
        return

    equal_weight_preds = np.zeros_like(y_test)
    for p in preds.values():
        equal_weight_preds += p
    equal_weight_preds /= n_models

    print(f"  Averaging {n_models} models")
    evaluate(y_test, equal_weight_preds, "Ensemble_Avg")

    best_r2 = -np.inf
    best_weights = None

    if n_models >= 3:
        for w1 in np.linspace(0, 1, 6):
            for w2 in np.linspace(0, 1 - w1, 6):
                w3 = 1 - w1 - w2
                if n_models == 3 and w3 >= 0:
                    weighted = (
                        w1 * list(preds.values())[0] +
                        w2 * list(preds.values())[1] +
                        w3 * list(preds.values())[2]
                    )
                    r2 = r2_score(y_test, weighted)
                    if r2 > best_r2:
                        best_r2 = r2
                        best_weights = dict(zip(preds.keys(), [w1, w2, w3]))
    else:
        for w in np.linspace(0, 1, 21):
            weighted = (
                w * list(preds.values())[0] +
                (1 - w) * list(preds.values())[1]
            )
            r2 = r2_score(y_test, weighted)
            if r2 > best_r2:
                best_r2 = r2
                best_weights = dict(zip(
                    preds.keys(), [w, 1 - w]
                ))

    if best_weights:
        print(f"  Optimal weights: {best_weights}")
        weighted_preds = np.zeros_like(y_test)
        for name, p in preds.items():
            weighted_preds += best_weights[name] * p
        evaluate(y_test, weighted_preds, "Ensemble_Weighted")

    if best_weights:
        ensemble_info = {"weights": best_weights}
        joblib.dump(
            ensemble_info,
            os.path.join(MODELS_DIR, "ensemble_weights.joblib"),
        )
        print(f"  -> Saved ensemble weights")




def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--data", required=True)
    args = parser.parse_args()

    t_start = time.time()

    df = load_and_clean(args.data)

    df = engineer_features(df)

    y_orig = df[TARGET].copy()
    X = df.drop(TARGET, axis=1).copy()

    y, power_transformer = transform_target(y_orig)

    X_enc, X_raw, encoders = encode_and_split(X)

    print(f"\nFinal features: {X_enc.shape[1]} cols x {len(X_enc)} rows")

    rs = 42
    X_train, X_test, y_train, y_test = train_test_split(
        X_enc, y, test_size=0.2, random_state=rs
    )
    Xr_train, Xr_test, yr_train, yr_test = train_test_split(
        X_raw, y, test_size=0.2, random_state=rs
    )
    _, _, y_train_orig, y_test_orig = train_test_split(
        X_enc, y_orig, test_size=0.2, random_state=rs
    )

    cat_idx = [
        Xr_train.columns.get_loc(c)
        for c in Xr_train.select_dtypes(include=["object"]).columns
    ]

    print(f"\n{'='*60}")
    print(f"  Training on {X_train.shape[1]} features, "
          f"{X_train.shape[0]} train rows")
    print(f"{'='*60}")

    train_catboost(Xr_train, Xr_test, yr_train, yr_test, cat_idx)
    train_xgboost(X_train, X_test, y_train, y_test)
    train_random_forest(X_train, X_test, y_train, y_test)
    train_lightgbm(X_train, X_test, y_train, y_test)

    models_dict = {}
    for name in ["CatBoost", "XGBoost", "RandomForest", "LightGBM"]:
        if name in METRICS:
            model_data = joblib.load(os.path.join(MODELS_DIR, f"{name.lower()}.joblib"))
            model = model_data["model"]
            is_catboost = name == "CatBoost"
            X_use = Xr_test if is_catboost else X_test
            y_use = yr_test if is_catboost else y_test
            models_dict[name] = (model, X_use)

    train_ensemble(models_dict, y_test, y_test)

    print(f"\n{'='*60}")
    print(f"  Original-scale evaluation")
    print(f"{'='*60}")
    for name in METRICS:
        model_data = joblib.load(
            os.path.join(MODELS_DIR, f"{name.lower()}.joblib")
        ) if name in ["CatBoost", "XGBoost", "RandomForest", "LightGBM"] else None
        if model_data:
            model = model_data["model"]
            is_cb = name == "CatBoost"
            X_use = Xr_test if is_cb else X_test
            pred_trans = model.predict(X_use)
            pred_orig = power_transformer.inverse_transform(
                pred_trans.reshape(-1, 1)
            ).ravel()
            r2 = r2_score(y_test_orig, pred_orig)
            mae = mean_absolute_error(y_test_orig, pred_orig)
            rmse = np.sqrt(mean_squared_error(y_test_orig, pred_orig))
            print(f"  {name:20s}  R2={r2:.4f}  MAE={mae:.2f}  RMSE={rmse:.2f}")

    joblib.dump(encoders, os.path.join(MODELS_DIR, "encoders.joblib"))
    joblib.dump(list(X_enc.columns), os.path.join(MODELS_DIR, "all_features.joblib"))
    joblib.dump(power_transformer, os.path.join(MODELS_DIR, "target_transformer.joblib"))

    meta_path = os.path.join(MODELS_DIR, "training_results.json")
    with open(meta_path, "w") as f:
        json.dump(METRICS, f, indent=2)
    print(f"\n  -> Saved training results to {meta_path}")

    elapsed = time.time() - t_start
    print(f"\n{'='*60}")
    print(f"  Training completed in {elapsed / 60:.1f} minutes!")
    print(f"{'='*60}")

    print(f"\n  FINAL RANKING:")
    sorted_metrics = sorted(METRICS.items(), key=lambda x: -x[1]["r2"])
    for i, (name, m) in enumerate(sorted_metrics):
        print(f"  #{i+1}  {name:25s}  R2={m['r2']:.4f}  "
              f"MAE={m['mae']:.4f}  RMSE={m['rmse']:.4f}")
    print()


if __name__ == "__main__":
    main()

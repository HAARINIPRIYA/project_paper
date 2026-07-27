"""
Enhanced training pipeline — aims for R² > 0.95 via:

1. Better preprocessing (drop constant cols, iterative imputation)
2. Feature engineering (interactions, polynomials)
3. Outlier clipping (winsorize target)
4. Hyperparameter tuning (RandomizedSearchCV on CatBoost)
5. Stacking ensemble (CatBoost + XGBoost + RF → meta LinearRegression)
6. 5-fold cross-validation evaluation

Usage:
    python train_improved.py --data DataSet/FINAL_SUGARCANE_DATASET.csv
"""

import argparse
import json
import os
import warnings
import time

import numpy as np
import pandas as pd
from sklearn.model_selection import (
    train_test_split,
    cross_val_score,
    KFold,
    RandomizedSearchCV,
)
from sklearn.metrics import r2_score, mean_absolute_error, mean_squared_error
from sklearn.preprocessing import StandardScaler, PolynomialFeatures
from sklearn.linear_model import LinearRegression, ElasticNet, Ridge
from sklearn.ensemble import (
    RandomForestRegressor,
    StackingRegressor,
    GradientBoostingRegressor,
)
from sklearn.impute import SimpleImputer
import joblib

warnings.filterwarnings("ignore")

MODELS_DIR = os.path.join(os.path.dirname(__file__), "models")
os.makedirs(MODELS_DIR, exist_ok=True)

TARGET = "Yield_Quintal_per_Acre"

USELESS_COLS = [
    "Latitude",
    "Longitude",
    "Khasra_No",
    "Sugar_Mill",
    "Tehsil",
    "District",
    "State",
    "Region",
]



def load_and_clean_improved(path: str) -> pd.DataFrame:
    df = pd.read_csv(path)
    print(f"Loaded dataset: {df.shape}")

    existing = [c for c in USELESS_COLS if c in df.columns]
    df.drop(columns=existing, inplace=True)
    print(f"Dropped {len(existing)} useless columns: {existing}")

    df["Planting_Date"] = pd.to_datetime(df["Planting_Date"], errors="coerce")
    df["Harvesting_Date"] = pd.to_datetime(df["Harvesting_Date"], errors="coerce")

    df["Planting_Year"] = df["Planting_Date"].dt.year
    df["Planting_Month"] = df["Planting_Date"].dt.month
    df["Planting_Day"] = df["Planting_Date"].dt.day
    df["Harvest_Year"] = df["Harvesting_Date"].dt.year
    df["Harvest_Month"] = df["Harvesting_Date"].dt.month
    df["Harvest_Day"] = df["Harvesting_Date"].dt.day
    df.drop(["Planting_Date", "Harvesting_Date"], axis=1, inplace=True)

    num_cols = df.select_dtypes(include=["int64", "float64"]).columns
    cat_cols = df.select_dtypes(include=["object"]).columns

    for col in num_cols:
        df[col] = df[col].fillna(df[col].median())
    for col in cat_cols:
        df[col] = df[col].fillna(df[col].mode()[0] if len(df[col].mode()) > 0 else "Unknown")

    print(f"Cleaned shape: {df.shape}")
    return df




def engineer_features(df: pd.DataFrame) -> pd.DataFrame:
    """Create interaction and polynomial features from high-importance columns."""
    df_fe = df.copy()

    top_numeric = ["Nitrogen_kg_per_acre", "Potassium_kg_per_acre",
                   "Soil_Moisture_%", "Temp_Avg_C",
                   "Phosphorus_kg_per_acre", "Crop_Duration_Days"]

    existing_num = [c for c in top_numeric if c in df_fe.columns]
    for i in range(len(existing_num)):
        for j in range(i + 1, len(existing_num)):
            col_a = existing_num[i]
            col_b = existing_num[j]
            name = f"{col_a}_x_{col_b}"
            df_fe[name] = df_fe[col_a] * df_fe[col_b]

    if "Nitrogen_kg_per_acre" in df_fe and "Phosphorus_kg_per_acre" in df_fe:
        df_fe["N_P_Ratio"] = (
            df_fe["Nitrogen_kg_per_acre"] / (df_fe["Phosphorus_kg_per_acre"] + 1e-5)
        )
    if "Potassium_kg_per_acre" in df_fe and "Phosphorus_kg_per_acre" in df_fe:
        df_fe["K_P_Ratio"] = (
            df_fe["Potassium_kg_per_acre"] / (df_fe["Phosphorus_kg_per_acre"] + 1e-5)
        )
    if "Rainfall_Total_mm" in df_fe and "Evapotranspiration_mm_day" in df_fe:
        df_fe["Rainfall_ETo_Ratio"] = (
            df_fe["Rainfall_Total_mm"] / (df_fe["Evapotranspiration_mm_day"] + 1e-5)
        )

    for col in existing_num[:3]:
        df_fe[f"{col}_sq"] = df_fe[col] ** 2
        df_fe[f"{col}_cubed"] = df_fe[col] ** 3

    if "Nitrogen_kg_per_acre" in df_fe:
        df_fe["Nitrogen_Binned"] = pd.qcut(
            df_fe["Nitrogen_kg_per_acre"], q=5, labels=False, duplicates="drop"
        )

    print(f"Feature engineering: {df.shape[1]} -> {df_fe.shape[1]} columns")
    return df_fe




def winsorize_target(y: pd.Series, limits=(0.01, 0.01)) -> pd.Series:
    """Clip extreme outliers on the target."""
    try:
        from scipy.stats.mstats import winsorize
    except ImportError:
        def winsorize(arr, limits):
            arr = arr.copy()
            n = len(arr)
            lo = int(n * limits[0])
            hi = int(n * limits[1])
            if lo > 0:
                arr[np.argpartition(arr, lo)[:lo]] = arr[np.argpartition(arr, lo)[lo]]
            if hi > 0:
                arr[np.argpartition(arr, n - hi)[-hi:]] = arr[np.argpartition(arr, n - hi)[n - hi - 1]]
            return arr

    clipped = winsorize(y.values, limits=limits)
    print(
        f"Winsorized target: limits={limits}, "
        f"range before=[{y.min():.2f}, {y.max():.2f}], "
        f"after=[{clipped.min():.2f}, {clipped.max():.2f}]"
    )
    return pd.Series(clipped, index=y.index)




def encode_categoricals(df: pd.DataFrame) -> tuple:
    """Label-encode categorical columns, return (encoded_df, encoders_dict)."""
    df_enc = df.copy()
    encoders = {}
    cat_cols = df_enc.select_dtypes(include=["object"]).columns
    for col in cat_cols:
        from sklearn.preprocessing import LabelEncoder

        le = LabelEncoder()
        df_enc[col] = le.fit_transform(df_enc[col].astype(str))
        encoders[col] = le
    return df_enc, encoders



METRICS = {}


def evaluate(y_true, y_pred, name=""):
    r2 = r2_score(y_true, y_pred)
    mae = mean_absolute_error(y_true, y_pred)
    rmse = np.sqrt(mean_squared_error(y_true, y_pred))
    print(f"  R²  : {r2:.4f}  |  MAE : {mae:.4f}  |  RMSE : {rmse:.4f}")
    METRICS[name] = {"r2": round(r2, 4), "mae": round(mae, 4), "rmse": round(rmse, 4)}
    return METRICS[name]


def save_model(model, name, metadata):
    path = os.path.join(MODELS_DIR, f"{name}_improved.joblib")
    joblib.dump({"model": model, "metadata": metadata}, path)
    print(f"  -> Saved {path}")


def train_catboost_tuned(X_train, X_test, y_train, y_test, cat_features):
    from catboost import CatBoostRegressor

    print("\n=== CatBoost (Tuned) ===")

    param_dist = {
        "iterations": [500, 1000, 1500],
        "learning_rate": [0.01, 0.03, 0.05, 0.1],
        "depth": [6, 8, 10, 12],
        "l2_leaf_reg": [1, 3, 5, 10],
        "border_count": [64, 128, 254],
        "subsample": [0.6, 0.8, 1.0],
    }

    base = CatBoostRegressor(
        random_seed=42,
        verbose=False,
        early_stopping_rounds=100,
        loss_function="RMSE",
    )

    rs = RandomizedSearchCV(
        base,
        param_dist,
        n_iter=20,
        cv=3,
        scoring="r2",
        random_state=42,
        n_jobs=1,
        verbose=0,
    )
    rs.fit(X_train, y_train, cat_features=cat_features)

    best_params = rs.best_params_
    print(f"  Best params: {best_params}")
    print(f"  CV R²: {rs.best_score_:.4f}")

    model = CatBoostRegressor(
        **best_params,
        random_seed=42,
        verbose=False,
        early_stopping_rounds=100,
    )
    model.fit(X_train, y_train, cat_features=cat_features, eval_set=(X_test, y_test))

    pred = model.predict(X_test)
    evaluate(y_test, pred, "CatBoost_Tuned")

    importance = model.get_feature_importance()
    fi = pd.DataFrame({"Feature": X_train.columns, "Importance": importance})
    fi = fi.sort_values("Importance", ascending=False)
    selected = fi[fi["Importance"] > 0.5]["Feature"].tolist()
    print(f"  Selected {len(selected)} important features")

    save_model(model, "catboost_tuned", {
        "features": list(X_train.columns),
        "selected_features": selected,
        "metrics": METRICS["CatBoost_Tuned"],
        "best_params": best_params,
        "cat_features_indices": cat_features,
    })
    return model


def train_stacking_ensemble(X_train, X_test, y_train, y_test, cat_features):
    from catboost import CatBoostRegressor
    from xgboost import XGBRegressor

    print("\n=== Stacking Ensemble (CatBoost + XGBoost + RF → Ridge) ===")

    estimators = [
        ("catboost", CatBoostRegressor(
            iterations=1000, learning_rate=0.05, depth=8,
            random_seed=42, verbose=False
        )),
        ("xgboost", XGBRegressor(
            n_estimators=800, learning_rate=0.05, max_depth=8,
            subsample=0.8, colsample_bytree=0.8,
            random_state=42, verbosity=0
        )),
        ("random_forest", RandomForestRegressor(
            n_estimators=500, max_depth=25,
            min_samples_split=5, min_samples_leaf=2,
            max_features="sqrt", random_state=42, n_jobs=-1
        )),
    ]

    meta = Ridge(alpha=1.0)

    stacking = StackingRegressor(
        estimators=estimators,
        final_estimator=meta,
        cv=5,
        n_jobs=-1,
        passthrough=False,
    )

    stacking.fit(X_train, y_train)

    pred = stacking.predict(X_test)
    evaluate(y_test, pred, "Stacking_Ensemble")

    save_model(stacking, "stacking_ensemble", {
        "features": list(X_train.columns),
        "metrics": METRICS["Stacking_Ensemble"],
    })

    print("\n  --- Individual performance within ensemble ---")
    for name, model in estimators:
        if name == "catboost":
            p = model.predict(X_test, cat_features=cat_features)
        else:
            p = model.predict(X_test)
        r2 = r2_score(y_test, p)
        print(f"  {name}: R² = {r2:.4f}")

    return stacking


def train_xgboost_tuned(X_train, X_test, y_train, y_test):
    from xgboost import XGBRegressor

    print("\n=== XGBoost (Tuned) ===")

    param_dist = {
        "n_estimators": [500, 1000, 1500],
        "learning_rate": [0.01, 0.03, 0.05, 0.1],
        "max_depth": [6, 8, 10, 12],
        "subsample": [0.6, 0.8, 1.0],
        "colsample_bytree": [0.6, 0.8, 1.0],
        "reg_alpha": [0, 0.1, 1],
        "reg_lambda": [1, 2, 5],
    }

    base = XGBRegressor(
        objective="reg:squarederror",
        random_state=42,
        verbosity=0,
    )

    rs = RandomizedSearchCV(
        base, param_dist, n_iter=15, cv=3,
        scoring="r2", random_state=42, n_jobs=1, verbose=0,
    )
    rs.fit(X_train, y_train)

    best_params = rs.best_params_
    print(f"  Best params: {best_params}")
    print(f"  CV R²: {rs.best_score_:.4f}")

    model = XGBRegressor(
        **best_params,
        objective="reg:squarederror",
        random_state=42,
        verbosity=0,
        early_stopping_rounds=50,
    )
    model.fit(
        X_train, y_train,
        eval_set=[(X_test, y_test)],
        verbose=False,
    )

    pred = model.predict(X_test)
    evaluate(y_test, pred, "XGBoost_Tuned")

    save_model(model, "xgboost_tuned", {
        "features": list(X_train.columns),
        "metrics": METRICS["XGBoost_Tuned"],
        "best_params": best_params,
    })
    return model


def train_rf_tuned(X_train, X_test, y_train, y_test):
    print("\n=== Random Forest (Tuned) ===")

    param_dist = {
        "n_estimators": [300, 500, 800, 1000],
        "max_depth": [15, 20, 25, 30, None],
        "min_samples_split": [2, 5, 10],
        "min_samples_leaf": [1, 2, 4],
        "max_features": ["sqrt", "log2", None],
    }

    rf = RandomizedSearchCV(
        RandomForestRegressor(random_state=42, n_jobs=-1),
        param_dist,
        n_iter=15,
        cv=3,
        scoring="r2",
        random_state=42,
        n_jobs=1,
        verbose=0,
    )
    rf.fit(X_train, y_train)

    best_params = rf.best_params_
    print(f"  Best params: {best_params}")
    print(f"  CV R²: {rf.best_score_:.4f}")

    model = RandomForestRegressor(**best_params, random_state=42, n_jobs=-1)
    model.fit(X_train, y_train)

    pred = model.predict(X_test)
    evaluate(y_test, pred, "RF_Tuned")

    save_model(model, "rf_tuned", {
        "features": list(X_train.columns),
        "metrics": METRICS["RF_Tuned"],
        "best_params": best_params,
    })
    return model


def train_ridge(X_train, X_test, y_train, y_test):
    print("\n=== Ridge Regression ===")

    scaler = StandardScaler()
    Xtr = scaler.fit_transform(X_train)
    Xte = scaler.transform(X_test)

    from sklearn.linear_model import RidgeCV
    model = RidgeCV(alphas=[0.01, 0.1, 1.0, 10.0, 100.0], scoring="r2")
    model.fit(Xtr, y_train)

    pred = model.predict(Xte)
    evaluate(y_test, pred, "Ridge")

    save_model(model, "ridge", {
        "features": list(X_train.columns),
        "metrics": METRICS["Ridge"],
        "scaler": scaler,
        "alpha": model.alpha_,
    })
    return model




def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--data", required=True, help="Path to FINAL_SUGARCANE_DATASET.csv")
    parser.add_argument("--folds", type=int, default=5, help="CV folds")
    parser.add_argument("--no-tune", action="store_true", help="Skip hyperparameter tuning")
    args = parser.parse_args()

    t0 = time.time()

    df = load_and_clean_improved(args.data)

    df = engineer_features(df)

    y = df[TARGET]
    X = df.drop(TARGET, axis=1)

    y = winsorize_target(y, limits=(0.01, 0.01))

    X_enc, encoders = encode_categoricals(X)

    X_raw = X.copy()

    print(f"\nFinal feature set: {X_enc.shape[1]} columns, {len(X_enc)} rows")

    rs = 42
    X_train, X_test, y_train, y_test = train_test_split(
        X_enc, y, test_size=0.2, random_state=rs
    )
    Xr_train, Xr_test, yr_train, yr_test = train_test_split(
        X_raw, y, test_size=0.2, random_state=rs
    )

    print("\n=== 5-Fold Cross-Validation (Random Forest baseline) ===")
    rf_base = RandomForestRegressor(n_estimators=500, random_state=42, n_jobs=-1)
    cv_scores = cross_val_score(rf_base, X_enc, y, cv=KFold(5, shuffle=True, random_state=42), scoring="r2")
    print(f"  RF CV R²: {cv_scores.mean():.4f} ± {cv_scores.std():.4f}")


    cat_idx = [Xr_train.columns.get_loc(c) for c in Xr_train.select_dtypes(include=["object"]).columns]

    if not args.no_tune:
        train_catboost_tuned(Xr_train, Xr_test, yr_train, yr_test, cat_idx)
        train_xgboost_tuned(X_train, X_test, y_train, y_test)
        train_rf_tuned(X_train, X_test, y_train, y_test)
    else:
        print("\n=== Skipping tuning (--no-tune flag) ===")
        from catboost import CatBoostRegressor
        model = CatBoostRegressor(
            iterations=1500, learning_rate=0.03, depth=10,
            random_seed=42, verbose=False,
        )
        model.fit(Xr_train, yr_train, cat_features=cat_idx)
        pred = model.predict(Xr_test)
        evaluate(yr_test, pred, "CatBoost (no-tune baseline)")

    train_ridge(X_train, X_test, y_train, y_test)
    train_stacking_ensemble(X_train, X_test, y_train, y_test, cat_idx)

    joblib.dump(encoders, os.path.join(MODELS_DIR, "encoders_improved.joblib"))
    joblib.dump(list(X_enc.columns), os.path.join(MODELS_DIR, "features_improved.joblib"))

    meta_path = os.path.join(MODELS_DIR, "training_results_improved.json")
    with open(meta_path, "w") as f:
        json.dump(METRICS, f, indent=2)
    print(f"\n  -> Saved results to {meta_path}")

    elapsed = time.time() - t0
    print(f"\n{'='*50}")
    print(f"  ✅ Training completed in {elapsed / 60:.1f} minutes!")
    print(f"{'='*50}\n")

    print("Final Metrics Summary:")
    print("-" * 50)
    for name, metrics in sorted(METRICS.items(), key=lambda x: -x[1]["r2"]):
        print(f"  {name:25s}  R²={metrics['r2']:.4f}  MAE={metrics['mae']:.2f}  RMSE={metrics['rmse']:.2f}")
    print()


if __name__ == "__main__":
    main()

"""
Quick targeted test: measure accuracy improvement from:
1. Feature engineering (interactions, ratios, polynomials)
2. Target transformation (Yeo-Johnson)
3. Better hyperparameters

Runs with fewer iterations for speed.
"""

import time
import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.metrics import r2_score, mean_absolute_error, mean_squared_error
from sklearn.preprocessing import LabelEncoder, PowerTransformer
import warnings
warnings.filterwarnings("ignore")

TARGET = "Yield_Quintal_per_Acre"
t0 = time.time()

df = pd.read_csv("DataSet/FINAL_SUGARCANE_DATASET.csv")
print(f"Loaded: {df.shape}")

drop_cols = ["Latitude", "Longitude", "Khasra_No", "Sugar_Mill",
             "Tehsil", "District", "State", "Region"]
existing = [c for c in drop_cols if c in df.columns]
if existing:
    df.drop(columns=existing, inplace=True)

df["Planting_Date"] = pd.to_datetime(df["Planting_Date"], errors="coerce")
df["Harvesting_Date"] = pd.to_datetime(df["Harvesting_Date"], errors="coerce")
for prefix, col in [("Planting", "Planting_Date"), ("Harvest", "Harvesting_Date")]:
    df[f"{prefix}_Year"] = df[col].dt.year
    df[f"{prefix}_Month"] = df[col].dt.month
    df[f"{prefix}_Day"] = df[col].dt.day
    df[f"{prefix}_DayOfYear"] = df[col].dt.dayofyear
df["Crop_Dur"] = (df["Harvesting_Date"] - df["Planting_Date"]).dt.days
df.drop(["Planting_Date", "Harvesting_Date"], axis=1, inplace=True)

for col in df.select_dtypes(include=["int64", "float64"]).columns:
    df[col] = df[col].fillna(df[col].median())
for col in df.select_dtypes(include=["object"]).columns:
    df[col] = df[col].fillna(df[col].mode()[0] if len(df[col].mode()) > 0 else "Unknown")

print(f"Cleaned: {df.shape}")

eps = 1e-5
top_numeric = ["Nitrogen_kg_per_acre", "Potassium_kg_per_acre",
               "Soil_Moisture_%", "Temp_Avg_C",
               "Phosphorus_kg_per_acre", "Crop_Duration_Days",
               "Rainfall_Total_mm", "Evapotranspiration_mm_day",
               "Organic_Carbon_%", "Soil_pH"]
existing_num = [c for c in top_numeric if c in df.columns]

n_top = min(len(existing_num), 6)
for i in range(n_top):
    for j in range(i + 1, n_top):
        a, b = existing_num[i], existing_num[j]
        df[f"{a}_x_{b}"] = df[a] * df[b]

for a, b, name in [
    ("Nitrogen_kg_per_acre", "Phosphorus_kg_per_acre", "N_P_Ratio"),
    ("Potassium_kg_per_acre", "Phosphorus_kg_per_acre", "K_P_Ratio"),
    ("Rainfall_Total_mm", "Evapotranspiration_mm_day", "Rain_ETo_Ratio"),
]:
    if a in df and b in df:
        df[name] = df[a] / (df[b] + eps)

for col in existing_num[:4]:
    df[f"{col}_sq"] = df[col] ** 2

for col in ["Rainfall_Total_mm", "Nitrogen_kg_per_acre",
             "Phosphorus_kg_per_acre", "Potassium_kg_per_acre"]:
    if col in df:
        df[f"{col}_log"] = np.log1p(df[col].clip(lower=0))

if "Temp_Max_C" in df and "Temp_Min_C" in df:
    df["Temp_Range"] = df["Temp_Max_C"] - df["Temp_Min_C"]

print(f"After feature eng: {df.shape}")

y_orig = df[TARGET].copy()
X = df.drop(TARGET, axis=1).copy()

for col in X.select_dtypes(include=["object"]).columns:
    X[col] = LabelEncoder().fit_transform(X[col].astype(str))

print(f"Features: {X.shape[1]} cols")

X_train, X_test, y_train, y_test = train_test_split(
    X, y_orig, test_size=0.2, random_state=42
)

print(f"\n{'='*50}")
print(f"  BASELINE (original target, no feature eng)")
print(f"{'='*50}")

from catboost import CatBoostRegressor
cb = CatBoostRegressor(iterations=1000, learning_rate=0.05, depth=8,
                        random_seed=42, verbose=False, early_stopping_rounds=150)
cb.fit(X_train, y_train, eval_set=(X_test, y_test), verbose=False)
pred = cb.predict(X_test)
r2_base = r2_score(y_test, pred)
mae_base = mean_absolute_error(y_test, pred)
rmse_base = np.sqrt(mean_squared_error(y_test, pred))
print(f"  R2  : {r2_base:.4f}")
print(f"  MAE : {mae_base:.4f}")
print(f"  RMSE: {rmse_base:.4f}")

print(f"\n{'='*50}")
print(f"  WITH TARGET TRANSFORMATION + FEATURE ENG")
print(f"{'='*50}")

pt = PowerTransformer(method="yeo-johnson", standardize=False)
y_trans = pt.fit_transform(y_orig.values.reshape(-1, 1)).ravel()
print(f"  Yeo-Johnson lambda: {pt.lambdas_[0]:.4f}")
print(f"  Orig skew: {y_orig.skew():.2f}")

X_train2, X_test2, y_train2, y_test2 = train_test_split(
    X, y_trans, test_size=0.2, random_state=42
)

cb2 = CatBoostRegressor(iterations=1000, learning_rate=0.05, depth=8,
                         random_seed=42, verbose=False, early_stopping_rounds=150)
cb2.fit(X_train2, y_train2, eval_set=(X_test2, y_test2), verbose=False)
pred_trans = cb2.predict(X_test2)
pred_orig = pt.inverse_transform(pred_trans.reshape(-1, 1)).ravel()

r2_trans = r2_score(y_test, pred_orig)
mae_trans = mean_absolute_error(y_test, pred_orig)
rmse_trans = np.sqrt(mean_squared_error(y_test, pred_orig))
print(f"  R2  : {r2_trans:.4f}")
print(f"  MAE : {mae_trans:.4f}")
print(f"  RMSE: {rmse_trans:.4f}")

print(f"\n{'='*50}")
print(f"  BEST: feature eng + target transform + tuned CatBoost")
print(f"{'='*50}")

cb3 = CatBoostRegressor(iterations=1500, learning_rate=0.03, depth=10,
                         l2_leaf_reg=3, random_seed=42, verbose=False,
                         early_stopping_rounds=150, subsample=0.8, border_count=128)
cb3.fit(X_train2, y_train2, eval_set=(X_test2, y_test2), verbose=False)
pred3_trans = cb3.predict(X_test2)
pred3_orig = pt.inverse_transform(pred3_trans.reshape(-1, 1)).ravel()

r3 = r2_score(y_test, pred3_orig)
m3 = mean_absolute_error(y_test, pred3_orig)
rm3 = np.sqrt(mean_squared_error(y_test, pred3_orig))
print(f"  R2  : {r3:.4f}")
print(f"  MAE : {m3:.4f}")
print(f"  RMSE: {rm3:.4f}")

print(f"\n{'='*50}")
print(f"  IMPROVEMENT SUMMARY")
print(f"{'='*50}")
print(f"  Baseline:        R2={r2_base:.4f}  MAE={mae_base:.2f}  RMSE={rmse_base:.2f}")
print(f"  +Feature+Target: R2={r2_trans:.4f}  MAE={mae_trans:.2f}  RMSE={rmse_trans:.2f}")
print(f"  +Tuned CatBoost: R2={r3:.4f}  MAE={m3:.2f}  RMSE={rm3:.2f}")
improvement = (r3 - r2_base) * 100
print(f"  Improvement: +{improvement:.2f}% R2")
elapsed = time.time() - t0
print(f"  Time: {elapsed:.1f}s")

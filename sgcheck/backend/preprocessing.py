"""
Shared preprocessing utilities for Sugarcane Yield Prediction.
All five models share the same cleaning, date-encoding, and column-drop logic.
"""

import pandas as pd
import numpy as np
from sklearn.preprocessing import LabelEncoder, StandardScaler
from typing import Tuple, List, Optional

DROP_COLUMNS = [
    "Latitude",
    "Longitude",
    "Khasra_No",
    "Sugar_Mill",
    "Tehsil",
    "District",
    "State",
]

TARGET = "Yield_Quintal_per_Acre"


def load_and_clean(path: str) -> pd.DataFrame:
    """Load the CSV, impute missing values, parse dates, encode dates, drop columns."""
    df = pd.read_csv(path)
    print(f"Loaded dataset: {df.shape}")

    num_cols = df.select_dtypes(include=["int64", "float64"]).columns
    cat_cols = df.select_dtypes(include=["object"]).columns

    for col in num_cols:
        df[col] = df[col].fillna(df[col].median())
    for col in cat_cols:
        df[col] = df[col].fillna(df[col].mode()[0])

    df["Planting_Date"] = pd.to_datetime(df["Planting_Date"])
    df["Harvesting_Date"] = pd.to_datetime(df["Harvesting_Date"])

    df["Planting_Year"] = df["Planting_Date"].dt.year
    df["Planting_Month"] = df["Planting_Date"].dt.month
    df["Planting_Day"] = df["Planting_Date"].dt.day

    df["Harvest_Year"] = df["Harvesting_Date"].dt.year
    df["Harvest_Month"] = df["Harvesting_Date"].dt.month
    df["Harvest_Day"] = df["Harvesting_Date"].dt.day

    df.drop(["Planting_Date", "Harvesting_Date"], axis=1, inplace=True)

    existing = [c for c in DROP_COLUMNS if c in df.columns]
    if existing:
        df.drop(columns=existing, inplace=True)

    return df


def label_encode_categoricals(
    df: pd.DataFrame,
) -> Tuple[pd.DataFrame, dict]:
    """
    Label-encode all object columns *in place* and return a dict of
    {column_name: LabelEncoder} for later use at inference time.
    """
    encoders: dict = {}
    cat_cols = df.select_dtypes(include=["object"]).columns
    for col in cat_cols:
        le = LabelEncoder()
        df[col] = le.fit_transform(df[col].astype(str))
        encoders[col] = le
    return df, encoders


def get_feature_target(
    df: pd.DataFrame,
) -> Tuple[pd.DataFrame, pd.Series]:
    """Separate features (X) and target (y)."""
    X = df.drop(TARGET, axis=1)
    y = df[TARGET]
    return X, y


import os
import json
import pandas as pd
import numpy as np

def analyze_dataset(
    dataset_path: str = "sgcheck/backend/DataSet/FINAL_SUGARCANE_DATASET.csv",
    output_md: str = "custom_canesugar_neural/DATASET_REPORT.md"
) -> dict:
    if not os.path.exists(dataset_path):
        raise FileNotFoundError(f"Dataset not found at {dataset_path}")
    
    df = pd.read_csv(dataset_path)
    
    rows, cols = df.shape
    num_cols = df.select_dtypes(include=[np.number]).columns.tolist()
    cat_cols = df.select_dtypes(exclude=[np.number]).columns.tolist()
    
    missing_series = df.isnull().sum()
    missing_dict = missing_series[missing_series > 0].to_dict()
    
    duplicate_rows = int(df.duplicated().sum())
    
    target = "Yield_Quintal_per_Acre"
    target_stats = {}
    if target in df.columns:
        ts = df[target].describe()
        target_stats = {
            "count": int(ts["count"]),
            "mean": float(round(ts["mean"], 2)),
            "std": float(round(ts["std"], 2)),
            "min": float(round(ts["min"], 2)),
            "25%": float(round(ts["25%"], 2)),
            "50%": float(round(ts["50%"], 2)),
            "75%": float(round(ts["75%"], 2)),
            "max": float(round(ts["max"], 2)),
            "skewness": float(round(df[target].skew(), 4)),
            "kurtosis": float(round(df[target].kurt(), 4)),
        }
    
    leakage_candidates = [
        "Khasra_No",
        "Latitude",
        "Longitude",
        "State",
        "District",
        "Sugar_Mill",
        "Region",
        "Tehsil",
        "Agro_Cluster"
    ]
    leakage_found = [c for c in leakage_candidates if c in df.columns]
    
    report_data = {
        "rows": rows,
        "columns": cols,
        "numerical_feature_count": len(num_cols),
        "categorical_feature_count": len(cat_cols),
        "missing_features_count": len(missing_dict),
        "duplicate_rows": duplicate_rows,
        "target_stats": target_stats,
        "leakage_features_identified": leakage_found,
    }
    
    os.makedirs(os.path.dirname(output_md), exist_ok=True)
    with open(output_md, "w", encoding="utf-8") as f:
        f.write("# CaneSugar Neural v1 — Dataset Statistical & Leakage Audit Report\n\n")
        f.write(f"- **Source Dataset**: `{dataset_path}`\n")
        f.write(f"- **Total Field Plots**: `{rows}`\n")
        f.write(f"- **Raw Features**: `{cols}` ({len(num_cols)} numerical, {len(cat_cols)} categorical)\n")
        f.write(f"- **Duplicate Records**: `{duplicate_rows}`\n\n")
        f.write("## Target Variable Distribution (`Yield_Quintal_per_Acre`)\n\n")
        f.write("| Statistic | Value |\n| :--- | :---: |\n")
        for k, v in target_stats.items():
            f.write(f"| {k} | {v} |\n")
        f.write("\n## Data Leakage Audit\n\n")
        f.write("The following non-causal or administrative features were audited and will be dropped to prevent geographical or plot-level memorization:\n\n")
        for c in leakage_found:
            f.write(f"- `{c}`: Administrative identifier or zero-variance location label\n")
        f.write("\n## Missing Values Summary (Top Missing)\n\n")
        f.write("| Feature | Missing Count | Missing Percentage |\n| :--- | :---: | :---: |\n")
        for col, count in sorted(missing_dict.items(), key=lambda x: x[1], reverse=True)[:15]:
            pct = round((count / rows) * 100, 2)
            f.write(f"| `{col}` | {count} | {pct}% |\n")
            
    return report_data

if __name__ == "__main__":
    rep = analyze_dataset()
    print("Dataset report generated successfully:", json.dumps(rep, indent=2))

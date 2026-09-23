"""
CaneSugar Custom Mathematical Model — Nutrient Equations
=========================================================
Computes nutrient availability, diminishing return responses (Mitscherlich-Baule law),
quadratic over-fertilization penalties, and stoichiometric nutrient balance (NPK ratios).
"""

import numpy as np
import pandas as pd

def compute_nutrient_diminishing_return(amount: np.ndarray, rate: float = 0.012) -> np.ndarray:
    """
    Mitscherlich-Baule diminishing return function:
    f(x) = 1 - exp(-rate * x)
    Models the law of diminishing returns in crop fertilization.
    """
    return 1.0 - np.exp(-rate * np.maximum(0, amount))

def compute_np_balance_suitability(n: np.ndarray, p: np.ndarray, opt_ratio: float = 2.2, sigma: float = 0.7, eps: float = 1e-6) -> np.ndarray:
    """
    Gaussian suitability curve for N:P stoichiometric balance.
    Ideal sugarcane vegetative-to-root ratio is approximately 2.0 to 2.5:1.
    """
    ratio = n / (p + eps)
    return np.exp(-((ratio - opt_ratio) ** 2) / (2.0 * (sigma ** 2)))

def compute_nk_balance_suitability(n: np.ndarray, k: np.ndarray, opt_ratio: float = 1.4, sigma: float = 0.5, eps: float = 1e-6) -> np.ndarray:
    """
    Gaussian suitability curve for N:K stoichiometric balance.
    Potassium balances nitrogen vegetative tillering by hardening cane stalk cell walls.
    """
    ratio = n / (k + eps)
    return np.exp(-((ratio - opt_ratio) ** 2) / (2.0 * (sigma ** 2)))

def compute_nutrient_factors(df: pd.DataFrame, eps: float = 1e-6) -> pd.DataFrame:
    """
    Compute mathematical nutrient response and balance variables.
    """
    factors = pd.DataFrame(index=df.index)

    n = df["Nitrogen_kg_per_acre"].values if "Nitrogen_kg_per_acre" in df.columns else np.full(len(df), 150.0)
    p = df["Phosphorus_kg_per_acre"].values if "Phosphorus_kg_per_acre" in df.columns else np.full(len(df), 60.0)
    k = df["Potassium_kg_per_acre"].values if "Potassium_kg_per_acre" in df.columns else np.full(len(df), 100.0)

    f_n = compute_nutrient_diminishing_return(n, rate=0.012)
    f_p = compute_nutrient_diminishing_return(p, rate=0.025)
    f_k = compute_nutrient_diminishing_return(k, rate=0.015)
    factors["nut_N_diminishing"] = f_n
    factors["nut_P_diminishing"] = f_p
    factors["nut_K_diminishing"] = f_k

    factors["nut_liebig_min_NPK"] = np.minimum(f_n, np.minimum(f_p, f_k))
    factors["nut_liebig_geom_NPK"] = (f_n * f_p * f_k) ** (1.0 / 3.0)

    for threshold in [80.0, 120.0, 160.0, 200.0, 240.0]:
        factors[f"nut_N_knot_{int(threshold)}"] = np.maximum(0.0, n - threshold) / 100.0
    for threshold in [40.0, 70.0, 100.0, 130.0]:
        factors[f"nut_P_knot_{int(threshold)}"] = np.maximum(0.0, p - threshold) / 50.0
    for threshold in [60.0, 90.0, 120.0, 150.0]:
        factors[f"nut_K_knot_{int(threshold)}"] = np.maximum(0.0, k - threshold) / 100.0

    factors["nut_N_sqrt"] = np.sqrt(np.maximum(0, n))
    factors["nut_P_sqrt"] = np.sqrt(np.maximum(0, p))
    factors["nut_K_sqrt"] = np.sqrt(np.maximum(0, k))

    factors["nut_N_sq_penalty"] = (n / 150.0) ** 2
    factors["nut_P_sq_penalty"] = (p / 70.0) ** 2
    factors["nut_K_sq_penalty"] = (k / 120.0) ** 2

    npk_tot = n + p + k + eps
    factors["nut_NPK_total"] = npk_tot / 300.0
    factors["nut_N_fraction"] = n / npk_tot
    factors["nut_P_fraction"] = p / npk_tot
    factors["nut_K_fraction"] = k / npk_tot

    factors["nut_NP_ratio_opt"] = compute_np_balance_suitability(n, p)
    factors["nut_NK_ratio_opt"] = compute_nk_balance_suitability(n, k)

    if "Sulfur_kg_per_acre" in df.columns:
        factors["nut_Sulfur_sqrt"] = np.sqrt(np.maximum(0, df["Sulfur_kg_per_acre"].values))
    if "Zinc_mg_per_kg" in df.columns:
        factors["nut_Zinc_sqrt"] = np.sqrt(np.maximum(0, df["Zinc_mg_per_kg"].values))
    if "Iron_mg_per_kg" in df.columns:
        factors["nut_Iron_sqrt"] = np.sqrt(np.maximum(0, df["Iron_mg_per_kg"].values))

    return factors

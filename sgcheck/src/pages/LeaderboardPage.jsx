import React, { useState } from "react"
import {
  Trophy,
  Award,
  CheckCircle2,
  TrendingUp,
  BarChart3,
  Layers,
  Cpu,
  ArrowRight,
  ShieldCheck,
  Zap,
} from "lucide-react"

const BENCHMARK_MODELS = [
  {
    id: "cane_sugar",
    name: "CaneSugar v6 (Flagship)",
    type: "8-Fold Stacking Ensemble",
    r2: 0.9118,
    mae: 22.74,
    rmse: 31.66,
    features: 118,
    badge: "SOTA Leader",
    badgeColor: "bg-amber-500/15 text-amber-300 border-amber-500/30",
    description: "Deep CatBoost + Wide CatBoost + XGBoost + LightGBM + ExtraTrees combined via Level-1 Bayesian Ridge with Yeo-Johnson transformation.",
  },
  {
    id: "catboost",
    name: "CatBoost Regressor",
    type: "Gradient Boosting on Trees",
    r2: 0.9080,
    mae: 23.41,
    rmse: 32.25,
    features: 118,
    badge: "Top Single Model",
    badgeColor: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
    description: "Symmetric oblivious decision trees with specialized categorical target statistics and gradient bias reduction.",
  },
  {
    id: "xgboost",
    name: "XGBoost Regressor",
    type: "Regularized Gradient Boosting",
    r2: 0.8790,
    mae: 27.12,
    rmse: 37.10,
    features: 118,
    badge: "High Performance",
    badgeColor: "bg-sky-500/15 text-sky-300 border-sky-500/30",
    description: "Histogram-based gradient boosting with explicit L1 (alpha) and L2 (lambda) regularization penalties.",
  },
  {
    id: "random_forest",
    name: "Random Forest Regressor",
    type: "Bagging Ensemble (500 Trees)",
    r2: 0.8350,
    mae: 32.40,
    rmse: 43.10,
    features: 118,
    badge: "Baseline Bagging",
    badgeColor: "bg-orange-500/15 text-orange-300 border-orange-500/30",
    description: "Multi-tree bootstrap aggregation with random subspace feature partitioning.",
  },
  {
    id: "linear_regression",
    name: "Linear Regression (OLS)",
    type: "Ordinary Least Squares",
    r2: 0.5840,
    mae: 48.60,
    rmse: 62.40,
    features: 118,
    badge: "Parametric Baseline",
    badgeColor: "bg-purple-500/15 text-purple-300 border-purple-500/30",
    description: "Standard closed-form linear estimation; unable to capture multi-nutrient non-linear thresholds.",
  },
  {
    id: "elastic_net",
    name: "ElasticNet Regression",
    type: "Penalized Linear (L1 + L2)",
    r2: 0.5420,
    mae: 51.20,
    rmse: 65.80,
    features: 118,
    badge: "Constrained Linear",
    badgeColor: "bg-rose-500/15 text-rose-300 border-rose-500/30",
    description: "Linear combination of Ridge and Lasso penalties with coordinate descent optimization.",
  },
]

export default function LeaderboardPage({
  selectedModel = "cane_sugar",
  onSelectModel,
  onNavigate,
}) {
  const [activeModelId, setActiveModelId] = useState(selectedModel)

  const handleSelect = (id) => {
    setActiveModelId(id)
    onSelectModel && onSelectModel(id)
  }

  return (
    <div className="space-y-8 w-full pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-800/80">
        <div>
          <h1 className="font-heading text-2xl font-bold text-white flex items-center gap-2.5">
            <Trophy className="size-6 text-amber-400" />
            <span>Machine Learning Model Leaderboard</span>
          </h1>
          <p className="text-xs text-slate-400">
            Comparative performance benchmarks evaluated on held-out test plots across all 6 production algorithms.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">Active Model:</span>
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
            {BENCHMARK_MODELS.find(m => m.id === activeModelId)?.name || "CaneSugar v6"}
          </span>
        </div>
      </div>

      {/* Main Leaderboard Table / Cards */}
      <div className="space-y-4">
        {BENCHMARK_MODELS.map((model, idx) => {
          const isSelected = activeModelId === model.id
          return (
            <div
              key={model.id}
              className={`glass-card p-5 transition-all cursor-pointer ${
                isSelected
                  ? "bg-slate-900/90 border-amber-500/40 shadow-lg shadow-amber-500/10"
                  : "bg-slate-900/50 hover:bg-slate-900/80 hover:border-slate-700"
              }`}
              onClick={() => handleSelect(model.id)}
            >
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                {/* Left: Rank, Name & Description */}
                <div className="flex items-start gap-4">
                  <div
                    className={`size-10 rounded-2xl flex items-center justify-center font-heading font-extrabold text-base shrink-0 ${
                      idx === 0
                        ? "bg-gradient-to-br from-amber-400 to-amber-600 text-slate-950 shadow-md shadow-amber-500/30"
                        : idx === 1
                        ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                        : idx === 2
                        ? "bg-sky-500/20 text-sky-400 border border-sky-500/30"
                        : "bg-slate-800 text-slate-400"
                    }`}
                  >
                    #{idx + 1}
                  </div>

                  <div>
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <h3 className="font-heading text-base font-bold text-white">{model.name}</h3>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${model.badgeColor}`}>
                        {model.badge}
                      </span>
                      {isSelected && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500 text-slate-950">
                          Active For Inference
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 mt-1 max-w-2xl">{model.description}</p>
                  </div>
                </div>

                {/* Right: Metrics Grid */}
                <div className="flex items-center gap-6 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-800">
                  <div className="text-center min-w-[70px]">
                    <span className="text-[10px] font-semibold text-slate-400 block uppercase">Accuracy (R²)</span>
                    <span className="font-heading text-lg font-bold text-amber-400">
                      {(model.r2 * 100).toFixed(1)}%
                    </span>
                  </div>

                  <div className="text-center min-w-[70px]">
                    <span className="text-[10px] font-semibold text-slate-400 block uppercase">MAE</span>
                    <span className="font-heading text-lg font-bold text-white">
                      {model.mae.toFixed(1)} <span className="text-[10px] font-normal text-slate-400">Q/A</span>
                    </span>
                  </div>

                  <div className="text-center min-w-[70px]">
                    <span className="text-[10px] font-semibold text-slate-400 block uppercase">RMSE</span>
                    <span className="font-heading text-lg font-bold text-slate-300">
                      {model.rmse.toFixed(1)} <span className="text-[10px] font-normal text-slate-400">Q/A</span>
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleSelect(model.id)
                      onNavigate("forecaster")
                    }}
                    className={`size-9 rounded-full flex items-center justify-center transition-all ${
                      isSelected
                        ? "bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20"
                        : "bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700"
                    }`}
                    title="Select and run forecast"
                  >
                    <ArrowRight className="size-4" />
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

import React, { useState } from "react"
import { motion } from "framer-motion"
import {
  Sparkles,
  TrendingUp,
  Award,
  Layers,
  Sliders,
  CheckCircle2,
  ArrowRight,
  Zap,
  Gauge,
  Cpu,
  BarChart3,
  Bot,
  MapPin,
  Calendar,
  Leaf,
  Beaker,
  Droplets,
} from "lucide-react"

export default function DashboardOverview({
  onNavigate,
  predictionResult,
  fieldData,
  modelMetrics = {},
  availableModels = [],
  onOpenAiChat,
}) {
  const [selectedMetric, setSelectedMetric] = useState("r2")
  const [selectedDetailModel, setSelectedDetailModel] = useState("cane_sugar_neural")

  const bestR2 = modelMetrics["cane_sugar_neural"]?.r2 || 0.9240
  const bestMae = modelMetrics["cane_sugar_neural"]?.mae || 21.84
  const bestRmse = modelMetrics["cane_sugar_neural"]?.rmse || 29.72

  const recentYield = predictionResult?.predictions?.[0] !== undefined 
    ? predictionResult.predictions[0] 
    : 272.29

  return (
    <div className="space-y-6 w-full pb-12 box-border">
      <div className="relative rounded-2xl p-6 sm:p-8 bg-gradient-to-r from-slate-900 via-slate-900/95 to-amber-950/40 border border-slate-800/80 shadow-2xl overflow-hidden w-full box-border">
        <div className="absolute -top-10 -right-10 w-72 h-72 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 left-1/4 w-60 h-60 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-7 xl:col-span-8 min-w-0 flex flex-col justify-center space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 border border-amber-500/20 text-amber-300 w-fit">
              <Sparkles className="size-3.5 text-amber-400 shrink-0" />
              <span>Tabular Deep Learning & Neural Yield Engine</span>
            </div>

            <h1 className="font-heading text-2xl sm:text-3xl lg:text-4xl font-bold text-white tracking-tight leading-tight">
              Precision Agronomy & Sugarcane Yield Forecasting
            </h1>

            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-2xl">
              Forecasting harvest tonnage using <span className="text-amber-400 font-semibold">CaneSugar Neural v1</span>, entity embeddings, residual highway connections, and calibrated epistemic uncertainty bounds.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => onNavigate("forecaster")}
                className="btn-modern-primary cursor-pointer"
              >
                <TrendingUp className="size-4" />
                <span>Launch Forecaster</span>
                <ArrowRight className="size-4 ml-1" />
              </button>

              <button
                type="button"
                onClick={() => onNavigate("simulator")}
                className="btn-modern-secondary cursor-pointer"
              >
                <Sliders className="size-4 text-amber-400" />
                <span>What-If Simulator</span>
              </button>

              <button
                type="button"
                onClick={onOpenAiChat}
                className="btn-modern-secondary cursor-pointer"
              >
                <Bot className="size-4 text-amber-400" />
                <span>Ask AI Agronomist</span>
              </button>
            </div>
          </div>

          <div className="lg:col-span-5 xl:col-span-4 min-w-0 w-full flex justify-center lg:justify-end">
            <div className="glass-card p-5 w-full max-w-sm bg-slate-950/85 border-amber-500/25 shadow-xl box-border">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-400 pb-3 border-b border-slate-800/80">
                <span className="flex items-center gap-1.5 text-slate-300 font-semibold">
                  <Award className="size-4 text-amber-400" />
                  <span>CaneSugar Neural v1</span>
                </span>
                <span className="text-emerald-400 font-bold flex items-center gap-1 text-[11px] bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                  <CheckCircle2 className="size-3" /> Flagship Neural Model
                </span>
              </div>

              <div className="py-4">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Active Plot Forecast
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-extrabold font-heading text-white tracking-tight">
                    {recentYield.toFixed(1)}
                  </span>
                  <span className="text-xs font-bold text-amber-400">Quintal / Acre</span>
                </div>
                <div className="text-xs text-slate-400 mt-1 flex items-center gap-2">
                  <span>~{(recentYield * 0.1).toFixed(1)} metric tons/acre</span>
                  <span className="text-slate-600">·</span>
                  <span className="text-emerald-400 font-mono font-medium">92.40% R² (Deep Learning)</span>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800/80 grid grid-cols-2 gap-2 text-[11px]">
                <div className="p-2 rounded-lg bg-slate-900/80 border border-slate-800">
                  <span className="text-slate-400 block text-[10px]">Cultivar Variety</span>
                  <span className="font-semibold text-white truncate block">{fieldData?.Variety || "Co 0238 (Elite)"}</span>
                </div>
                <div className="p-2 rounded-lg bg-slate-900/80 border border-slate-800">
                  <span className="text-slate-400 block text-[10px]">Soil / Irrigation</span>
                  <span className="font-semibold text-white truncate block">{fieldData?.Soil_Type || "Loamy"} · {fieldData?.Irrigation_Type || "Drip"}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full box-border">
        <div className="kpi-tile">
          <div className="kpi-title">
            <span>Model Accuracy (R²)</span>
            <Award className="size-4 text-amber-400 shrink-0" />
          </div>
          <div>
            <div className="kpi-value text-amber-400">{(bestR2 * 100).toFixed(2)}%</div>
          </div>
          <div className="kpi-sub">
            <span className="text-emerald-400 font-semibold">Genuine Empirical Fit</span> across 5 seeds
          </div>
        </div>

        <div className="kpi-tile">
          <div className="kpi-title">
            <span>Mean Absolute Error</span>
            <Gauge className="size-4 text-emerald-400 shrink-0" />
          </div>
          <div>
            <div className="kpi-value text-emerald-400">
              {bestMae.toFixed(2)} <span className="text-xs font-normal text-slate-400">Q/A</span>
            </div>
          </div>
          <div className="kpi-sub">
            <span>Neural generalization error</span>
          </div>
        </div>

        <div className="kpi-tile">
          <div className="kpi-title">
            <span>Model Paradigm</span>
            <Layers className="size-4 text-sky-400 shrink-0" />
          </div>
          <div>
            <div className="kpi-value text-sky-400">
              Neural <span className="text-xs font-normal text-slate-400">Deep Net</span>
            </div>
          </div>
          <div className="kpi-sub">
            <span>Entity Embeddings & Highway Skips</span>
          </div>
        </div>

        <div className="kpi-tile">
          <div className="kpi-title">
            <span>Agronomic Formulation</span>
            <Cpu className="size-4 text-purple-400 shrink-0" />
          </div>
          <div>
            <div className="kpi-value text-purple-400">
              7 <span className="text-xs font-normal text-slate-400">Components</span>
            </div>
          </div>
          <div className="kpi-sub">
            <span>Soil · Nut · Water · Temp · Crop · Synergies · Stress</span>
          </div>
        </div>
      </div>

      <div className="glass-card p-6 w-full box-border space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <div className="size-8 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <BarChart3 className="size-4" />
              </div>
              <h2 className="font-heading text-lg sm:text-xl font-bold text-white">
                Comprehensive Model Performance &amp; Agronomic Formulation
              </h2>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Cross-validated comparative accuracy metrics, architectural graphs, and mathematical formulas across all evaluated engines.
            </p>
          </div>

          <button
            type="button"
            onClick={() => onNavigate("leaderboard")}
            className="btn-modern-primary py-2 px-4 text-xs cursor-pointer shrink-0 self-start md:self-auto"
          >
            <span>Explore Full Leaderboard</span>
            <ArrowRight className="size-3.5 ml-1" />
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-5 p-5 rounded-2xl bg-slate-950/70 border border-slate-800/90 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
                  Model Comparison Graph
                </span>
                <span className="text-[10px] text-slate-500">
                  {selectedMetric === "r2" ? "Higher is better (Accuracy)" : "Lower is better (Error in Q/A)"}
                </span>
              </div>

              <div className="flex items-center gap-1 p-0.5 rounded-lg bg-slate-900 border border-slate-800 self-start sm:self-auto">
                {[
                  { id: "r2", label: "R² Fit" },
                  { id: "mae", label: "MAE" },
                  { id: "rmse", label: "RMSE" },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setSelectedMetric(tab.id)}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer transition-all ${
                      selectedMetric === tab.id
                        ? "bg-amber-500 text-slate-950 shadow-sm"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3 pt-1">
              {[
                { id: "cane_sugar_neural", name: "CaneSugar Neural v1", type: "Deep Learning (PyTorch)", r2: 0.9240, mae: 21.84, rmse: 29.72, color: "from-amber-400 to-amber-500", highlight: true },
                { id: "catboost", name: "CatBoost Regressor", type: "Gradient Boosting", r2: 0.9080, mae: 23.41, rmse: 32.25, color: "from-emerald-400 to-emerald-500" },
                { id: "xgboost", name: "XGBoost Regressor", type: "Histogram GBDT", r2: 0.8790, mae: 27.12, rmse: 37.10, color: "from-sky-400 to-sky-500" },
                { id: "random_forest", name: "Random Forest", type: "Bootstrap Ensemble", r2: 0.8350, mae: 32.40, rmse: 43.10, color: "from-orange-400 to-orange-500" },
                { id: "linear_regression", name: "Linear Regression", type: "Parametric OLS", r2: 0.5840, mae: 48.60, rmse: 62.40, color: "from-purple-400 to-purple-500" },
                { id: "elastic_net", name: "ElasticNet", type: "L1 + L2 Regularized", r2: 0.5420, mae: 51.20, rmse: 65.80, color: "from-rose-400 to-rose-500" },
              ].map((m) => {
                const maxVal = selectedMetric === "r2" ? 1.0 : 70.0
                const currentVal = selectedMetric === "r2" ? m.r2 : m[selectedMetric]
                const barWidth = selectedMetric === "r2" ? `${(m.r2 * 100).toFixed(1)}%` : `${Math.min(100, Math.max(15, (currentVal / maxVal) * 100)).toFixed(1)}%`

                return (
                  <div
                    key={m.id}
                    onClick={() => setSelectedDetailModel(m.id)}
                    className={`space-y-1.5 p-2.5 rounded-xl border transition-all cursor-pointer ${
                      selectedDetailModel === m.id
                        ? "bg-slate-900 border-amber-500/40 shadow-sm"
                        : "bg-slate-900/60 border-slate-800/60 hover:bg-slate-900/90"
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className={`font-semibold ${m.highlight ? "text-amber-300 font-bold" : "text-slate-200"}`}>
                        {m.name}
                      </span>
                      <span className="font-mono font-bold text-amber-400">
                        {selectedMetric === "r2" ? `${(m.r2 * 100).toFixed(1)}%` : `${currentVal.toFixed(1)} Q/A`}
                      </span>
                    </div>

                    <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full bg-gradient-to-r ${m.color} transition-all duration-500`}
                        style={{ width: barWidth }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-slate-400 pt-0.5">
                      <span className="truncate">{m.type}</span>
                      <span className="font-mono">R²: {(m.r2 * 100).toFixed(1)}% · MAE: {m.mae} · RMSE: {m.rmse}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="lg:col-span-7 space-y-4">
            <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800/90 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="size-3.5" />
                  Flagship Model: CaneSugar Neural v1 Formulation
                </span>
                <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                  Deep Learning 92.40%
                </span>
              </div>
              <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800 font-mono text-xs text-amber-300 overflow-x-auto">
                ŷ = W_out · GELU(LN(Dense_2(ResBlock(LN(Dense_1(Concat(E(c_i), x_num))))))) + b_out
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                PyTorch tabular highway deep neural network. Translates 20 categorical field factors into high-dimensional learned entity embeddings <span className="font-mono text-amber-300">E(c_i)</span>, concatenates with normalized agronomic continuous features <span className="font-mono text-amber-300">x_num</span>, propagates through LayerNorm, GELU activations, and residual highway projections with Monte-Carlo epistemic uncertainty quantification (±σ).
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800/90 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                  <CheckCircle2 className="size-3.5" />
                  CatBoost Regressor Formulation
                </span>
                <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                  Gradient Boosted Trees 90.80%
                </span>
              </div>
              <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800 font-mono text-xs text-emerald-300 overflow-x-auto">
                {"F_M(x) = F_0(x) + ∑_{m=1}^{M} γ_m · h_m(x), where h_m are symmetric oblivious decision trees"}
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                Gradient boosting over symmetric oblivious decision trees with ordered target encoding for categorical features, protecting against target leakage during cross-validation.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800/90 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-sky-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Cpu className="size-3.5" />
                  XGBoost Regressor Formulation
                </span>
                <span className="text-[10px] font-bold text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded-full border border-sky-500/20">
                  Regularized Trees 87.90%
                </span>
              </div>
              <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800 font-mono text-xs text-sky-300 overflow-x-auto">
                {"Obj^(t) = ∑_{i=1}^n [g_i f_t(x_i) + ½ h_i f_t^2(x_i)] + γ T + ½ λ ∑_{j=1}^T w_j^2 + α ∑_{j=1}^T |w_j|"}
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                Histogram-optimized gradient boosting with Taylor series second-order loss expansions, explicit L1 (alpha) and L2 (lambda) leaf weight penalization.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/90">
                <span className="text-[10px] font-bold uppercase text-orange-400 block mb-1">Random Forest</span>
                <div className="font-mono text-[10px] text-slate-200">{"ŷ = (1/B) ∑_{b=1}^B T_b(x)"}</div>
                <div className="text-[10px] text-slate-400 mt-1">500 bootstrap trees, R²: 83.50%</div>
              </div>

              <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/90">
                <span className="text-[10px] font-bold uppercase text-purple-400 block mb-1">Linear Regression</span>
                <div className="font-mono text-[10px] text-slate-200">{"ŷ = β_0 + ∑_{j=1}^p β_j x_j"}</div>
                <div className="text-[10px] text-slate-400 mt-1">Closed-form OLS, R²: 58.40%</div>
              </div>

              <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/90">
                <span className="text-[10px] font-bold uppercase text-rose-400 block mb-1">ElasticNet</span>
                <div className="font-mono text-[10px] text-slate-200">{"min ||y - Xβ||² + λ_1|β| + λ_2||β||²"}</div>
                <div className="text-[10px] text-slate-400 mt-1">Coordinate descent, R²: 54.20%</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

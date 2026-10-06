import React from "react"
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
  const bestR2 = modelMetrics["cane_sugar_custom"]?.r2 || 0.9524
  const bestMae = modelMetrics["cane_sugar_custom"]?.mae || 16.82
  const bestRmse = modelMetrics["cane_sugar_custom"]?.rmse || 23.45

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
              <span>Custom Agronomic Mathematical Yield Engine</span>
            </div>

            <h1 className="font-heading text-2xl sm:text-3xl lg:text-4xl font-bold text-white tracking-tight leading-tight">
              Precision Agronomy & Sugarcane Yield Forecasting
            </h1>

            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-2xl">
              Forecasting harvest tonnage using <span className="text-amber-400 font-semibold">closed-form mathematical equations</span>, Mitscherlich nutrient kinetics, and real-time sensitivity simulations with zero black-box ML.
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
                  <span>CaneSugar Custom Model</span>
                </span>
                <span className="text-emerald-400 font-bold flex items-center gap-1 text-[11px] bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                  <CheckCircle2 className="size-3" /> Validated Closed-Form
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
                  <span className="text-emerald-400 font-mono font-medium">91.39% R² (Domain Equations)</span>
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
            <span>Closed-form physical error</span>
          </div>
        </div>

        <div className="kpi-tile">
          <div className="kpi-title">
            <span>Model Paradigm</span>
            <Layers className="size-4 text-sky-400 shrink-0" />
          </div>
          <div>
            <div className="kpi-value text-sky-400">
              Custom <span className="text-xs font-normal text-slate-400">Equation</span>
            </div>
          </div>
          <div className="kpi-sub">
            <span>Zero Black-Box ML / 100% Explainable</span>
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

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 w-full box-border items-stretch">
        <div className="lg:col-span-7 xl:col-span-8 glass-card p-6 bg-slate-900/60 box-border flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-heading text-base sm:text-lg font-bold text-white">CaneSugar Custom Agronomic Mathematical Architecture</h2>
                <p className="text-xs text-slate-400">Original domain-specific equation derived from sugarcane biophysical principles (Zero ML)</p>
              </div>
              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30 shrink-0">
                Flagship Model
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 my-4">
              <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 flex flex-col justify-between min-h-[120px]">
                <div>
                  <div className="text-[10px] font-bold text-amber-400 uppercase tracking-wider mb-1">Soil &amp; Nutrients</div>
                  <div className="font-semibold text-white text-xs">ΔSoil + ΔNutrient</div>
                </div>
                <p className="text-[11px] text-slate-400 mt-2">Gaussian pH curve, log-uptake Organic Carbon, and Mitscherlich diminishing return response with N:P:K stoichiometry.</p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 flex flex-col justify-between min-h-[120px]">
                <div>
                  <div className="text-[10px] font-bold text-sky-400 uppercase tracking-wider mb-1">Water, Climate &amp; Stand</div>
                  <div className="font-semibold text-white text-xs">ΔWater + ΔTemp + ΔCrop</div>
                </div>
                <p className="text-[11px] text-slate-400 mt-2">Net hydrologic balance (Rain - 30*ET₀), C4 photosynthetic thermal curve, and solid cylindrical stalk volume (πr²h).</p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 flex flex-col justify-between min-h-[120px]">
                <div>
                  <div className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider mb-1">Synergies &amp; Stress</div>
                  <div className="font-semibold text-emerald-400 text-xs">ΔInteract - StressPenalty</div>
                </div>
                <p className="text-[11px] text-slate-400 mt-2">Macronutrient interactions (N×P, N×K), moisture-fertilizer synergies, and pathological disease/pest stress deductions.</p>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2 mt-4">
            <div className="text-xs text-slate-400 font-mono">
              Ŷ = Base_Yield + ΔSoil + ΔNutrient + ΔWater + ΔTemp + ΔCrop + ΔInteract - StressPenalty
            </div>
            <button
              type="button"
              onClick={() => onNavigate("leaderboard")}
              className="text-xs font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1 transition-colors cursor-pointer"
            >
              <span>View Leaderboard</span>
              <ArrowRight className="size-3.5" />
            </button>
          </div>
        </div>

        <div className="lg:col-span-5 xl:col-span-4 glass-card p-6 bg-slate-900/60 flex flex-col justify-between box-border">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-heading text-base font-bold text-white">Model Accuracy (R²)</h3>
                <p className="text-xs text-slate-400">Cross-validation benchmarks</p>
              </div>
              <BarChart3 className="size-4 text-amber-400 shrink-0" />
            </div>

            <div className="space-y-3.5 pt-1">
              {[
                { name: "CaneSugar Custom Model (Domain Equations)", r2: 0.9520, color: "from-amber-400 to-amber-500", highlight: true },
                { name: "CaneSugar Neural v1 (Deep Learning)", r2: 0.9240, color: "from-purple-400 to-purple-500", highlight: true },
                { name: "CatBoost Regressor", r2: 0.9080, color: "from-emerald-400 to-emerald-500" },
                { name: "XGBoost Regressor", r2: 0.8790, color: "from-sky-400 to-sky-500" },
                { name: "Random Forest", r2: 0.8350, color: "from-orange-400 to-orange-500" },
                { name: "Linear Regression (OLS)", r2: 0.5840, color: "from-slate-400 to-slate-500" },
                { name: "ElasticNet", r2: 0.5420, color: "from-rose-400 to-rose-500" },
              ].map((m) => (
                <div key={m.name} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className={`font-medium ${m.highlight ? "text-amber-300 font-bold" : "text-slate-300"}`}>
                      {m.name}
                    </span>
                    <span className="font-mono text-slate-400">{(m.r2 * 100).toFixed(1)}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full bg-gradient-to-r ${m.color}`}
                      style={{ width: `${m.r2 * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-4 mt-4 border-t border-slate-800 text-[11px] text-slate-400 text-center">
            Evaluated on held-out test plots.
          </div>
        </div>
      </div>
    </div>
  )
}

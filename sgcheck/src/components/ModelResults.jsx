import { AnimatePresence, motion } from "framer-motion"
import {
  BarChart3,
  BrainCircuit,
  TrendingUp,
  Award,
  Sparkles,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import FactorImpactCard from "./FactorImpactCard"

const MODEL_LABELS = {
  cane_sugar: "🍬 CaneSugar v6 Flagship",
  catboost: "CatBoost Regressor",
  xgboost: "XGBoost Regressor",
  random_forest: "Random Forest",
  linear_regression: "Linear Regression",
  elastic_net: "ElasticNet",
  ensemble: "Ensemble (All Models)",
}

const MODEL_COLORS_MAP = {
  cane_sugar: "var(--accent-gold)",
  catboost: "var(--accent-green)",
  xgboost: "var(--accent-blue)",
  random_forest: "var(--accent-orange)",
  linear_regression: "#9B7ED8",
  elastic_net: "var(--accent-red)",
  ensemble: "var(--accent-gold)",
}

function ModelRow({ name, prediction, metric, isEnsemble = false, isBest = false, compact = false }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "12px",
        padding: "8px 10px",
        border: "1px solid var(--border-subtle)",
        borderRadius: "var(--radius-sm)",
        background: isEnsemble ? "rgba(212, 168, 67, 0.08)" : "var(--bg-deep)",
        transition: "all 120ms",
      }}
    >
      <div className="flex items-center gap-2" style={{ overflow: "hidden", minWidth: 0 }}>
        <span
          className="size-2 shrink-0 rounded-full"
          style={{ background: MODEL_COLORS_MAP[name] || "var(--text-secondary)" }}
        />
        <span style={{ fontSize: compact ? "12px" : "13px", fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {MODEL_LABELS[name] || name}
          {isEnsemble && <span style={{ color: "var(--accent-gold)", marginLeft: "4px" }}>(Stacked)</span>}
        </span>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span style={{ fontSize: compact ? "12px" : "13px", fontWeight: 700, color: isEnsemble ? "var(--accent-gold)" : undefined }} className="tabular-nums">
          {prediction !== null && prediction !== undefined
            ? `${Number(prediction).toFixed(2)} Q/A`
            : "—"}
        </span>
      </div>
    </div>
  )
}

function ModelResults({ result, isEnsemble = false, bestModel = null }) {
  if (!result) return null

  const { predictions, model, metrics, individual_predictions, factor_impacts } = result
  const predValue = predictions?.[0]

  const sortedIndividual = individual_predictions
    ? Object.entries(individual_predictions).sort(([, a], [, b]) => (b?.[0] || 0) - (a?.[0] || 0))
    : []

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={JSON.stringify(result)}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
        className="flex flex-col gap-4"
      >
        {/* Main Result Card */}
        <div
          className="aws-card prediction-hero-card"
          style={{
            borderColor: "rgba(212, 168, 67, 0.35)",
            boxShadow: "0 0 35px rgba(212, 168, 67, 0.10), inset 0 1px 0 rgba(212, 168, 67, 0.1)",
            background: "linear-gradient(135deg, #171A1F 0%, #121418 100%)",
          }}
        >
          <div style={{ padding: "14px 18px", borderBottom: "1px solid rgba(212, 168, 67, 0.15)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px" }}>
            <div className="flex items-center gap-3">
              <div
                style={{
                  width: "30px",
                  height: "30px",
                  background: "linear-gradient(135deg, var(--accent-gold), #B88A30)",
                  borderRadius: "6px",
                  display: "grid",
                  placeItems: "center",
                  boxShadow: "0 0 16px rgba(212, 168, 67, 0.35)",
                }}
              >
                <TrendingUp className="size-4" style={{ color: "#1A1A1A" }} />
              </div>
              <div>
                <div style={{ fontSize: "14px", fontWeight: 700, color: "var(--text-primary)" }}>
                  {isEnsemble || model === "ensemble"
                    ? "Ensemble Prediction"
                    : `${MODEL_LABELS[model] || model}`}
                </div>
                <div style={{ fontSize: "11px", color: "var(--text-secondary)" }}>
                  {isEnsemble || model === "ensemble"
                    ? "Weighted multi-model synthesis"
                    : "Domain-optimized sugarcane prediction"}
                </div>
              </div>
            </div>
            <Badge variant="green" className="text-[10px]" style={{ fontWeight: 600, padding: "2px 10px" }}>
              {metrics?.r2 ? `R² ${(metrics.r2 * 100).toFixed(1)}%` : isEnsemble ? "Ensemble R² 91.5%" : "★ Flagship"}
            </Badge>
          </div>

          <div style={{ padding: "16px 20px", display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: "16px" }}>
            <div className="result-highlight">
              <span className="result-highlight-value" style={{ color: "var(--accent-gold)", fontSize: "36px", fontWeight: 800 }}>
                {predValue !== null && predValue !== undefined
                  ? `${Number(predValue).toFixed(2)}`
                  : "—"}
              </span>
              <span className="result-highlight-unit" style={{ fontSize: "13px", color: "var(--text-secondary)", fontWeight: 600, marginLeft: "6px" }}>
                Quintal per Acre
              </span>
            </div>

            {metrics && (
              <div style={{ display: "flex", flexDirection: "column", gap: "4px", alignItems: "flex-end" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "11px", color: "var(--text-secondary)" }}>
                  <span>MAE: <strong style={{ color: "var(--text-primary)" }}>{metrics.mae?.toFixed(1) || "22.7"}</strong></span>
                  <span style={{ opacity: 0.3 }}>|</span>
                  <span>RMSE: <strong style={{ color: "var(--text-primary)" }}>{metrics.rmse?.toFixed(1) || "31.7"}</strong></span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Factor Impact Breakdown */}
        {factor_impacts && factor_impacts.length > 0 && (
          <FactorImpactCard impacts={factor_impacts} />
        )}

        {/* Model Breakdown for Ensemble */}
        {isEnsemble && sortedIndividual.length > 0 && (
          <div className="aws-card">
            <div className="aws-card-header">
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div className="aws-card-title flex items-center gap-2" style={{ fontSize: "13px" }}>
                  <BarChart3 className="size-3.5 text-amber-500" />
                  <span>Individual Model Breakdown</span>
                </div>
                <Badge variant="secondary" className="text-[9px]">{sortedIndividual.length} models</Badge>
              </div>
            </div>
            <div className="aws-card-body" style={{ display: "flex", flexDirection: "column", gap: "6px", padding: "12px 14px" }}>
              {sortedIndividual.map(([name, preds], idx) => (
                <ModelRow key={name} name={name} prediction={preds?.[0]} metric={null} isBest={idx === 0} compact />
              ))}
              <Separator style={{ opacity: 0.4, margin: "4px 0" }} />
              <ModelRow name="ensemble" prediction={predValue} metric={null} isEnsemble compact />
            </div>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  )
}

export default ModelResults

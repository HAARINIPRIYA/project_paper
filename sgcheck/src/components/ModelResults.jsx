import { AnimatePresence, motion } from "framer-motion"
import {
  BarChart3,
  BrainCircuit,
  TrendingUp,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"

const MODEL_LABELS = {
  cane_sugar: "CaneSugar",
  catboost: "CatBoost",
  xgboost: "XGBoost",
  random_forest: "Random Forest",
  linear_regression: "Linear Regression",
  elastic_net: "ElasticNet",
}

const MODEL_COLORS_MAP = {
  cane_sugar: "#FF6B35",
  catboost: "#00CC66",
  xgboost: "#00E676",
  random_forest: "#FFD600",
  linear_regression: "#006030",
  elastic_net: "#FF5252",
}

function ModelRow({ name, prediction, metric, isEnsemble = false, isBest = false, compact = false }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "12px",
        padding: "6px 8px",
        border: "1px solid var(--border-subtle)",
        borderRadius: "2px",
        background: isEnsemble ? "var(--accent-green-bg)" : "var(--bg-deep)",
        transition: "background 120ms",
      }}
    >
      <div className="flex items-center gap-2" style={{ overflow: "visible", minWidth: 0 }}>
        <span
          className="size-2 shrink-0 rounded-full"
          style={{ background: MODEL_COLORS_MAP[name] || "var(--text-secondary)" }}
        />
        <span style={{ fontSize: compact ? "12px" : "13px", fontWeight: 500, whiteSpace: "nowrap", overflow: "visible" }}>
          {MODEL_LABELS[name] || name}
          {isEnsemble && <span style={{ color: "var(--accent-green)", marginLeft: "4px" }}>(Ensemble)</span>}
        </span>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span style={{ fontSize: compact ? "12px" : "13px", fontWeight: 600, color: isEnsemble ? "var(--accent-green)" : undefined }} className="tabular-nums">
          {prediction !== null && prediction !== undefined
            ? `${Number(prediction).toFixed(1)}`
            : "—"}
        </span>
        {metric !== null && metric !== undefined && (
          <Badge variant="secondary" className="text-[9px]" style={{ height: "16px" }}>
            R² {metric.toFixed(3)}
          </Badge>
        )}
      </div>
    </div>
  )
}

function ModelResults({ result, isEnsemble = false, bestModel = null }) {
  if (!result) return null

  const { predictions, model, metrics, individual_predictions, best_model } = result
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
        {/* Hero Result — Glowing Emerald Card */}
        <div className="aws-card prediction-hero" style={{ borderColor: "rgba(0, 214, 143, 0.25)", boxShadow: "0 0 30px rgba(0, 214, 143, 0.08), inset 0 1px 0 rgba(0, 214, 143, 0.06)" }}>
          <div style={{ padding: "16px 20px", borderBottom: "1px solid rgba(0, 214, 143, 0.12)", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "12px" }}>
            <div className="flex items-center gap-3">
              <div style={{
                width: "32px", height: "32px",
                background: "linear-gradient(135deg, #00D68F, #00F5A0)",
                borderRadius: "6px",
                display: "grid", placeItems: "center",
                boxShadow: "0 0 16px rgba(0, 214, 143, 0.35)",
              }}>
                <TrendingUp className="size-4" style={{ color: "#08090A" }} />
              </div>
              <div>
                <div style={{ fontSize: "15px", fontWeight: 600, color: "var(--text-primary)" }}>
                  {isEnsemble || model === "ensemble"
                    ? "Ensemble Prediction"
                    : `${MODEL_LABELS[model] || model} Prediction`}
                </div>
                <div style={{ fontSize: "11px", color: "var(--text-secondary)" }}>
                  {isEnsemble || model === "ensemble"
                    ? "Weighted average across all models"
                    : "Single model prediction"}
                </div>
              </div>
            </div>
            <Badge variant="green" className="text-[10px]" style={{ fontWeight: 600, padding: "2px 12px" }}>
              {metrics?.r2 ? `R² ${metrics.r2.toFixed(3)}` : isEnsemble ? "Combined" : best_model ? "★ Best" : "Result"}
            </Badge>
          </div>
          <div style={{ padding: "16px 20px 20px", display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: "16px" }}>
            <div className="result-highlight">
              <span className="result-highlight-value">
                {predValue !== null && predValue !== undefined
                  ? `${Number(predValue).toFixed(1)}`
                  : "—"}
              </span>
              <span className="result-highlight-unit" style={{ fontSize: "15px", color: "var(--text-secondary)", fontWeight: 500 }}>Quintal per Acre</span>
            </div>
            {metrics && (
              <div style={{ display: "flex", flexDirection: "column", gap: "6px", paddingBottom: "4px", alignItems: "flex-end" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "12px", color: "var(--text-secondary)" }}>
                  <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                    <span style={{ color: "var(--text-muted)", fontSize: "10px" }}>MAE</span>
                    <strong style={{ color: "var(--text-primary)" }}>{metrics.mae?.toFixed(1) || "—"}</strong>
                  </span>
                  <span style={{ opacity: 0.2, fontSize: "10px" }}>|</span>
                  <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                    <span style={{ color: "var(--text-muted)", fontSize: "10px" }}>RMSE</span>
                    <strong style={{ color: "var(--text-primary)" }}>{metrics.rmse?.toFixed(1) || "—"}</strong>
                  </span>
                </div>
                {bestModel && (
                  <Badge variant="green" className="text-[10px]" style={{ fontWeight: 600 }}>★ Best Model Selected</Badge>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Individual Model Breakdown (ensemble) */}
        {isEnsemble && sortedIndividual.length > 0 && (
          <div className="aws-card">
            <div className="aws-card-header">
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div className="aws-card-title" style={{ fontSize: "13px" }}>
                  <BarChart3 className="size-3.5" style={{ color: "var(--accent-blue)" }} />
                  Model Breakdown
                </div>
                <Badge variant="secondary" className="text-[9px]">{sortedIndividual.length} models</Badge>
              </div>
            </div>
            <div className="aws-card-body" style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              {sortedIndividual.map(([name, preds], idx) => (
                <ModelRow key={name} name={name} prediction={preds?.[0]} metric={null} isBest={idx === 0} compact />
              ))}
              <Separator style={{ opacity: 0.4, margin: "4px 0" }} />
              <ModelRow name="ensemble" prediction={predValue} metric={null} isEnsemble compact />
            </div>
          </div>
        )}

        {/* Metrics for single model */}
        {!isEnsemble && metrics && (
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            padding: "8px 12px",
            border: "1px solid var(--border-subtle)",
            borderRadius: "2px",
            background: "var(--bg-deep)",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", color: "var(--text-secondary)", flexWrap: "wrap" }}>
              <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>Metrics</span>
              <span style={{ opacity: 0.3 }}>|</span>
              <span>R²: <strong>{metrics.r2?.toFixed(4) || "—"}</strong></span>
              <span style={{ opacity: 0.3 }}>|</span>
              <span>MAE: {metrics.mae?.toFixed(2) || "—"}</span>
              <span style={{ opacity: 0.3 }}>|</span>
              <span>RMSE: {metrics.rmse?.toFixed(2) || "—"}</span>
            </div>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  )
}

export default ModelResults

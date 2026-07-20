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
  catboost: "CatBoost",
  xgboost: "XGBoost",
  random_forest: "Random Forest",
  linear_regression: "Linear Regression",
  elastic_net: "ElasticNet",
}

const MODEL_COLORS_MAP = {
  catboost: "#1d8102",
  xgboost: "#0073bb",
  random_forest: "#e68a00",
  linear_regression: "#7c3aed",
  elastic_net: "#d13212",
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
        border: "1px solid var(--aws-card-border)",
        borderRadius: "2px",
        background: isEnsemble ? "var(--aws-green-light)" : "var(--aws-bg)",
        transition: "background 120ms",
      }}
    >
      <div className="flex items-center gap-2 min-w-0">
        <span
          className="size-2 shrink-0 rounded-full"
          style={{ background: MODEL_COLORS_MAP[name] || "var(--aws-text-secondary)" }}
        />
        <span style={{ fontSize: compact ? "12px" : "13px", fontWeight: 500 }} className="truncate">
          {MODEL_LABELS[name] || name}
          {isEnsemble && <span style={{ color: "var(--aws-green)", marginLeft: "4px" }}>(Ensemble)</span>}
        </span>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span style={{ fontSize: compact ? "12px" : "13px", fontWeight: 600, color: isEnsemble ? "var(--aws-green)" : undefined }} className="tabular-nums">
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
        {/* Hero Result — AWS Console Style */}
        <div className="aws-card">
          <div style={{ padding: "16px", borderBottom: "1px solid var(--aws-card-border)", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "12px" }}>
            <div className="flex items-center gap-2.5">
              <div style={{
                width: "28px", height: "28px",
                background: "var(--aws-green)",
                borderRadius: "2px",
                display: "grid", placeItems: "center",
              }}>
                <TrendingUp className="size-3.5" style={{ color: "#fff" }} />
              </div>
              <div>
                <div style={{ fontSize: "14px", fontWeight: 600 }}>
                  {isEnsemble || model === "ensemble"
                    ? "Ensemble Prediction"
                    : `${MODEL_LABELS[model] || model} Prediction`}
                </div>
                <div style={{ fontSize: "11px", color: "var(--aws-text-secondary)" }}>
                  {isEnsemble || model === "ensemble"
                    ? "Weighted average across all models"
                    : "Single model prediction"}
                </div>
              </div>
            </div>
            <Badge variant="green" className="text-[9px]">
              {metrics?.r2 ? `R² ${metrics.r2.toFixed(3)}` : isEnsemble ? "Combined" : best_model ? "Best" : "Result"}
            </Badge>
          </div>
          <div style={{ padding: "16px", display: "flex", alignItems: "flex-end", gap: "12px" }}>
            <div className="result-highlight">
              <span className="result-highlight-value">
                {predValue !== null && predValue !== undefined
                  ? `${Number(predValue).toFixed(1)}`
                  : "—"}
              </span>
              <span className="result-highlight-unit">Quintal per Acre</span>
            </div>
            {metrics && (
              <div style={{ display: "flex", flexDirection: "column", gap: "4px", paddingBottom: "4px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "11px", color: "var(--aws-text-secondary)" }}>
                  <span>MAE: {metrics.mae?.toFixed(2) || "—"}</span>
                  <span style={{ opacity: 0.3 }}>|</span>
                  <span>RMSE: {metrics.rmse?.toFixed(2) || "—"}</span>
                </div>
                {bestModel && (
                  <Badge variant="green" className="text-[9px] w-fit">Best model selected</Badge>
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
                  <BarChart3 className="size-3.5" style={{ color: "var(--aws-blue)" }} />
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
            border: "1px solid var(--aws-card-border)",
            borderRadius: "2px",
            background: "var(--aws-bg)",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", color: "var(--aws-text-secondary)", flexWrap: "wrap" }}>
              <span style={{ fontWeight: 600, color: "var(--aws-text)" }}>Metrics</span>
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

import { AnimatePresence, motion } from "framer-motion"
import {
  BarChart3,
  BrainCircuit,
  ChevronDown,
  ChevronRight,
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
  catboost: "#059669",
  xgboost: "#2563eb",
  random_forest: "#d97706",
  linear_regression: "#7c3aed",
  elastic_net: "#dc2626",
}

const MODEL_GRADIENTS = {
  catboost: "linear-gradient(135deg, #059669, #10b981)",
  xgboost: "linear-gradient(135deg, #2563eb, #3b82f6)",
  random_forest: "linear-gradient(135deg, #d97706, #f59e0b)",
  linear_regression: "linear-gradient(135deg, #7c3aed, #8b5cf6)",
  elastic_net: "linear-gradient(135deg, #dc2626, #ef4444)",
}

function ModelRow({ name, prediction, metric, isEnsemble = false, isBest = false, compact = false }) {
  return (
    <div
      className={`flex items-center justify-between gap-3 rounded-lg border px-3 py-2 transition-all ${
        isEnsemble
          ? "border-emerald-500/30 bg-emerald-50/50 dark:bg-emerald-950/20 dark:border-emerald-500/15"
          : "border-border/40 bg-muted/20 hover:bg-muted/40"
      } ${isBest && !isEnsemble ? "ring-1 ring-emerald-500/20" : ""}`}
    >
      <div className="flex items-center gap-2 min-w-0">
        <span
          className="size-2 shrink-0 rounded-full"
          style={{ background: MODEL_COLORS_MAP[name] || "var(--muted-fg)" }}
        />
        <span className={`truncate ${compact ? "text-xs" : "text-sm"} font-medium`}>
          {MODEL_LABELS[name] || name}
          {isEnsemble && <span className="ml-1 text-emerald-600 dark:text-emerald-400">(Ensemble)</span>}
        </span>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span className={`font-semibold tabular-nums ${compact ? "text-xs" : "text-sm"} ${isEnsemble ? "text-emerald-700 dark:text-emerald-300" : ""}`}>
          {prediction !== null && prediction !== undefined
            ? `${Number(prediction).toFixed(1)}`
            : "—"}
        </span>
        {metric !== null && metric !== undefined && (
          <Badge variant="secondary" className="text-[9px] h-3.5">
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

  // Sort individual predictions by value (descending)
  const sortedIndividual = individual_predictions
    ? Object.entries(individual_predictions).sort(([, a], [, b]) => (b?.[0] || 0) - (a?.[0] || 0))
    : []

  // Find closest to ensemble average
  const avgPred = sortedIndividual.length > 0
    ? sortedIndividual.reduce((sum, [, p]) => sum + (p?.[0] || 0), 0) / sortedIndividual.length
    : predValue

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={JSON.stringify(result)}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -12 }}
        transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
        className="flex flex-col gap-4"
      >
        {/* Hero Result */}
        <div className="glass-card rounded-xl overflow-hidden">
          <div className="p-4 pb-3 flex items-start justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="size-9 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center shadow-sm">
                <TrendingUp className="size-4 text-white" />
              </div>
              <div>
                <div className="text-sm font-semibold">
                  {isEnsemble || model === "ensemble"
                    ? "Ensemble Prediction"
                    : `${MODEL_LABELS[model] || model} Prediction`}
                </div>
                <div className="text-xs text-muted-foreground">
                  {isEnsemble || model === "ensemble"
                    ? "Weighted average across all models"
                    : `Single model prediction`}
                </div>
              </div>
            </div>
            <Badge variant="emerald" className="text-[9px]">
              {metrics?.r2 ? `R² ${metrics.r2.toFixed(3)}` : isEnsemble ? "Combined" : best_model ? "Best" : "Result"}
            </Badge>
          </div>
          <Separator className="opacity-40" />
          <div className="p-4 pt-3 flex items-end gap-3">
            <div className="result-highlight">
              <span className="result-highlight-value">
                {predValue !== null && predValue !== undefined
                  ? `${Number(predValue).toFixed(1)}`
                  : "—"}
              </span>
              <span className="result-highlight-unit">Quintal per Acre</span>
            </div>
            {metrics && (
              <div className="flex flex-col gap-1 pb-1">
                <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                  <span>MAE: {metrics.mae?.toFixed(2) || "—"}</span>
                  <span className="opacity-30">|</span>
                  <span>RMSE: {metrics.rmse?.toFixed(2) || "—"}</span>
                </div>
                {bestModel && (
                  <Badge variant="outline" className="text-[9px] w-fit border-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                    Best model selected
                  </Badge>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Individual Model Breakdown (for ensemble) */}
        {isEnsemble && sortedIndividual.length > 0 && (
          <Card className="border-border/50 shadow-sm">
            <CardHeader className="pb-2 !pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-sm font-medium">
                  <BarChart3 className="size-4 text-emerald-600" />
                  Model Breakdown
                </CardTitle>
                <Badge variant="secondary" className="text-[9px]">
                  {sortedIndividual.length} models
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="flex flex-col gap-1.5">
              {sortedIndividual.map(([name, preds], idx) => (
                <ModelRow
                  key={name}
                  name={name}
                  prediction={preds?.[0]}
                  metric={null}
                  isBest={idx === 0}
                  compact
                />
              ))}
              <Separator className="my-1.5 opacity-40" />
              <ModelRow
                name="ensemble"
                prediction={predValue}
                metric={null}
                isEnsemble
                compact
              />
            </CardContent>
          </Card>
        )}

        {/* For non-ensemble, show metrics */}
        {!isEnsemble && metrics && (
          <div className="flex items-center gap-3 rounded-lg border border-border/40 bg-muted/10 px-3.5 py-2.5">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="font-medium text-foreground">Metrics</span>
              <span className="opacity-30">|</span>
              <span>R²: <strong>{metrics.r2?.toFixed(4) || "—"}</strong></span>
              <span className="opacity-30">|</span>
              <span>MAE: {metrics.mae?.toFixed(2) || "—"}</span>
              <span className="opacity-30">|</span>
              <span>RMSE: {metrics.rmse?.toFixed(2) || "—"}</span>
            </div>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  )
}

export default ModelResults

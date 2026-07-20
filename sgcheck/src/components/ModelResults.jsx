import { AnimatePresence, motion } from "framer-motion"
import {
  BarChart3,
  BrainCircuit,
  ChevronDown,
  ChevronUp,
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

const MODEL_COLORS = {
  catboost: "#059669",
  xgboost: "#2563eb",
  random_forest: "#d97706",
  linear_regression: "#7c3aed",
  elastic_net: "#dc2626",
}

function ModelRow({ name, prediction, metric, expanded }) {
  const Icon = expanded ? ChevronUp : ChevronDown
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border bg-muted/30 px-3 py-2 transition-colors hover:bg-muted/50">
      <div className="flex items-center gap-2.5 min-w-0">
        <span
          className="size-2 shrink-0 rounded-full"
          style={{ background: MODEL_COLORS[name] || "var(--muted-fg)" }}
        />
        <span className="truncate text-sm font-medium">
          {MODEL_LABELS[name] || name}
        </span>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <span className="text-sm font-semibold tabular-nums">
          {prediction !== null && prediction !== undefined
            ? `${Number(prediction).toFixed(1)} q/ha`
            : "—"}
        </span>
        {metric ? (
          <Badge
            variant="secondary"
            className="text-[10px]"
            style={{ fontWeight: 500 }}
          >
            R² {metric.toFixed(3)}
          </Badge>
        ) : null}
      </div>
    </div>
  )
}

function ModelResults({
  result,
  isEnsemble = false,
  bestModel = null,
}) {
  if (!result) return null

  const { predictions, model, metrics, individual_predictions } = result
  const predValue = predictions?.[0]

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={JSON.stringify(result)}
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: "auto" }}
        exit={{ opacity: 0, height: 0 }}
        transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
        className="flex flex-col gap-3 overflow-hidden"
      >
        {isEnsemble && individual_predictions ? (
          <Card>
            <CardHeader className="!pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-sm font-medium">
                  <BarChart3 className="size-4 text-emerald-600" />
                  Model Comparison
                </CardTitle>
                <Badge variant="secondary" className="text-[10px]">
                  Ensemble
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="flex flex-col gap-1.5">
              {Object.entries(individual_predictions).map(([name, preds]) => (
                <ModelRow
                  key={name}
                  name={name}
                  prediction={preds?.[0]}
                  metric={null}
                />
              ))}
              <Separator className="my-1.5" />
              <ModelRow
                name="ensemble"
                prediction={predValue}
                metric={null}
                isEnsemble
              />
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader className="!pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-sm font-medium">
                  {model === "ensemble" ? (
                    <>
                      <BrainCircuit className="size-4 text-emerald-600" />
                      Ensemble Prediction
                    </>
                  ) : (
                    <>
                      <TrendingUp className="size-4 text-emerald-600" />
                      {MODEL_LABELS[model] || model} Prediction
                    </>
                  )}
                </CardTitle>
                <div className="flex items-center gap-1.5">
                  {bestModel ? (
                    <Badge variant="outline" className="text-[10px]">
                      Best model
                    </Badge>
                  ) : null}
                  <Badge variant="secondary" className="text-[10px]">
                    R² {metrics?.r2?.toFixed(3) || "—"}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold tracking-tight text-emerald-700 dark:text-emerald-400">
                  {predValue !== null && predValue !== undefined
                    ? `${Number(predValue).toFixed(1)}`
                    : "—"}
                </span>
                <span className="text-sm text-muted-foreground">
                  Quintal per Acre
                </span>
              </div>
              {metrics ? (
                <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                  <span>MAE: {metrics.mae?.toFixed(2) || "—"}</span>
                  <span>RMSE: {metrics.rmse?.toFixed(2) || "—"}</span>
                </div>
              ) : null}
            </CardContent>
          </Card>
        )}
      </motion.div>
    </AnimatePresence>
  )
}

export default ModelResults

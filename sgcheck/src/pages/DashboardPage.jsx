import { useMemo } from "react"
import { motion } from "framer-motion"
import {
  Activity,
  BarChart3,
  BrainCircuit,
  ChevronRight,
  Cpu,
  FileSpreadsheet,
  GaugeCircle,
  MapPinned,
  Sparkles,
  TrendingUp,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import ModelResults from "@/components/ModelResults"

const MODEL_LABELS = {
  catboost: "CatBoost",
  xgboost: "XGBoost",
  random_forest: "Random Forest",
  linear_regression: "Linear Regression",
  elastic_net: "ElasticNet",
}

const MODEL_COLORS = {
  catboost: "var(--color-emerald-500)",
  xgboost: "var(--color-blue-500)",
  random_forest: "var(--color-amber-500)",
  linear_regression: "var(--color-purple-500)",
  elastic_net: "var(--color-red-500)",
}

const MODEL_GRADIENTS = {
  catboost: "linear-gradient(90deg, #059669, #10b981)",
  xgboost: "linear-gradient(90deg, #2563eb, #3b82f6)",
  random_forest: "linear-gradient(90deg, #d97706, #f59e0b)",
  linear_regression: "linear-gradient(90deg, #7c3aed, #8b5cf6)",
  elastic_net: "linear-gradient(90deg, #dc2626, #ef4444)",
}

function DashboardPage({ uploadedImage, gpsData, availableModels, modelMetrics, backendStatus, predictionResult, ensembleResult }) {
  // Compute sorted models by R²
  const sortedModels = useMemo(() => {
    if (!availableModels || !modelMetrics) return []
    return [...availableModels]
      .map((name) => ({ name, ...(modelMetrics[name] || {}) }))
      .sort((a, b) => (b.r2 || 0) - (a.r2 || 0))
  }, [availableModels, modelMetrics])

  const bestModel = sortedModels[0]
  const maxR2 = sortedModels.length > 0 ? Math.max(...sortedModels.map((m) => m.r2 || 0), 0.1) : 1

  // Stats cards data
  const stats = useMemo(() => [
    {
      label: "Models Deployed",
      value: backendStatus === "connected" ? (availableModels?.length || 0) : "—",
      meta: backendStatus === "connected" ? "Trained & production-ready" : "Backend offline",
      icon: Cpu,
      gradient: "from-emerald-600 to-emerald-700",
      badge: backendStatus === "connected" ? "Active" : "Offline",
      badgeVariant: backendStatus === "connected" ? "emerald" : "secondary",
    },
    {
      label: "Best Model (R²)",
      value: bestModel ? MODEL_LABELS[bestModel.name] || bestModel.name : "—",
      meta: bestModel ? `R² ${bestModel.r2?.toFixed(4) || "—"}` : "No data",
      icon: TrendingUp,
      gradient: "from-blue-500 to-blue-600",
      badge: bestModel ? `Score ${bestModel.r2?.toFixed(2) || ""}` : null,
      badgeVariant: "secondary",
    },
    {
      label: "Field Context",
      value: gpsData ? "Configured" : "Not Set",
      meta: gpsData
        ? `${gpsData.Planting_Date || gpsData.Variety || "Parameters saved"}`
        : "Add in Tools panel",
      icon: MapPinned,
      gradient: gpsData ? "from-amber-400 to-amber-500" : "",
      badge: gpsData ? "Ready" : "Required",
      badgeVariant: gpsData ? "emerald" : "outline",
    },
    {
      label: "Prediction Status",
      value: gpsData && backendStatus === "connected" ? "Ready" : "Not Ready",
      meta: gpsData && backendStatus === "connected"
        ? "Ensemble + 5 individual models"
        : backendStatus !== "connected"
          ? "Start backend first"
          : "Add field data",
      icon: GaugeCircle,
      gradient: gpsData && backendStatus === "connected" ? "from-emerald-600 to-emerald-700" : "",
      badge: gpsData && backendStatus === "connected" ? "Go" : "Pending",
      badgeVariant: gpsData && backendStatus === "connected" ? "emerald" : "secondary",
    },
  ], [backendStatus, availableModels, gpsData, bestModel])

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.06, delayChildren: 0.08 },
    },
  }

  const itemAnim = {
    hidden: { opacity: 0, y: 16 },
    show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.25, 0.1, 0.25, 1] } },
  }

  // Recent activity
  const activities = [
    { title: "Field A-12 Analysis", meta: "2 hours ago", tag: "Complete", r2: "0.909" },
    { title: "Ensemble Training", meta: "Yesterday", tag: "Complete", r2: "—" },
    { title: "Data Pipeline", meta: "3 days ago", tag: "Complete", r2: "—" },
  ]

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="flex flex-col gap-6">
      {/* Header */}
      <motion.div variants={itemAnim} className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2.5">
            <div className="size-8 rounded-xl bg-gradient-to-br from-emerald-600 to-emerald-700 flex items-center justify-center shadow-sm">
              <Sparkles className="size-4 text-white" />
            </div>
            <div>
              <div className="text-xl font-semibold tracking-tight">Dashboard</div>
              <div className="text-sm text-muted-foreground">
                Model performance, field data & prediction overview
              </div>
            </div>
          </div>
        </div>
        <Badge variant="outline" className="shrink-0 text-[10px] tracking-wide py-1">
          <span className="size-1.5 rounded-full bg-emerald-500 mr-1.5 inline-block" />
          {backendStatus === "connected" ? "System Online" : "Offline"}
        </Badge>
      </motion.div>

      {/* Stats Cards */}
      <motion.div variants={itemAnim} className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((s) => {
          const Icon = s.icon
          return (
            <div key={s.label} className="stat-card group/card">
              <div className="stat-card-header">
                <div className="space-y-1">
                  <div className="text-xs font-medium text-muted-foreground">{s.label}</div>
                  <div className="stat-value">{typeof s.value === "number" ? s.value : s.value}</div>
                </div>
                <div className="stat-card-icon-wrap">
                  <Icon className="size-4" />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="stat-meta">{s.meta}</div>
                <Badge variant={s.badgeVariant || "secondary"} className="text-[9px] h-3.5">
                  {s.badge}
                </Badge>
              </div>
            </div>
          )
        })}
      </motion.div>

      {/* Main Content: Model Performance + Prediction Flow */}
      <motion.div variants={itemAnim} className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        {/* Model Performance (Left - spans 2 columns) */}
        <div className="flex flex-col gap-4 xl:col-span-2">
          {/* Model Comparison Chart */}
          <Card className="border-border/50 shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-base font-semibold">
                  <BrainCircuit className="size-4 text-emerald-600" />
                  Model Performance Comparison
                </CardTitle>
                <Badge variant="emerald" className="text-[9px]">
                  {sortedModels.length} models
                </Badge>
              </div>
              <CardDescription>
                All models trained on sugarcane field & spectral data — sorted by R² score
              </CardDescription>
            </CardHeader>
            <CardContent>
              {backendStatus !== "connected" ? (
                <div className="flex flex-col items-center gap-3 py-10 text-center">
                  <Cpu className="size-10 text-muted-foreground/20" />
                  <div className="text-sm text-muted-foreground">
                    Backend not connected. Run the API server to see model performance.
                  </div>
                </div>
              ) : sortedModels.length === 0 ? (
                <div className="flex flex-col items-center gap-3 py-10 text-center">
                  <BarChart3 className="size-10 text-muted-foreground/20" />
                  <div className="text-sm text-muted-foreground">
                    No trained models found. Run training first.
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-1.5 pt-1">
                  {/* Header */}
                  <div className="flex items-center gap-2 px-1 pb-2">
                    <div className="w-[6.5rem] shrink-0" />
                    <div className="flex-1" />
                    <div className="w-[3.5rem] shrink-0 text-right">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/50">R²</span>
                    </div>
                    <div className="w-[3.5rem] shrink-0 text-right">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/50">RMSE</span>
                    </div>
                  </div>

                  {/* Model Bars */}
                  {sortedModels.map((model, idx) => {
                    const widthPct = Math.max(((model.r2 || 0) / maxR2) * 100, 5)
                    const isBest = idx === 0
                    return (
                      <div
                        key={model.name}
                        className={`model-rank-item ${isBest ? "best" : ""}`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0" style={{ width: "6.5rem", flexShrink: 0 }}>
                          <div className="model-rank-badge">{idx + 1}</div>
                          <span
                            className="size-2 shrink-0 rounded-full"
                            style={{ background: MODEL_COLORS[model.name] || "var(--muted-fg)" }}
                          />
                          <span className="truncate text-sm font-medium">
                            {MODEL_LABELS[model.name] || model.name}
                          </span>
                        </div>

                        {/* Bar Chart */}
                        <div className="flex-1 flex items-center">
                          <div className="model-bar-track">
                            <div
                              className="model-bar-fill"
                              style={{
                                width: `${widthPct}%`,
                                background: MODEL_GRADIENTS[model.name] || MODEL_COLORS[model.name],
                              }}
                            />
                          </div>
                        </div>

                        {/* R² Value */}
                        <div className="w-[3.5rem] shrink-0 text-right">
                          <span className="text-xs font-semibold tabular-nums">
                            {model.r2 ? model.r2.toFixed(3) : "—"}
                          </span>
                        </div>

                        {/* RMSE Value */}
                        <div className="w-[3.5rem] shrink-0 text-right">
                          <span className="text-[11px] text-muted-foreground tabular-nums">
                            {model.rmse ? model.rmse.toFixed(1) : "—"}
                          </span>
                        </div>

                        {/* Best badge */}
                        {isBest && (
                          <div className="w-10 shrink-0 flex justify-center">
                            <Badge variant="emerald" className="text-[8px] h-3.5 px-1">
                              Best
                            </Badge>
                          </div>
                        )}
                      </div>
                    )
                  })}

                  {/* Legend */}
                  <div className="flex items-center gap-4 pt-3 px-1">
                    <span className="text-[10px] text-muted-foreground">
                      <span className="inline-block size-1.5 rounded-full bg-emerald-500 mr-1" />
                      Gradient Boosting wins on structured tabular data
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card className="border-border/50 shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-base font-semibold">
                  <Activity className="size-4 text-emerald-600" />
                  Recent Activity
                </CardTitle>
                <Badge variant="secondary" className="text-[9px]">Updates</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-2">
                {activities.map((a) => (
                  <div key={a.title} className="activity-item group/activity">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className={"activity-dot " + (a.tag === "Running" ? "running" : "done")} />
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium">{a.title}</div>
                        <div className="truncate text-xs text-muted-foreground">{a.meta}</div>
                      </div>
                    </div>
                    <Badge variant={a.tag === "Running" ? "default" : "secondary"} className="shrink-0 text-[9px] h-4">
                      {a.tag}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Summary + Prediction Results */}
        <div className="flex flex-col gap-4">
          {/* Prediction Results */}
          {(predictionResult || ensembleResult) && (
            <div className="animate-slide-up">
              <ModelResults result={ensembleResult || predictionResult} isEnsemble={!!ensembleResult} />
            </div>
          )}

          {/* Quick Summary */}
          <Card className="border-border/50 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base font-semibold">
                <FileSpreadsheet className="size-4 text-emerald-600" />
                Session Summary
              </CardTitle>
              <CardDescription>Current input state</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {/* Billet Image */}
              <div className="info-card">
                <div className="info-card-label">Billet Image</div>
                <div className="info-card-value flex items-center gap-2">
                  {uploadedImage ? (
                    <>
                      <span className="size-1.5 rounded-full bg-emerald-500" />
                      <span className="truncate text-xs">{uploadedImage.name}</span>
                    </>
                  ) : (
                    <span className="italic text-muted-foreground text-xs" style={{ opacity: 0.5 }}>
                      Not uploaded
                    </span>
                  )}
                </div>
              </div>

              {/* Field Details */}
              <div className="info-card">
                <div className="info-card-label">Field Details</div>
                <div className="info-card-value">
                  {gpsData ? (
                    <div className="flex flex-col gap-1">
                      {gpsData.Planting_Date && (
                        <div className="text-xs">
                          <span className="font-medium">Planted:</span> {gpsData.Planting_Date}
                          {gpsData.Harvesting_Date && ` · Harvest: ${gpsData.Harvesting_Date}`}
                        </div>
                      )}
                      <div className="flex flex-wrap gap-1">
                        {gpsData.Variety && <span className="text-[10px] bg-muted/40 px-1.5 py-0.5 rounded">{gpsData.Variety}</span>}
                        {gpsData.Crop_Type && <span className="text-[10px] bg-muted/40 px-1.5 py-0.5 rounded">{gpsData.Crop_Type}</span>}
                        {gpsData.Soil_Type && <span className="text-[10px] bg-muted/40 px-1.5 py-0.5 rounded">{gpsData.Soil_Type}</span>}
                        {gpsData.Irrigation_Type && <span className="text-[10px] bg-muted/40 px-1.5 py-0.5 rounded">{gpsData.Irrigation_Type}</span>}
                        {gpsData.Fertilizer_Type && <span className="text-[10px] bg-muted/40 px-1.5 py-0.5 rounded">{gpsData.Fertilizer_Type}</span>}
                      </div>
                    </div>
                  ) : (
                    <span className="italic text-muted-foreground text-xs" style={{ opacity: 0.5 }}>
                      Not configured
                    </span>
                  )}
                </div>
              </div>

              <Separator className="opacity-50" />

              {/* Mini Status */}
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                <div className="mini-card">
                  <div className="mini-card-label">Stage</div>
                  <div className="mini-card-value flex items-center gap-1.5">
                    <span className="size-1.5 rounded-full bg-emerald-500" />
                    Input Collection
                  </div>
                </div>
                <div className="mini-card">
                  <div className="mini-card-label">Next Output</div>
                  <div className="mini-card-value">Yield Prediction</div>
                </div>
                <div className="mini-card">
                  <div className="mini-card-label">Confidence</div>
                  <div className="mini-card-value">
                    <span className="confidence-indicator">
                      <span className={"confidence-dot " + (gpsData && backendStatus === "connected" ? "high" : "medium")} />
                      {gpsData && backendStatus === "connected" ? "High" : "Medium"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Quick Action */}
              {!predictionResult && !ensembleResult && (
                <button
                  type="button"
                  className="flex items-center justify-between rounded-lg border border-dashed border-border/60 bg-muted/20 px-3 py-2.5 text-sm text-muted-foreground transition-all hover:border-emerald-500/30 hover:bg-emerald-50/30 hover:text-emerald-700 dark:hover:bg-emerald-950/20 dark:hover:text-emerald-400 mt-1"
                  onClick={() => {
                    // This would navigate to prediction mode
                  }}
                >
                  <span className="flex items-center gap-2">
                    <TrendingUp className="size-3.5" />
                    Run a prediction to see results
                  </span>
                  <ChevronRight className="size-3.5 opacity-50" />
                </button>
              )}
            </CardContent>
          </Card>

          {/* Model Details */}
          {sortedModels.length > 0 && (
            <Card className="border-border/50 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base font-semibold">
                  <BarChart3 className="size-4 text-emerald-600" />
                  Model Details
                </CardTitle>
                <CardDescription>Individual model specifications</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-2">
                {sortedModels.map((model) => (
                  <div key={model.name} className="flex items-center justify-between gap-3 rounded-lg border border-border/40 bg-muted/20 px-3 py-2 transition-colors hover:bg-muted/40">
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="size-2 shrink-0 rounded-full"
                        style={{ background: MODEL_COLORS[model.name] || "var(--muted-fg)" }}
                      />
                      <span className="text-xs font-medium truncate">
                        {MODEL_LABELS[model.name] || model.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-2.5 shrink-0">
                      <span className="text-[10px] tabular-nums text-muted-foreground">
                        Features: {model.features_count || "—"}
                      </span>
                      <span className="text-[10px] font-semibold tabular-nums">
                        R² {model.r2?.toFixed(4) || "—"}
                      </span>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}

export default DashboardPage

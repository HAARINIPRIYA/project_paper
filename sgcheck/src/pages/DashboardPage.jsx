import { motion } from "framer-motion"
import {
  BarChart3,
  BrainCircuit,
  Cpu,
  MapPinned,
  TrendingUp,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
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

function DashboardPage({ uploadedImage, gpsData, availableModels, modelMetrics, backendStatus }) {
  const stats = [
    {
      label: "Models deployed",
      value: backendStatus === "connected" ? (availableModels?.length || 0) : "—",
      meta: backendStatus === "connected" ? "Trained & ready" : "Backend offline",
      icon: Cpu,
    },
    {
      label: "Best model (R²)",
      value: (() => {
        if (backendStatus !== "connected" || !modelMetrics) return "—"
        const best = Object.entries(modelMetrics).sort(
          ([, a], [, b]) => (b.r2 || 0) - (a.r2 || 0)
        )[0]
        return best ? MODEL_LABELS[best[0]] || best[0] : "—"
      })(),
      meta: (() => {
        if (backendStatus !== "connected" || !modelMetrics) return "No data"
        const best = Object.entries(modelMetrics).sort(
          ([, a], [, b]) => (b.r2 || 0) - (a.r2 || 0)
        )[0]
        return best ? `R² ${best[1].r2?.toFixed(4) || "—"}` : "No data"
      })(),
      icon: TrendingUp,
    },
    {
      label: "Field context",
      value: gpsData ? "Ready" : "Missing",
      meta: gpsData
        ? `${gpsData.latitude}, ${gpsData.longitude}`
        : "Add in Tools panel",
      icon: MapPinned,
    },
    {
      label: "Prediction ready",
      value: gpsData && backendStatus === "connected" ? "Yes" : "No",
      meta:
        gpsData && backendStatus === "connected"
          ? "Ensemble + 5 models"
          : backendStatus !== "connected"
            ? "Start backend first"
            : "Add field data",
      icon: BarChart3,
    },
  ]

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.06, delayChildren: 0.08 },
    },
  }

  const itemAnim = {
    hidden: { opacity: 0, y: 12 },
    show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.25, 0.1, 0.25, 1] } },
  }

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="flex flex-col gap-5">
      <motion.div variants={itemAnim} className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="text-lg font-semibold tracking-tight">Dashboard</div>
          <div className="text-sm text-muted-foreground">
            A quick view of your latest inputs and field signals.
          </div>
        </div>
        <Badge variant="outline" className="shrink-0 tracking-wide" style={{ fontSize: "11px" }}>CaneSense</Badge>
      </motion.div>

      <motion.div variants={itemAnim} className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((s) => {
          const Icon = s.icon
          return (
            <Card key={s.label} className="transition-shadow duration-200" style={{}}>
              <CardHeader className="flex flex-row items-center justify-between gap-3" style={{ margin: 0 }}>
                <CardTitle className="text-sm font-medium">{s.label}</CardTitle>
                <div className="stat-card-icon-wrap">
                  <Icon className="size-4" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="stat-value">{s.value}</div>
                <div className="stat-meta">{s.meta}</div>
              </CardContent>
            </Card>
          )
        })}
      </motion.div>

      {/* Model Performance Section */}
      {backendStatus === "connected" && availableModels?.length > 0 ? (
        <motion.div variants={itemAnim} className="grid grid-cols-1 gap-3 xl:grid-cols-3">
          <Card className="xl:col-span-2 transition-shadow duration-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BrainCircuit className="size-4 text-emerald-600" />
                Model Performance
              </CardTitle>
              <CardDescription>
                {availableModels.length} trained models — sorted by R² score
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              {[...availableModels]
                .sort((a, b) => (modelMetrics[b]?.r2 || 0) - (modelMetrics[a]?.r2 || 0))
                .map((name, idx) => {
                  const m = modelMetrics[name] || {}
                  const isBest = idx === 0
                  return (
                    <div
                      key={name}
                      className={"model-rank-item" + (isBest ? " best" : "")}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="model-rank-badge">{idx + 1}</div>
                        <span
                          className="size-2 shrink-0 rounded-full"
                          style={{ background: MODEL_COLORS[name] || "var(--muted-fg)" }}
                        />
                        <div className="min-w-0">
                          <div className="truncate text-sm font-medium">
                            {MODEL_LABELS[name] || name}
                            {isBest ? (
                              <Badge
                                variant="outline"
                                className="ml-1.5 text-[9px]"
                                style={{ borderColor: "var(--color-emerald-500)", color: "var(--color-emerald-600)", height: "1rem", padding: "0 0.25rem" }}
                              >
                                Best
                              </Badge>
                            ) : null}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 shrink-0">
                        <div className="flex flex-col items-end">
                          <span className="text-xs font-semibold tabular-nums">
                            R² {m.r2 ? m.r2.toFixed(4) : "—"}
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            RMSE {m.rmse ? m.rmse.toFixed(1) : "—"}
                          </span>
                        </div>
                        {/* Mini bar chart */}
                        <div className="model-rank-bar-wrap">
                          <div
                            className="model-rank-bar"
                            style={{
                              width: `${Math.max((m.r2 || 0) * 100, 10)}%`,
                              background: MODEL_COLORS[name] || "var(--muted-fg)",
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  )
                })}
            </CardContent>
          </Card>

          <Card className="transition-shadow duration-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="size-4 text-emerald-600" />
                Summary
              </CardTitle>
              <CardDescription>Quick overview of available data</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="grid grid-cols-1 gap-3">
                <div className="info-card">
                  <div className="info-card-label">Billet image</div>
                  <div className="info-card-value">
                    {uploadedImage ? uploadedImage.name : (
                      <span className="italic text-muted-foreground" style={{ opacity: 0.6 }}>Not uploaded</span>
                    )}
                  </div>
                </div>
                <div className="info-card">
                  <div className="info-card-label">Field details</div>
                  <div className="info-card-value">
                    {gpsData
                      ? `${gpsData.latitude}, ${gpsData.longitude} · ${gpsData.plantingDate}`
                      : <span className="italic text-muted-foreground" style={{ opacity: 0.6 }}>Not saved</span>}
                  </div>
                </div>
              </div>
              <Separator />
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="mini-card">
                  <div className="mini-card-label">Stage</div>
                  <div className="mini-card-value">Input collection</div>
                </div>
                <div className="mini-card">
                  <div className="mini-card-label">Next output</div>
                  <div className="mini-card-value">Yield prediction</div>
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
            </CardContent>
          </Card>
        </motion.div>
      ) : (
        <motion.div variants={itemAnim} className="grid grid-cols-1 gap-3 xl:grid-cols-3">
          <Card className="xl:col-span-2 transition-shadow duration-200">
            <CardHeader>
              <CardTitle>Latest run</CardTitle>
              <CardDescription>What the system will use for the next analysis</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="info-card">
                  <div className="info-card-label">Billet image</div>
                  <div className="info-card-value">
                    {uploadedImage ? uploadedImage.name : (
                      <span className="italic text-muted-foreground" style={{ opacity: 0.6 }}>Not uploaded</span>
                    )}
                  </div>
                </div>
                <div className="info-card">
                  <div className="info-card-label">Field details</div>
                  <div className="info-card-value">
                    {gpsData
                      ? `${gpsData.latitude}, ${gpsData.longitude} · ${gpsData.plantingDate}`
                      : <span className="italic text-muted-foreground" style={{ opacity: 0.6 }}>Not saved</span>}
                  </div>
                </div>
              </div>
              <Separator />
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="mini-card">
                  <div className="mini-card-label">Backend</div>
                  <div className="mini-card-value">
                    <span className="confidence-indicator">
                      <span className="confidence-dot medium" />
                      {backendStatus === "checking" ? "Connecting..." : "Offline"}
                    </span>
                  </div>
                </div>
                <div className="mini-card">
                  <div className="mini-card-label">Next output</div>
                  <div className="mini-card-value">Yield prediction</div>
                </div>
                <div className="mini-card">
                  <div className="mini-card-label">Confidence</div>
                  <div className="mini-card-value">
                    <span className="confidence-indicator">
                      <span className="confidence-dot medium" />
                      Medium
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="transition-shadow duration-200">
            <CardHeader>
              <CardTitle>Activity</CardTitle>
              <CardDescription>Recent analysis sessions</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              {[
                { title: "Field A-12", meta: "2 mins ago", tag: "Complete" },
                { title: "Field B-05", meta: "5 mins ago", tag: "Running" },
                { title: "Seed batch 07", meta: "12 mins ago", tag: "Complete" },
              ].map((a) => (
                <div key={a.title} className="activity-item">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className={"activity-dot " + (a.tag === "Running" ? "running" : "done")} />
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium">{a.title}</div>
                      <div className="truncate text-xs text-muted-foreground">{a.meta}</div>
                    </div>
                  </div>
                  <Badge variant={a.tag === "Running" ? "default" : "secondary"} className="shrink-0" style={{ fontSize: "10px", height: "1.25rem" }}>
                    {a.tag}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </motion.div>
      )}
    </motion.div>
  )
}

export default DashboardPage

import { useMemo } from "react"
import { motion } from "framer-motion"
import {
  Activity,
  Award,
  BarChart3,
  BrainCircuit,
  CheckCircle2,
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
  cane_sugar: "CaneSugar",
  catboost: "CatBoost",
  xgboost: "XGBoost",
  random_forest: "Random Forest",
  linear_regression: "Linear Regression",
  elastic_net: "ElasticNet",
}

const MODEL_COLORS = {
  cane_sugar: "var(--accent-terracotta)",
  catboost: "var(--accent-gold)",
  xgboost: "var(--accent-sage)",
  random_forest: "var(--accent-orange)",
  linear_regression: "var(--accent-purple)",
  elastic_net: "var(--accent-red)",
}

const MODEL_GRADIENTS = {
  cane_sugar: "linear-gradient(90deg, #C76B4A, #B05535)",
  catboost: "linear-gradient(90deg, #D4A843, #B88A30)",
  xgboost: "linear-gradient(90deg, #7BA05B, #5C7A40)",
  random_forest: "linear-gradient(90deg, #E8A048, #D48830)",
  linear_regression: "linear-gradient(90deg, #9B7ED8, #7B5CC0)",
  elastic_net: "linear-gradient(90deg, #E55858, #CC4040)",
}

function getAccuracyRating(r2) {
  if (r2 >= 0.90) return { label: "Excellent", color: "var(--accent-green)", icon: CheckCircle2 }
  if (r2 >= 0.80) return { label: "Good", color: "var(--accent-gold)", icon: Award }
  if (r2 >= 0.70) return { label: "Fair", color: "var(--accent-orange)", icon: TrendingUp }
  return { label: "Poor", color: "var(--accent-red)", icon: TrendingUp }
}

function DashboardPage({ uploadedImage, gpsData, availableModels, modelMetrics, trainingSummary, backendStatus, predictionResult, ensembleResult }) {
  const sortedModels = useMemo(() => {
    if (!availableModels || !modelMetrics) return []
    return [...availableModels]
      .map((name) => ({ name, ...(modelMetrics[name] || {}) }))
      .sort((a, b) => (b.r2 || 0) - (a.r2 || 0))
  }, [availableModels, modelMetrics])

  const bestModel = sortedModels[0]
  const maxR2 = sortedModels.length > 0 ? Math.max(...sortedModels.map((m) => m.r2 || 0), 0.1) : 1
  
  // Build training summary metrics from backend data
  const accuracySummary = useMemo(() => {
    if (!trainingSummary) return null
    const entries = Object.entries(trainingSummary)
      .filter(([k]) => !k.startsWith("_"))
      .map(([name, m]) => ({ name, ...m }))
      .sort((a, b) => (b.r2 || 0) - (a.r2 || 0))
    if (entries.length === 0) return null
    const best = entries[0]
    const rating = getAccuracyRating(best.r2)
    return { best, entries, rating }
  }, [trainingSummary])

  const stats = useMemo(() => [
    {
      label: "Models Deployed",
      value: backendStatus === "connected" ? (availableModels?.length || 0) : "—",
      meta: backendStatus === "connected" ? "Trained & production-ready" : "Backend offline",
      icon: Cpu,
      badge: backendStatus === "connected" ? "Active" : "Offline",
      badgeVariant: backendStatus === "connected" ? "green" : "outline",
    },
    {
      label: "Best Model (R²)",
      value: bestModel ? MODEL_LABELS[bestModel.name] || bestModel.name : "—",
      meta: bestModel ? `R² ${bestModel.r2?.toFixed(4) || "—"}` : "No data",
      icon: TrendingUp,
      badge: bestModel ? bestModel.r2?.toFixed(2) || "" : null,
      badgeVariant: "secondary",
    },
    {
      label: "Field Context",
      value: gpsData ? "Configured" : "Not Set",
      meta: gpsData
        ? `${gpsData.Planting_Date || gpsData.Variety || "Parameters saved"}`
        : "Add in Tools panel",
      icon: MapPinned,
      badge: gpsData ? "Ready" : "Required",
      badgeVariant: gpsData ? "green" : "outline",
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
      badge: gpsData && backendStatus === "connected" ? "Go" : "Pending",
      badgeVariant: gpsData && backendStatus === "connected" ? "green" : "secondary",
    },
  ], [backendStatus, availableModels, gpsData, bestModel])

  const container = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.06, delayChildren: 0.06 } },
  }

  const itemAnim = {
    hidden: { opacity: 0, y: 12 },
    show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.25, 0.1, 0.25, 1] } },
  }

  const activities = [
    { title: "Field A-12 Analysis", meta: "2 hours ago", tag: "Complete" },
    { title: "Ensemble Training", meta: "Yesterday", tag: "Complete" },
    { title: "Data Pipeline", meta: "3 days ago", tag: "Complete" },
  ]

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="flex flex-col gap-6">
      {}
      <motion.div variants={itemAnim} className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "2px" }}>
            <div style={{
              width: "28px", height: "28px",
              background: "linear-gradient(135deg, var(--accent-gold), #B88A30)",
              borderRadius: "2px",
              display: "grid", placeItems: "center",
              flexShrink: 0,
            }}>
              <Sparkles className="size-3.5" style={{ color: "#fff" }} />
            </div>
            <h1 style={{ fontSize: "18px", fontWeight: 600, margin: 0, color: "var(--text-primary)" }}>Dashboard</h1>
          </div>
          <p style={{ fontSize: "13px", color: "var(--text-secondary)", margin: 0, marginLeft: "36px" }}>
            Model performance, field data & prediction overview
          </p>
        </div>
        <Badge variant={backendStatus === "connected" ? "green" : "outline"} className="shrink-0 text-[10px] tracking-wide py-1">
          <span className="status-dot" style={{ background: backendStatus === "connected" ? "var(--accent-green)" : "var(--text-secondary)", marginRight: "6px", display: "inline-block" }} />
          {backendStatus === "connected" ? "System Online" : "Offline"}
        </Badge>
      </motion.div>

      {}
      <motion.div variants={itemAnim} className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((s) => {
          const Icon = s.icon
          return (
            <div key={s.label} className="stat-card">
              <div className="stat-card-header">
                <div>
                  <div className="stat-card-label">{s.label}</div>
                  <div className="stat-value">{typeof s.value === "number" ? s.value : s.value}</div>
                </div>
                <div className="stat-card-icon">
                  <Icon className="size-4" />
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div className="stat-meta">{s.meta}</div>
                <Badge variant={s.badgeVariant || "secondary"} className="text-[9px]" style={{ height: "18px" }}>
                  {s.badge}
                </Badge>
              </div>
            </div>
          )
        })}
      </motion.div>

      {}
      <motion.div variants={itemAnim} className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        {}
        <div className="flex flex-col gap-5 xl:col-span-2">
          {}
          <div className="aws-card">
            <div className="aws-card-header">
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  <div className="aws-card-title">
                    <BrainCircuit className="size-4" style={{ color: "var(--accent-blue)" }} />
                    Model Performance
                  </div>
                  <div className="aws-card-subtitle">
                    All models trained on sugarcane field & spectral data — sorted by R² score
                  </div>
                </div>
                <Badge variant="blue" className="text-[9px]">{sortedModels.length} models</Badge>
              </div>
            </div>
            <div className="aws-card-body">
              {backendStatus !== "connected" ? (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "12px", padding: "40px 0", textAlign: "center" }}>
                  <Cpu className="size-10" style={{ opacity: 0.2, color: "var(--text-secondary)" }} />
                  <div style={{ fontSize: "13px", color: "var(--text-secondary)" }}>
                    Backend not connected. Run the API server to see model performance.
                  </div>
                </div>
              ) : sortedModels.length === 0 ? (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "12px", padding: "40px 0", textAlign: "center" }}>
                  <BarChart3 className="size-10" style={{ opacity: 0.2, color: "var(--text-secondary)" }} />
                  <div style={{ fontSize: "13px", color: "var(--text-secondary)" }}>
                    No trained models found. Run training first.
                  </div>
                </div>
              ) : (
                <div className="flex flex-col" style={{ gap: "2px" }}>
                  {}
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "4px 8px 8px" }}>
                    <div style={{ width: "160px", flexShrink: 0 }} />
                    <div className="flex-1" />
                    <div style={{ width: "52px", flexShrink: 0, textAlign: "right" }}>
                      <span className="divider-label-text">R²</span>
                    </div>
                    <div style={{ width: "52px", flexShrink: 0, textAlign: "right" }}>
                      <span className="divider-label-text">MAE</span>
                    </div>
                    <div style={{ width: "52px", flexShrink: 0, textAlign: "right" }}>
                      <span className="divider-label-text">RMSE</span>
                    </div>
                    <div style={{ width: "56px", flexShrink: 0 }} />
                  </div>

                  {}
                  {sortedModels.map((model, idx) => {
                    const widthPct = Math.max(((model.r2 || 0) / maxR2) * 100, 5)
                    const isBest = idx === 0
                    return (
                      <div key={model.name} className={"model-rank-item" + (isBest ? " best" : "")}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", width: "160px", flexShrink: 0, overflow: "hidden" }}>
                          <div className="model-rank-badge">{idx + 1}</div>
                          <span className="size-2 shrink-0 rounded-full" style={{ background: MODEL_COLORS[model.name] || "var(--text-secondary)" }} />
                          <span style={{ fontSize: "13px", fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {MODEL_LABELS[model.name] || model.name}
                          </span>
                        </div>
                        <div className="flex-1 flex items-center">
                          <div className="model-bar-track">
                            <div className="model-bar-fill" style={{
                              width: `${widthPct}%`,
                              background: MODEL_GRADIENTS[model.name] || MODEL_COLORS[model.name],
                            }} />
                          </div>
                        </div>
                        <div style={{ width: "52px", flexShrink: 0, textAlign: "right" }}>
                          <span style={{ fontSize: "12px", fontWeight: 600 }} className="tabular-nums">
                            {model.r2 ? model.r2.toFixed(3) : "—"}
                          </span>
                        </div>
                        <div style={{ width: "52px", flexShrink: 0, textAlign: "right" }}>
                          <span style={{ fontSize: "11px", color: "var(--text-secondary)" }} className="tabular-nums">
                            {model.mae ? model.mae.toFixed(1) : "—"}
                          </span>
                        </div>
                        <div style={{ width: "52px", flexShrink: 0, textAlign: "right" }}>
                          <span style={{ fontSize: "11px", color: "var(--text-secondary)" }} className="tabular-nums">
                            {model.rmse ? model.rmse.toFixed(1) : "—"}
                          </span>
                        </div>
                        {}
                        <div style={{ width: "56px", flexShrink: 0, display: "flex", justifyContent: "center" }}>
                          {isBest && (
                            <Badge variant="green" className="text-[8px]" style={{ height: "16px", padding: "0 4px" }}>Best</Badge>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          {}
          <div className="aws-card">
            <div className="aws-card-header">
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div className="aws-card-title">
                  <Activity className="size-4" style={{ color: "var(--accent-blue)" }} />
                  Recent Activity
                </div>
                <Badge variant="secondary" className="text-[9px]">Updates</Badge>
              </div>
            </div>
            <div className="aws-card-body compact">
              <div className="flex flex-col" style={{ gap: "4px" }}>
                {activities.map((a) => (
                  <div key={a.title} className="activity-item">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className={"activity-dot " + (a.tag === "Running" ? "running" : "success")} />
                      <div className="min-w-0">
                        <div className="truncate" style={{ fontSize: "13px", fontWeight: 500 }}>{a.title}</div>
                        <div className="truncate" style={{ fontSize: "11px", color: "var(--text-secondary)" }}>{a.meta}</div>
                      </div>
                    </div>
                    <Badge variant={a.tag === "Running" ? "blue" : "secondary"} className="shrink-0 text-[9px]" style={{ height: "18px" }}>
                      {a.tag}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {}
        <div className="flex flex-col gap-5">
          {}
          {(predictionResult || ensembleResult) && (
            <div className="animate-slide-up">
              <ModelResults result={ensembleResult || predictionResult} isEnsemble={!!ensembleResult} />
            </div>
          )}

          {}
          {accuracySummary && (
            <div className="aws-card" style={{ borderColor: "rgba(0, 214, 143, 0.2)" }}>
              <div className="aws-card-header">
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div className="aws-card-title">
                    <Award className="size-4" style={{ color: "var(--accent-green)" }} />
                    Model Accuracy Summary
                  </div>
                  <Badge variant="green" className="text-[9px]">Training Results</Badge>
                </div>
                <div className="aws-card-subtitle">Overall performance on held-out test set</div>
              </div>
              <div className="aws-card-body">
                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                  {}
                  <div style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "12px 14px",
                    borderRadius: "2px",
                    background: `linear-gradient(135deg, rgba(0,214,143,0.08), rgba(0,214,143,0.02))`,
                    border: "1px solid rgba(0,214,143,0.15)",
                  }}>
                    <div className="flex items-center gap-3">
                      <div style={{
                        width: "36px", height: "36px",
                        background: `linear-gradient(135deg, ${accuracySummary.rating.color}, ${accuracySummary.rating.color}66)`,
                        borderRadius: "2px",
                        display: "grid", placeItems: "center",
                      }}>
                        <accuracySummary.rating.icon className="size-4" style={{ color: "#fff" }} />
                      </div>
                      <div>
                        <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-primary)" }}>
                          {MODEL_LABELS[accuracySummary.best.name] || accuracySummary.best.name}
                        </div>
                        <div style={{ fontSize: "11px", color: accuracySummary.rating.color, fontWeight: 600 }}>
                          {accuracySummary.rating.label} accuracy
                        </div>
                      </div>
                    </div>
                    <div style={{ fontSize: "28px", fontWeight: 700, fontFamily: "var(--font-heading)", color: accuracySummary.rating.color, lineHeight: 1 }}>
                      {(accuracySummary.best.r2 * 100).toFixed(1)}%
                      <span style={{ fontSize: "13px", fontWeight: 500, color: "var(--text-secondary)", marginLeft: "4px" }}>R²</span>
                    </div>
                  </div>

                  {}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px" }}>
                    {[
                      { label: "R² Score", value: accuracySummary.best.r2?.toFixed(4), color: "var(--accent-green)" },
                      { label: "MAE", value: accuracySummary.best.mae?.toFixed(2), color: "var(--accent-orange)" },
                      { label: "RMSE", value: accuracySummary.best.rmse?.toFixed(2), color: "var(--accent-purple)" },
                    ].map((metric) => (
                      <div key={metric.label} style={{
                        padding: "10px",
                        borderRadius: "2px",
                        background: "var(--bg-deep)",
                        border: "1px solid var(--border-subtle)",
                        textAlign: "center",
                      }}>
                        <div style={{ fontSize: "10px", color: "var(--text-secondary)", marginBottom: "2px", fontWeight: 500 }}>{metric.label}</div>
                        <div style={{ fontSize: "15px", fontWeight: 700, color: metric.color, fontFamily: "var(--font-heading)" }}>{metric.value}</div>
                      </div>
                    ))}
                  </div>

                  {}
                  <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                    <div style={{ fontSize: "10px", color: "var(--text-secondary)", fontWeight: 500, marginBottom: "2px" }}>ALL MODELS RANKING</div>
                    {accuracySummary.entries.map((entry, idx) => {
                      const RatingIcon = getAccuracyRating(entry.r2).icon
                      return (
                        <div key={entry.name} style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                          padding: "6px 8px",
                          borderRadius: "2px",
                          background: idx === 0 ? "rgba(0,214,143,0.05)" : "transparent",
                          border: idx === 0 ? "1px solid rgba(0,214,143,0.12)" : "1px solid transparent",
                        }}>
                          <div className="model-rank-badge" style={{
                            width: "18px", height: "18px",
                            fontSize: "9px",
                            background: idx === 0 ? "var(--accent-green)" : "var(--bg-deep)",
                            color: idx === 0 ? "#fff" : "var(--text-secondary)",
                          }}>{idx + 1}</div>
                          <span className="size-2 shrink-0 rounded-full" style={{ background: MODEL_COLORS[entry.name] || "var(--text-secondary)" }} />
                          <span style={{ fontSize: "11px", fontWeight: 500, flex: 1, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>
                            {MODEL_LABELS[entry.name] || entry.name}
                          </span>
                          <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                            <RatingIcon className="size-3" style={{ color: getAccuracyRating(entry.r2).color }} />
                            <span style={{ fontSize: "11px", fontWeight: 600, color: getAccuracyRating(entry.r2).color }} className="tabular-nums">
                              {(entry.r2 * 100).toFixed(1)}%
                            </span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {}
          <div className="aws-card">
            <div className="aws-card-header">
              <div className="aws-card-title">
                <FileSpreadsheet className="size-4" style={{ color: "var(--accent-blue)" }} />
                Session Summary
              </div>
              <div className="aws-card-subtitle">Current input state</div>
            </div>
            <div className="aws-card-body" style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {}
              <div className="info-card">
                <div className="info-card-label">Billet Image</div>
                <div className="info-card-value flex items-center gap-2">
                  {uploadedImage ? (
                    <><span className="size-1.5 rounded-full" style={{ background: "var(--accent-green)" }} />
                      <span className="truncate" style={{ fontSize: "12px" }}>{uploadedImage.name}</span></>
                  ) : (
                    <span style={{ fontStyle: "italic", fontSize: "12px", opacity: 0.5, color: "var(--text-secondary)" }}>
                      Not uploaded
                    </span>
                  )}
                </div>
              </div>

              {}
              <div className="info-card">
                <div className="info-card-label">Field Details</div>
                <div className="info-card-value">
                  {gpsData ? (
                    <div className="flex flex-col" style={{ gap: "4px" }}>
                      {gpsData.Planting_Date && (
                        <div style={{ fontSize: "12px" }}>
                          <span style={{ fontWeight: 500 }}>Planted:</span> {gpsData.Planting_Date}
                          {gpsData.Harvesting_Date && ` · Harvest: ${gpsData.Harvesting_Date}`}
                        </div>
                      )}
                      <div className="flex flex-wrap gap-1">
                        {gpsData.Variety && <span style={{ fontSize: "10px", background: "var(--bg-deep)", padding: "1px 6px", borderRadius: "2px" }}>{gpsData.Variety}</span>}
                        {gpsData.Crop_Type && <span style={{ fontSize: "10px", background: "var(--bg-deep)", padding: "1px 6px", borderRadius: "2px" }}>{gpsData.Crop_Type}</span>}
                        {gpsData.Soil_Type && <span style={{ fontSize: "10px", background: "var(--bg-deep)", padding: "1px 6px", borderRadius: "2px" }}>{gpsData.Soil_Type}</span>}
                        {gpsData.Irrigation_Type && <span style={{ fontSize: "10px", background: "var(--bg-deep)", padding: "1px 6px", borderRadius: "2px" }}>{gpsData.Irrigation_Type}</span>}
                        {gpsData.Fertilizer_Type && <span style={{ fontSize: "10px", background: "var(--bg-deep)", padding: "1px 6px", borderRadius: "2px" }}>{gpsData.Fertilizer_Type}</span>}
                      </div>
                    </div>
                  ) : (
                    <span style={{ fontStyle: "italic", fontSize: "12px", opacity: 0.5, color: "var(--text-secondary)" }}>
                      Not configured
                    </span>
                  )}
                </div>
              </div>

              <Separator style={{ opacity: 0.5 }} />

              {}
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                <div className="mini-card">
                  <div className="mini-card-label">Stage</div>
                  <div className="mini-card-value flex items-center gap-1.5">
                    <span className="size-1.5 rounded-full" style={{ background: "var(--accent-green)" }} />
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

              {}
              {!predictionResult && !ensembleResult && (
                <button type="button" style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "8px 12px",
                  border: "1px dashed var(--border-default)",
                  borderRadius: "2px",
                  background: "transparent",
                  fontSize: "13px",
                  color: "var(--text-secondary)",
                  cursor: "pointer",
                  transition: "all 120ms",
                  marginTop: "4px",
                }}
                  className="hover:border-blue hover:text-blue"
                  onClick={() => {}}>
                  <span className="flex items-center gap-2">
                    <TrendingUp className="size-3.5" />
                    Run a prediction to see results
                  </span>
                  <ChevronRight className="size-3.5" style={{ opacity: 0.5 }} />
                </button>
              )}
            </div>
          </div>

          {}
          {sortedModels.length > 0 && (
            <div className="aws-card">
              <div className="aws-card-header">
                <div className="aws-card-title">
                  <BarChart3 className="size-4" style={{ color: "var(--accent-blue)" }} />
                  Model Details
                </div>
                <div className="aws-card-subtitle">Individual model specifications</div>
              </div>
              <div className="aws-card-body" style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                {sortedModels.map((model) => (
                  <div key={model.name} style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "12px",
                    padding: "6px 10px",
                    borderRadius: "2px",
                    transition: "background 120ms",
                  }} className="hover:bg-muted">
                    <div className="flex items-center gap-2" style={{ overflow: "hidden", minWidth: 0 }}>
                      <span className="size-2 shrink-0 rounded-full" style={{ background: MODEL_COLORS[model.name] || "var(--text-secondary)" }} />
                      <span style={{ fontSize: "12px", fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {MODEL_LABELS[model.name] || model.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span style={{ fontSize: "10px", color: "var(--text-secondary)" }} className="tabular-nums">
                        Features: {model.features_count || "—"}
                      </span>
                      <span style={{ fontSize: "11px", fontWeight: 600 }} className="tabular-nums">
                        R² {model.r2?.toFixed(4) || "—"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}

export default DashboardPage

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  TrendingUp,
  Sprout,
  Droplets,
  Sun,
  Calendar,
  Leaf,
  Beaker,
  Thermometer,
  Cpu,
  Award,
  Sparkles,
  BarChart3,
  CheckCircle2,
  Zap,
  Download,
  Copy,
  Check,
  Sliders,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

const FIELD_CONFIG = {
  Planting_Date: { icon: Calendar, label: "Planting" },
  Harvesting_Date: { icon: Calendar, label: "Harvest" },
  Variety: { icon: Leaf, label: "Variety" },
  Crop_Type: { icon: Sun, label: "Season" },
  Soil_Type: { icon: Sprout, label: "Soil" },
  Irrigation_Type: { icon: Droplets, label: "Irrigation" },
  Fertilizer_Type: { icon: Beaker, label: "Fertilizer" },
  Nitrogen_kg_per_acre: { icon: Beaker, label: "Nitrogen" },
  "Soil_Moisture_%": { icon: Droplets, label: "Moisture" },
  Soil_pH: { icon: Thermometer, label: "pH" },
}

function formatFieldValue(key, value) {
  if (!value) return "—"
  if (key === "Planting_Date" || key === "Harvesting_Date") {
    try {
      const d = new Date(value)
      return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    } catch {
      return value
    }
  }
  if (key === "Nitrogen_kg_per_acre") return `${value} kg/ac`
  if (key === "Soil_Moisture_%") return `${value}%`
  if (key === "Soil_pH") return `pH ${value}`
  return String(value).replace(/_/g, " ")
}

function getYieldTier(val) {
  if (val >= 350) return { label: "Elite Yield", color: "var(--accent-green)", bg: "rgba(0,214,143,0.15)", border: "rgba(0,214,143,0.3)" }
  if (val >= 250) return { label: "High Yield", color: "var(--accent-gold)", bg: "rgba(212,168,67,0.15)", border: "rgba(212,168,67,0.3)" }
  if (val >= 150) return { label: "Moderate Yield", color: "var(--accent-orange)", bg: "rgba(248,176,88,0.15)", border: "rgba(248,176,88,0.3)" }
  return { label: "Suboptimal Yield", color: "var(--accent-red)", bg: "rgba(255,107,107,0.15)", border: "rgba(255,107,107,0.3)" }
}

function modelLabel(name) {
  const map = {
    cane_sugar: "🍬 CaneSugar v6 Flagship",
    catboost: "CatBoost Regressor",
    xgboost: "XGBoost Regressor",
    random_forest: "Random Forest",
    linear_regression: "Linear Regression",
    elastic_net: "Elastic Net",
    ensemble: "Weighted Multi-Model Ensemble",
  }
  return map[name?.toLowerCase()] || name || "Auto (CaneSugar v6)"
}

export default function PredictionHero({ result, gpsData, onDismiss, onOpenSimulator = null }) {
  const [copied, setCopied] = useState(false)
  if (!result) return null

  const predValue = result.predictions?.[0]
  const modelName = result.model || "cane_sugar"
  const metrics = result.metrics || {}
  const r2 = metrics.r2 || 0.9118
  const mae = metrics.mae || 22.74
  const isEnsemble = modelName === "ensemble" || result.individual_predictions

  const yieldTier = predValue !== null && predValue !== undefined ? getYieldTier(Number(predValue)) : null

  // Extract field values
  const fieldKeys = Object.keys(FIELD_CONFIG)
  const fieldValues = {}
  if (gpsData) {
    for (const key of fieldKeys) {
      if (gpsData[key] && String(gpsData[key]).trim() !== "") {
        fieldValues[key] = gpsData[key]
      }
    }
  }

  const hasFields = Object.keys(fieldValues).length > 0

  const handleCopyReport = () => {
    const report = `=== CaneSense Sugarcane Yield Prediction ===\nPredicted Yield: ${Number(predValue).toFixed(2)} Quintal/Acre\nRating: ${yieldTier?.label || 'N/A'}\nModel: ${modelLabel(modelName)} (R²: ${(r2 * 100).toFixed(1)}%, MAE: ${mae} Q/A)\nDate: ${new Date().toLocaleDateString()}\n\nField Data:\n${Object.entries(fieldValues).map(([k, v]) => `• ${FIELD_CONFIG[k]?.label || k}: ${v}`).join('\n')}`
    navigator.clipboard.writeText(report)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleExportJSON = () => {
    const data = JSON.stringify({ result, gpsData, timestamp: new Date().toISOString() }, null, 2)
    const blob = new Blob([data], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `canesense-yield-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -16, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.98 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="aws-card prediction-hero-card"
      style={{
        position: "relative",
        overflow: "hidden",
        borderRadius: "var(--radius-lg)",
        marginBottom: "16px",
        background: "linear-gradient(135deg, #16191E 0%, #111317 50%, #191610 100%)",
        border: "1px solid rgba(212, 168, 67, 0.3)",
        boxShadow: "0 0 50px rgba(212, 168, 67, 0.12), 0 12px 40px rgba(0, 0, 0, 0.5)",
      }}
    >
      {/* Decorative ambient glow */}
      <div
        style={{
          position: "absolute",
          top: "-50px",
          right: "-50px",
          width: "220px",
          height: "220px",
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(212, 168, 67, 0.2) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />

      <div style={{ padding: "20px 24px" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "8px",
                background: "linear-gradient(135deg, var(--accent-gold), #B88A30)",
                display: "grid",
                placeItems: "center",
                boxShadow: "0 0 20px rgba(212, 168, 67, 0.35)",
              }}
            >
              <Sparkles className="size-4" style={{ color: "#1A1A1A" }} />
            </div>
            <div>
              <div style={{ fontSize: "16px", fontWeight: 700, fontFamily: "var(--font-heading)", color: "var(--text-primary)" }}>
                🌾 Yield Prediction Forecast
              </div>
              <div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
                {isEnsemble ? "Multi-Model Ensemble Synthesis" : `${modelLabel(modelName)}`}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {yieldTier && (
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "5px",
                  padding: "4px 10px",
                  borderRadius: "20px",
                  fontSize: "11px",
                  fontWeight: 700,
                  color: yieldTier.color,
                  background: yieldTier.bg,
                  border: `1px solid ${yieldTier.border}`,
                }}
              >
                <Award className="size-3" />
                {yieldTier.label}
              </span>
            )}
            <Badge variant="green" className="text-[10px]" style={{ padding: "3px 8px" }}>
              <CheckCircle2 className="size-3 mr-1" />
              R² {(r2 * 100).toFixed(1)}%
            </Badge>
            {onDismiss && (
              <button
                onClick={onDismiss}
                className="btn btn-ghost btn-icon-sm"
                title="Dismiss"
                style={{ width: "24px", height: "24px", color: "var(--text-muted)" }}
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Big Yield Display */}
        <div style={{ textAlign: "center", padding: "16px 0 12px" }}>
          {predValue !== null && predValue !== undefined ? (
            <>
              <motion.div
                initial={{ opacity: 0, scale: 0.7 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                style={{
                  fontSize: "clamp(52px, 7vw, 84px)",
                  fontWeight: 800,
                  fontFamily: "var(--font-heading)",
                  color: "var(--accent-gold)",
                  lineHeight: 1,
                  letterSpacing: "-0.03em",
                  textShadow: "0 0 50px rgba(212, 168, 67, 0.4), 0 4px 16px rgba(0,0,0,0.5)",
                }}
              >
                {Number(predValue).toFixed(2)}
              </motion.div>
              <div style={{ fontSize: "13px", fontWeight: 600, color: "rgba(255,255,255,0.7)", marginTop: "6px", letterSpacing: "0.08em", textTransform: "uppercase" }}>
                Quintal per Acre (Q/A)
              </div>
              <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "4px" }}>
                Expected Range: {(Number(predValue) - mae).toFixed(1)} – {(Number(predValue) + mae).toFixed(1)} Q/A (±{mae.toFixed(1)} MAE)
              </div>
            </>
          ) : (
            <div style={{ fontSize: "13px", color: "var(--text-muted)" }}>No prediction value available</div>
          )}
        </div>

        {/* Metrics Pill Grid */}
        <div style={{ display: "flex", justifyContent: "center", gap: "10px", flexWrap: "wrap", margin: "14px 0" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", padding: "5px 12px", borderRadius: "var(--radius-sm)", background: "rgba(255,255,255,0.04)", border: "1px solid var(--border-subtle)" }}>
            <BarChart3 className="size-3.5 text-amber-500" />
            <span style={{ fontSize: "11px", color: "var(--text-secondary)" }}>Model Fit (R²):</span>
            <span style={{ fontSize: "12px", fontWeight: 700, color: "var(--text-primary)" }}>{(r2 * 100).toFixed(1)}%</span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "6px", padding: "5px 12px", borderRadius: "var(--radius-sm)", background: "rgba(255,255,255,0.04)", border: "1px solid var(--border-subtle)" }}>
            <Zap className="size-3.5 text-orange-500" />
            <span style={{ fontSize: "11px", color: "var(--text-secondary)" }}>Mean Error (MAE):</span>
            <span style={{ fontSize: "12px", fontWeight: 700, color: "var(--text-primary)" }}>{mae.toFixed(1)} Q/A</span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "6px", padding: "5px 12px", borderRadius: "var(--radius-sm)", background: "rgba(255,255,255,0.04)", border: "1px solid var(--border-subtle)" }}>
            <Cpu className="size-3.5 text-blue-500" />
            <span style={{ fontSize: "11px", color: "var(--text-secondary)" }}>Architecture:</span>
            <span style={{ fontSize: "12px", fontWeight: 700, color: "var(--text-primary)" }}>8-Fold Stacking Ensemble</span>
          </div>
        </div>

        {/* Input Parameters Tag Bar */}
        {hasFields && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", justifyContent: "center", marginTop: "12px", paddingTop: "12px", borderTop: "1px solid var(--border-subtle)" }}>
            {fieldKeys.map((key) => {
              if (!fieldValues[key]) return null
              const config = FIELD_CONFIG[key]
              const Icon = config.icon
              return (
                <div
                  key={key}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                    padding: "4px 8px",
                    borderRadius: "4px",
                    background: "var(--bg-deep)",
                    border: "1px solid var(--border-subtle)",
                    fontSize: "11px",
                    color: "var(--text-secondary)",
                  }}
                >
                  <Icon className="size-3 text-amber-500" />
                  <span style={{ color: "var(--text-muted)", marginRight: "2px" }}>{config.label}:</span>
                  <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>{formatFieldValue(key, fieldValues[key])}</span>
                </div>
              )
            })}
          </div>
        )}

        {/* Action Toolbar */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "16px", paddingTop: "12px", borderTop: "1px solid var(--border-subtle)", flexWrap: "wrap", gap: "8px" }}>
          <div className="flex items-center gap-2">
            <Button variant="default" size="sm" onClick={handleCopyReport} className="gap-1.5 text-[11px]">
              {copied ? <Check className="size-3 text-green-500" /> : <Copy className="size-3" />}
              {copied ? "Report Copied!" : "Copy Report"}
            </Button>
            <Button variant="default" size="sm" onClick={handleExportJSON} className="gap-1.5 text-[11px]">
              <Download className="size-3" />
              JSON
            </Button>
          </div>

          {onOpenSimulator && (
            <Button variant="primary" size="sm" onClick={onOpenSimulator} className="gap-1.5 text-[11px]">
              <Sliders className="size-3" />
              What-If Simulator
            </Button>
          )}
        </div>
      </div>
    </motion.div>
  )
}

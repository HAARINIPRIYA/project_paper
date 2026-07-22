/**
 * PredictionHero — a dramatic, animated hero card for yield prediction results.
 * Impossible to miss. Beautiful to look at.
 */

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
} from "lucide-react"

// ─── Field parameter icon mapping ──────────────────────────────────────────
const FIELD_CONFIG = {
  Planting_Date:      { icon: Calendar,     label: "Planting" },
  Harvesting_Date:    { icon: Calendar,     label: "Harvest" },
  Variety:            { icon: Leaf,         label: "Variety" },
  Crop_Type:          { icon: Sun,          label: "Crop" },
  Soil_Type:          { icon : Sprout,      label: "Soil" },
  Irrigation_Type:    { icon: Droplets,     label: "Irrigation" },
  Fertilizer_Type:    { icon: Beaker,       label: "Fertilizer" },
}

// ─── Format field values nicely ──────────────────────────────────────────
function formatFieldValue(key, value) {
  if (!value) return "—"
  if (key === "Planting_Date" || key === "Harvesting_Date") {
    try {
      const d = new Date(value)
      return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    } catch { return value }
  }
  return value.replace(/_/g, " ")
}

// ─── Color helpers ────────────────────────────────────────────────────────
function modelColor(name) {
  const map = {
    catboost:          "#00D68F",
    xgboost:           "#5B8DEF",
    random_forest:     "#FFB547",
    linear_regression: "#7C5CFC",
    elastic_net:       "#FF6B6B",
    ensemble:          "#00D68F",
  }
  return map[name?.toLowerCase()] || "#00D68F"
}

function modelLabel(name) {
  const map = {
    catboost:          "CatBoost",
    xgboost:           "XGBoost",
    random_forest:     "Random Forest",
    linear_regression: "Linear Regression",
    elastic_net:       "Elastic Net",
    ensemble:          "Ensemble (All Models)",
  }
  return map[name?.toLowerCase()] || name || "Auto"
}

// ─── Main Component ───────────────────────────────────────────────────────
export default function PredictionHero({ result, gpsData, onDismiss }) {
  if (!result) return null

  const predValue = result.predictions?.[0]
  const modelName = result.model || "auto"
  const metrics = result.metrics || {}
  const r2 = metrics.r2
  const mae = metrics.mae
  const isEnsemble = modelName === "ensemble" || result.individual_predictions

  // Build field chips from gpsData or result
  const fieldKeys = Object.keys(FIELD_CONFIG)
  const fieldValues = {}
  if (gpsData) {
    for (const key of fieldKeys) {
      if (gpsData[key] && gpsData[key].trim() !== "") {
        fieldValues[key] = gpsData[key]
      }
    }
  }

  const hasFields = Object.keys(fieldValues).length > 0
  const color = modelColor(modelName)

  // ──────────────── ENTRANCE ANIMATION ────────────────
  const containerVariants = {
    hidden: { opacity: 0, y: -20, scale: 0.97 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        duration: 0.5,
        ease: [0.16, 1, 0.3, 1],
        staggerChildren: 0.06,
        delayChildren: 0.1,
      },
    },
    exit: {
      opacity: 0,
      y: -10,
      scale: 0.98,
      transition: { duration: 0.25, ease: "easeIn" },
    },
  }

  const childVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] } },
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      layout
      style={{
        position: "relative",
        overflow: "hidden",
        borderRadius: "16px",
        marginBottom: "12px",
        background: "linear-gradient(135deg, #0D1B12 0%, #0F1113 40%, #0D1B12 100%)",
        border: "1px solid rgba(0, 214, 143, 0.2)",
        boxShadow: "0 0 40px rgba(0, 214, 143, 0.08), 0 8px 32px rgba(0, 0, 0, 0.4)",
      }}
    >
      {/* ── Animated gradient border overlay ── */}
      <div
        className="prediction-hero-border"
        style={{
          position: "absolute",
          inset: -1,
          borderRadius: "17px",
          background: "linear-gradient(135deg, rgba(0,214,143,0.4), transparent 30%, transparent 70%, rgba(0,214,143,0.2))",
          pointerEvents: "none",
          zIndex: 0,
          mask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
          maskComposite: "exclude",
          WebkitMask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
          WebkitMaskComposite: "xor",
          padding: "1px",
        }}
      />

      {/* ── Sparkle dots ── */}
      <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none", zIndex: 1 }}>
        <motion.div
          animate={{ opacity: [0, 0.6, 0], scale: [0.8, 1.1, 0.8] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          style={{
            position: "absolute",
            top: "10%",
            right: "15%",
            width: "4px",
            height: "4px",
            borderRadius: "50%",
            background: "#00D68F",
            boxShadow: "0 0 8px #00D68F",
          }}
        />
        <motion.div
          animate={{ opacity: [0, 0.4, 0], scale: [0.6, 1, 0.6] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          style={{
            position: "absolute",
            bottom: "20%",
            left: "25%",
            width: "3px",
            height: "3px",
            borderRadius: "50%",
            background: "#00F5A0",
            boxShadow: "0 0 6px #00F5A0",
          }}
        />
        <motion.div
          animate={{ opacity: [0, 0.5, 0], scale: [0.7, 1.2, 0.7] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          style={{
            position: "absolute",
            top: "50%",
            right: "8%",
            width: "2px",
            height: "2px",
            borderRadius: "50%",
            background: "#FFD600",
            boxShadow: "0 0 6px #FFD600",
          }}
        />
      </div>

      {/* ── Content (above gradient overlay) ── */}
      <div style={{ position: "relative", zIndex: 2, padding: "20px 24px" }}>
        {/* ── Top bar: title + dismiss ── */}
        <motion.div
          variants={childVariants}
          style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div
              style={{
                width: "34px",
                height: "34px",
                borderRadius: "10px",
                background: `linear-gradient(135deg, ${color}, ${color}88)`,
                display: "grid",
                placeItems: "center",
                boxShadow: `0 0 20px ${color}44`,
              }}
            >
              <TrendingUp className="size-4" style={{ color: "#fff" }} />
            </div>
            <div>
              <div style={{ fontSize: "15px", fontWeight: 700, fontFamily: "var(--font-heading)", color: "var(--text-primary)", letterSpacing: "0.01em" }}>
                🌾 Yield Prediction
              </div>
              <div style={{ fontSize: "11px", color: "var(--text-secondary)", marginTop: "1px" }}>
                {isEnsemble ? "Weighted ensemble of all models" : `${modelLabel(modelName)} — best available model`}
              </div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            {r2 !== undefined && (
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                  padding: "4px 10px",
                  borderRadius: "20px",
                  background: "rgba(0, 214, 143, 0.12)",
                  border: "1px solid rgba(0, 214, 143, 0.25)",
                  fontSize: "11px",
                  fontWeight: 600,
                  color: "#00D68F",
                }}
              >
                <CheckCircle2 className="size-3" />
                R² {(r2 * 100).toFixed(1)}%
              </div>
            )}
            {onDismiss && (
              <button
                onClick={onDismiss}
                style={{
                  background: "rgba(255,255,255,0.05)",
                  border: "none",
                  color: "var(--text-muted)",
                  cursor: "pointer",
                  padding: "4px 8px",
                  borderRadius: "6px",
                  fontSize: "11px",
                  transition: "all 0.15s",
                }}
                className="hover:bg-muted"
              >
                ✕
              </button>
            )}
          </div>
        </motion.div>

        {/* ── Yield value — massive, glowing, impossible to miss ── */}
        <motion.div
          variants={childVariants}
          style={{
            textAlign: "center",
            padding: "16px 0 12px",
            position: "relative",
          }}
        >
          {predValue !== null && predValue !== undefined ? (
            <>
              <div
                className="prediction-hero-value"
                style={{
                  fontSize: "clamp(48px, 6vw, 80px)",
                  fontWeight: 700,
                  fontFamily: "var(--font-heading)",
                  color: "#00F5A0",
                  lineHeight: 1,
                  letterSpacing: "-0.03em",
                  textShadow: "0 0 40px rgba(0, 214, 143, 0.5), 0 0 80px rgba(0, 214, 143, 0.2), 0 4px 12px rgba(0,0,0,0.4)",
                }}
              >
                <motion.span
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.6, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
                >
                  {Number(predValue).toFixed(2)}
                </motion.span>
              </div>
              <div style={{ fontSize: "14px", fontWeight: 500, color: "rgba(255,255,255,0.6)", marginTop: "4px", letterSpacing: "0.06em", textTransform: "uppercase" }}>
                Quintal per Acre
              </div>
            </>
          ) : (
            <div style={{ fontSize: "14px", color: "var(--text-muted)", padding: "20px 0" }}>
              No prediction value available
            </div>
          )}
        </motion.div>

        {/* ── Metrics row ── */}
        {Object.keys(metrics).length > 0 && (
          <motion.div
            variants={childVariants}
            style={{
              display: "flex",
              justifyContent: "center",
              gap: "16px",
              flexWrap: "wrap",
              marginBottom: hasFields ? "14px" : 0,
            }}
          >
            {r2 !== undefined && (
              <div style={{ display: "flex", alignItems: "center", gap: "4px", padding: "4px 12px", borderRadius: "8px", background: "rgba(255,255,255,0.04)" }}>
                <BarChart3 className="size-3" style={{ color: "var(--accent-green)" }} />
                <span style={{ fontSize: "11px", color: "var(--text-secondary)" }}>R²</span>
                <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-primary)" }}>{r2.toFixed(4)}</span>
              </div>
            )}
            {mae !== undefined && (
              <div style={{ display: "flex", alignItems: "center", gap: "4px", padding: "4px 12px", borderRadius: "8px", background: "rgba(255,255,255,0.04)" }}>
                <Zap className="size-3" style={{ color: "var(--accent-orange)" }} />
                <span style={{ fontSize: "11px", color: "var(--text-secondary)" }}>MAE</span>
                <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-primary)" }}>{mae.toFixed(2)}</span>
              </div>
            )}
            {metrics.rmse !== undefined && (
              <div style={{ display: "flex", alignItems: "center", gap: "4px", padding: "4px 12px", borderRadius: "8px", background: "rgba(255,255,255,0.04)" }}>
                <Cpu className="size-3" style={{ color: "var(--accent-purple)" }} />
                <span style={{ fontSize: "11px", color: "var(--text-secondary)" }}>RMSE</span>
                <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-primary)" }}>{metrics.rmse.toFixed(2)}</span>
              </div>
            )}
          </motion.div>
        )}

        {/* ── Model badge ── */}
        <motion.div
          variants={childVariants}
          style={{
            display: "flex",
            justifyContent: "center",
            marginBottom: hasFields ? "16px" : 0,
          }}
        >
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "5px 14px",
              borderRadius: "20px",
              background: `${color}14`,
              border: `1px solid ${color}33`,
              fontSize: "12px",
              fontWeight: 600,
              color: color,
            }}
          >
            <Cpu className="size-3" />
            {isEnsemble ? "Ensemble" : modelLabel(modelName)}
            {!isEnsemble && (
              <span style={{ opacity: 0.6, fontWeight: 400, fontSize: "11px" }}>
                · R² {(r2 * 100).toFixed(1)}%
              </span>
            )}
          </div>
        </motion.div>

        {/* ── Field parameter chips ── */}
        {hasFields && (
          <motion.div variants={childVariants}>
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "6px",
                justifyContent: "center",
              }}
            >
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
                      padding: "4px 10px",
                      borderRadius: "8px",
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(255,255,255,0.06)",
                      fontSize: "11px",
                      color: "var(--text-secondary)",
                      lineHeight: 1,
                    }}
                  >
                    <Icon className="size-3" style={{ color: "var(--accent-green)", opacity: 0.7 }} />
                    <span style={{ fontWeight: 500, marginRight: "2px", color: "var(--text-muted)" }}>
                      {config.label}:
                    </span>
                    <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>
                      {formatFieldValue(key, fieldValues[key])}
                    </span>
                  </div>
                )
              })}
            </div>
          </motion.div>
        )}
      </div>
    </motion.div>
  )
}

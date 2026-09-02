import { motion } from "framer-motion"
import {
  TrendingUp,
  TrendingDown,
  Sparkles,
  Info,
  CheckCircle2,
  AlertTriangle,
  Leaf,
  Droplets,
  Sprout,
  Beaker,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"

const FACTOR_ICONS = {
  "NPK Nutrient Balance": Beaker,
  "Nitrogen Limitation": AlertTriangle,
  "Fertilizer Input": Beaker,
  "Irrigation & Hydration": Droplets,
  "Soil Moisture Deficit": AlertTriangle,
  "Soil Chemical Health": Sprout,
  "Soil pH Imbalance": AlertTriangle,
  "High-Yielding Genetic Variety": Leaf,
  "Cultivar Vigor": Leaf,
}

export default function FactorImpactCard({ impacts = [], title = "Agronomic Yield Drivers" }) {
  if (!impacts || impacts.length === 0) return null

  return (
    <div className="aws-card factor-impact-card" style={{ overflow: "hidden" }}>
      <div className="aws-card-header">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div className="aws-card-title flex items-center gap-2">
            <Sparkles className="size-4" style={{ color: "var(--accent-gold)" }} />
            <span>{title}</span>
          </div>
          <Badge variant="outline" className="text-[10px]">
            Explainability Engine
          </Badge>
        </div>
        <div className="aws-card-subtitle">
          Key physiological & field conditions influencing this prediction
        </div>
      </div>

      <div className="aws-card-body" style={{ display: "flex", flexDirection: "column", gap: "10px", padding: "14px 16px" }}>
        {impacts.map((item, idx) => {
          const isPos = item.positive !== false
          const Icon = FACTOR_ICONS[item.factor] || (isPos ? CheckCircle2 : AlertTriangle)
          const impactNum = parseFloat(item.impact.replace(/[^0-9.-]/g, "")) || 5.0
          const barWidth = Math.min(Math.max(Math.abs(impactNum) * 5, 15), 100)

          return (
            <motion.div
              key={idx}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.25, delay: idx * 0.05 }}
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "6px",
                padding: "10px 12px",
                borderRadius: "var(--radius-sm)",
                background: "var(--bg-deep)",
                border: `1px solid ${isPos ? "rgba(0, 214, 143, 0.12)" : "rgba(255, 107, 107, 0.15)"}`,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <div
                    style={{
                      width: "24px",
                      height: "24px",
                      borderRadius: "4px",
                      background: isPos ? "rgba(0, 214, 143, 0.15)" : "rgba(255, 107, 107, 0.15)",
                      display: "grid",
                      placeItems: "center",
                      color: isPos ? "var(--accent-green)" : "var(--accent-red)",
                    }}
                  >
                    <Icon className="size-3.5" />
                  </div>
                  <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-primary)" }}>
                    {item.factor}
                  </span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                  {isPos ? (
                    <TrendingUp className="size-3.5" style={{ color: "var(--accent-green)" }} />
                  ) : (
                    <TrendingDown className="size-3.5" style={{ color: "var(--accent-red)" }} />
                  )}
                  <span
                    style={{
                      fontSize: "12px",
                      fontWeight: 700,
                      color: isPos ? "var(--accent-green)" : "var(--accent-red)",
                    }}
                  >
                    {item.impact}
                  </span>
                </div>
              </div>

              {/* Progress bar visual */}
              <div style={{ height: "4px", width: "100%", background: "var(--bg-surface)", borderRadius: "2px", overflow: "hidden" }}>
                <div
                  style={{
                    height: "100%",
                    width: `${barWidth}%`,
                    background: isPos
                      ? "linear-gradient(90deg, #00D68F, #00F5A0)"
                      : "linear-gradient(90deg, #FF6B6B, #FF8E8E)",
                    borderRadius: "2px",
                  }}
                />
              </div>

              <div style={{ fontSize: "11px", color: "var(--text-secondary)", lineHeight: 1.4, marginTop: "2px" }}>
                {item.description}
              </div>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}

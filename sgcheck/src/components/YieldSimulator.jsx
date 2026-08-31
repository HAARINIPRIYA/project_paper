import { useState, useMemo, useEffect, useRef } from "react"
import { motion } from "framer-motion"
import {
  Sliders,
  Sparkles,
  TrendingUp,
  RotateCcw,
  Zap,
  ArrowRight,
  Droplets,
  Sprout,
  Sun,
  Beaker,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { predictWithModel } from "@/lib/api"

export default function YieldSimulator({ initialData = null, baselineYield = 280.0, onApplySimulation = null }) {
  // Simulator parameters state
  const [params, setParams] = useState({
    Nitrogen_kg_per_acre: 160,
    Potassium_kg_per_acre: 100,
    Phosphorus_kg_per_acre: 60,
    Soil_Moisture: 28,
    Soil_pH: 7.2,
    Water_Quantity: 1200,
  })

  const [simulatedYield, setSimulatedYield] = useState(baselineYield)
  const [isSimulating, setIsSimulating] = useState(false)
  const debounceRef = useRef(null)

  // Sync with initialData if provided
  useEffect(() => {
    if (initialData) {
      setParams({
        Nitrogen_kg_per_acre: parseFloat(initialData.Nitrogen_kg_per_acre) || 160,
        Potassium_kg_per_acre: parseFloat(initialData.Potassium_kg_per_acre) || 100,
        Phosphorus_kg_per_acre: parseFloat(initialData.Phosphorus_kg_per_acre) || 60,
        Soil_Moisture: parseFloat(initialData["Soil_Moisture_%"]) || 28,
        Soil_pH: parseFloat(initialData.Soil_pH) || 7.2,
        Water_Quantity: parseFloat(initialData.Water_Quantity_liters_per_acre) || 1200,
      })
    }
  }, [initialData])

  // Run real-time simulation via backend or fast model approximation
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    
    debounceRef.current = setTimeout(async () => {
      setIsSimulating(true)
      try {
        const payload = {
          ...(initialData || {}),
          Planting_Date: initialData?.Planting_Date || "2024-01-15",
          Harvesting_Date: initialData?.Harvesting_Date || "2024-11-30",
          Variety: initialData?.Variety || "Co-0238",
          Crop_Type: initialData?.Crop_Type || "Kharif",
          Soil_Type: initialData?.Soil_Type || "Loamy",
          Irrigation_Type: initialData?.Irrigation_Type || "Drip",
          Fertilizer_Type: initialData?.Fertilizer_Type || "Urea",
          Nitrogen_kg_per_acre: params.Nitrogen_kg_per_acre,
          Phosphorus_kg_per_acre: params.Phosphorus_kg_per_acre,
          Potassium_kg_per_acre: params.Potassium_kg_per_acre,
          "Soil_Moisture_%": params.Soil_Moisture,
          Soil_pH: params.Soil_pH,
          Water_Quantity_liters_per_acre: params.Water_Quantity,
        }

        const res = await predictWithModel("cane_sugar", payload)
        if (res && res.predictions && res.predictions.length > 0) {
          setSimulatedYield(res.predictions[0])
        }
      } catch (err) {
        // Fallback simulation model approximation
        const nFactor = (params.Nitrogen_kg_per_acre - 150) * 0.35
        const kFactor = (params.Potassium_kg_per_acre - 90) * 0.2
        const mFactor = (params.Soil_Moisture - 25) * 1.5
        const phFactor = (7.2 - Math.abs(params.Soil_pH - 7.2)) * 4.0
        const sim = Math.max(50, baselineYield + nFactor + kFactor + mFactor + phFactor)
        setSimulatedYield(sim)
      } finally {
        setIsSimulating(false)
      }
    }, 250)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [params, initialData, baselineYield])

  const delta = simulatedYield - baselineYield
  const deltaPercent = baselineYield > 0 ? (delta / baselineYield) * 100 : 0
  const isPositive = delta >= 0

  const handleReset = () => {
    setParams({
      Nitrogen_kg_per_acre: parseFloat(initialData?.Nitrogen_kg_per_acre) || 160,
      Potassium_kg_per_acre: parseFloat(initialData?.Potassium_kg_per_acre) || 100,
      Phosphorus_kg_per_acre: parseFloat(initialData?.Phosphorus_kg_per_acre) || 60,
      Soil_Moisture: parseFloat(initialData?.["Soil_Moisture_%"]) || 28,
      Soil_pH: parseFloat(initialData?.Soil_pH) || 7.2,
      Water_Quantity: parseFloat(initialData?.Water_Quantity_liters_per_acre) || 1200,
    })
  }

  return (
    <div className="aws-card yield-simulator-card" style={{ overflow: "hidden" }}>
      <div className="aws-card-header">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div className="aws-card-title flex items-center gap-2">
            <Sliders className="size-4" style={{ color: "var(--accent-gold)" }} />
            <span>Interactive "What-If" Yield Simulator</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="blue" className="text-[10px]">
              CaneSugar AI
            </Badge>
            <button
              onClick={handleReset}
              className="btn btn-ghost btn-icon-sm"
              title="Reset parameters"
              style={{ width: "24px", height: "24px" }}
            >
              <RotateCcw className="size-3" />
            </button>
          </div>
        </div>
        <div className="aws-card-subtitle">
          Simulate changes to fertilizer, irrigation & soil parameters to maximize yield
        </div>
      </div>

      <div className="aws-card-body" style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "16px" }}>
        {/* Comparison Banner */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr auto 1fr",
            alignItems: "center",
            gap: "12px",
            padding: "12px 16px",
            borderRadius: "var(--radius-sm)",
            background: "var(--bg-deep)",
            border: "1px solid var(--border-subtle)",
          }}
        >
          {/* Baseline */}
          <div>
            <div style={{ fontSize: "10px", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 600 }}>
              Current Baseline
            </div>
            <div style={{ fontSize: "20px", fontWeight: 700, color: "var(--text-secondary)", fontFamily: "var(--font-heading)" }}>
              {Number(baselineYield).toFixed(1)}
              <span style={{ fontSize: "11px", fontWeight: 400, marginLeft: "4px" }}>Q/A</span>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
            <ArrowRight className="size-4" style={{ color: "var(--text-muted)" }} />
          </div>

          {/* Simulated */}
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: "10px", color: "var(--accent-gold)", textTransform: "uppercase", fontWeight: 600 }}>
              Simulated Forecast
            </div>
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "flex-end", gap: "6px" }}>
              <div style={{ fontSize: "22px", fontWeight: 700, color: "var(--accent-gold)", fontFamily: "var(--font-heading)" }}>
                {Number(simulatedYield).toFixed(1)}
                <span style={{ fontSize: "11px", fontWeight: 400, marginLeft: "4px" }}>Q/A</span>
              </div>
              <Badge
                variant={isPositive ? "green" : "red"}
                className="text-[10px]"
                style={{ padding: "1px 6px", height: "18px" }}
              >
                {isPositive ? `+${delta.toFixed(1)}` : delta.toFixed(1)} ({deltaPercent > 0 ? `+${deltaPercent.toFixed(1)}%` : `${deltaPercent.toFixed(1)}%`})
              </Badge>
            </div>
          </div>
        </div>

        {/* Sliders Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Nitrogen Slider */}
          <div className="slider-box" style={{ background: "var(--bg-deep)", padding: "10px 12px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-subtle)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
              <span style={{ fontSize: "12px", fontWeight: 500, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "4px" }}>
                <Beaker className="size-3 text-amber-500" /> Nitrogen (N)
              </span>
              <span style={{ fontSize: "12px", fontWeight: 700, color: "var(--accent-gold)" }}>
                {params.Nitrogen_kg_per_acre} kg/acre
              </span>
            </div>
            <input
              type="range"
              min="40"
              max="280"
              step="5"
              value={params.Nitrogen_kg_per_acre}
              onChange={(e) => setParams((p) => ({ ...p, Nitrogen_kg_per_acre: parseFloat(e.target.value) }))}
              style={{ width: "100%", accentColor: "var(--accent-gold)", cursor: "pointer" }}
            />
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "9px", color: "var(--text-muted)", marginTop: "2px" }}>
              <span>40 kg (Low)</span>
              <span>160 kg (Opt)</span>
              <span>280 kg (High)</span>
            </div>
          </div>

          {/* Potassium Slider */}
          <div className="slider-box" style={{ background: "var(--bg-deep)", padding: "10px 12px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-subtle)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
              <span style={{ fontSize: "12px", fontWeight: 500, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "4px" }}>
                <Sprout className="size-3 text-green-500" /> Potassium (K)
              </span>
              <span style={{ fontSize: "12px", fontWeight: 700, color: "var(--accent-gold)" }}>
                {params.Potassium_kg_per_acre} kg/acre
              </span>
            </div>
            <input
              type="range"
              min="20"
              max="200"
              step="5"
              value={params.Potassium_kg_per_acre}
              onChange={(e) => setParams((p) => ({ ...p, Potassium_kg_per_acre: parseFloat(e.target.value) }))}
              style={{ width: "100%", accentColor: "var(--accent-gold)", cursor: "pointer" }}
            />
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "9px", color: "var(--text-muted)", marginTop: "2px" }}>
              <span>20 kg</span>
              <span>100 kg</span>
              <span>200 kg</span>
            </div>
          </div>

          {/* Soil Moisture Slider */}
          <div className="slider-box" style={{ background: "var(--bg-deep)", padding: "10px 12px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-subtle)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
              <span style={{ fontSize: "12px", fontWeight: 500, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "4px" }}>
                <Droplets className="size-3 text-blue-500" /> Soil Moisture
              </span>
              <span style={{ fontSize: "12px", fontWeight: 700, color: "var(--accent-gold)" }}>
                {params.Soil_Moisture}%
              </span>
            </div>
            <input
              type="range"
              min="10"
              max="50"
              step="1"
              value={params.Soil_Moisture}
              onChange={(e) => setParams((p) => ({ ...p, Soil_Moisture: parseFloat(e.target.value) }))}
              style={{ width: "100%", accentColor: "var(--accent-gold)", cursor: "pointer" }}
            />
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "9px", color: "var(--text-muted)", marginTop: "2px" }}>
              <span>10% (Dry)</span>
              <span>30% (Ideal)</span>
              <span>50% (Saturated)</span>
            </div>
          </div>

          {/* Soil pH Slider */}
          <div className="slider-box" style={{ background: "var(--bg-deep)", padding: "10px 12px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-subtle)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
              <span style={{ fontSize: "12px", fontWeight: 500, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "4px" }}>
                <Sun className="size-3 text-purple-500" /> Soil pH
              </span>
              <span style={{ fontSize: "12px", fontWeight: 700, color: "var(--accent-gold)" }}>
                {params.Soil_pH}
              </span>
            </div>
            <input
              type="range"
              min="5.5"
              max="8.8"
              step="0.1"
              value={params.Soil_pH}
              onChange={(e) => setParams((p) => ({ ...p, Soil_pH: parseFloat(e.target.value) }))}
              style={{ width: "100%", accentColor: "var(--accent-gold)", cursor: "pointer" }}
            />
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "9px", color: "var(--text-muted)", marginTop: "2px" }}>
              <span>5.5 (Acidic)</span>
              <span>7.0 (Neutral)</span>
              <span>8.8 (Alkaline)</span>
            </div>
          </div>
        </div>

        {/* Insight note */}
        <div style={{ fontSize: "11px", color: "var(--text-secondary)", background: "rgba(212,168,67,0.06)", border: "1px solid rgba(212,168,67,0.15)", borderRadius: "var(--radius-sm)", padding: "8px 12px", display: "flex", alignItems: "center", gap: "8px" }}>
          <Zap className="size-3.5 text-amber-500 shrink-0" />
          <span>
            {deltaPercent > 5
              ? `🚀 Optimization gain: Increasing Nitrogen to ${params.Nitrogen_kg_per_acre} kg/acre with ${params.Soil_Moisture}% moisture projects a ${deltaPercent.toFixed(1)}% yield increase!`
              : deltaPercent < -5
              ? `⚠️ Yield drop detected: Parameter combination reduces predicted yield by ${Math.abs(deltaPercent).toFixed(1)}%.`
              : "Adjust the sliders to explore fertilizer and moisture trade-offs in real time."}
          </span>
        </div>
      </div>
    </div>
  )
}

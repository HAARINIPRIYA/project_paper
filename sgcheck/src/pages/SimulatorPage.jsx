import React, { useState, useEffect, useMemo } from "react"
import { motion } from "framer-motion"
import {
  Sliders,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  RotateCcw,
  Beaker,
  Droplets,
  Thermometer,
  Zap,
} from "lucide-react"

export default function SimulatorPage({
  fieldData,
  onApplySimulatedValues,
  onNavigate,
}) {
  const baselineN = Number(fieldData?.Nitrogen_kg_per_acre) || 140
  const baselineK = Number(fieldData?.Potassium_kg_per_acre) || 80
  const baselineM = Number(fieldData?.["Soil_Moisture_%"]) || 65
  const baselinePH = Number(fieldData?.Soil_pH) || 6.8

  const [simN, setSimN] = useState(baselineN)
  const [simK, setSimK] = useState(baselineK)
  const [simM, setSimM] = useState(baselineM)
  const [simPH, setSimPH] = useState(baselinePH)

  useEffect(() => {
    setSimN(Number(fieldData?.Nitrogen_kg_per_acre) || 140)
    setSimK(Number(fieldData?.Potassium_kg_per_acre) || 80)
    setSimM(Number(fieldData?.["Soil_Moisture_%"]) || 65)
    setSimPH(Number(fieldData?.Soil_pH) || 6.8)
  }, [fieldData])

  const { baselineYield, simulatedYield, deltaYield, deltaPercent } = useMemo(() => {
    const calcYield = (n, k, m, ph) => {
      let y = 220

      const nOpt = 170
      const nEff = -0.0035 * Math.pow(n - nOpt, 2) + 0.45 * (n - 100)
      y += nEff

      y += (k - 60) * 0.38

      const mEff = -0.04 * Math.pow(m - 68, 2) + 18
      y += mEff

      const phEff = -28 * Math.pow(ph - 6.8, 2) + 12
      y += phEff

      return Math.max(120, Math.min(420, y))
    }

    const base = calcYield(baselineN, baselineK, baselineM, baselinePH)
    const sim = calcYield(simN, simK, simM, simPH)
    const delta = sim - base
    const percent = (delta / base) * 100

    return {
      baselineYield: base,
      simulatedYield: sim,
      deltaYield: delta,
      deltaPercent: percent,
    }
  }, [baselineN, baselineK, baselineM, baselinePH, simN, simK, simM, simPH])

  const handleReset = () => {
    setSimN(baselineN)
    setSimK(baselineK)
    setSimM(baselineM)
    setSimPH(baselinePH)
  }

  const handleApply = () => {
    onApplySimulatedValues && onApplySimulatedValues({
      Nitrogen_kg_per_acre: String(simN),
      Potassium_kg_per_acre: String(simK),
      "Soil_Moisture_%": String(simM),
      Soil_pH: String(simPH),
    })
    onNavigate("forecaster")
  }

  const dynamicInsight = useMemo(() => {
    if (simN > 210 && simK < 70) {
      return {
        type: "warning",
        title: "Nitrogen Excess / Potassium Deficit Risk",
        message: "High nitrogen without adequate potassium causes vegetative lodging, brittle stalks, and reduced Brix sucrose recovery.",
      }
    }
    if (simM < 45) {
      return {
        type: "warning",
        title: "Rhizosphere Moisture Stress",
        message: "Soil moisture below 45% restricts nutrient transport and reduces grand-growth internode elongation.",
      }
    }
    if (simPH < 6.0) {
      return {
        type: "warning",
        title: "Soil Acidification Detected",
        message: "At pH < 6.0, phosphorus becomes immobilized as insoluble iron/aluminum phosphates. Agricultural lime recommended.",
      }
    }
    if (deltaYield > 15) {
      return {
        type: "success",
        title: "High Optimization Synergy",
        message: `Current adjustment projects a +${deltaYield.toFixed(1)} Q/A (+${deltaPercent.toFixed(1)}%) increase over current baseline!`,
      }
    }
    return {
      type: "info",
      title: "Balanced Nutritional Environment",
      message: "Parameters align closely with recommended high-density sugarcane cultivar management guidelines.",
    }
  }, [simN, simK, simM, simPH, deltaYield, deltaPercent])

  return (
    <div className="space-y-6 w-full pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-800/80">
        <div>
          <h1 className="font-heading text-2xl font-bold text-white flex items-center gap-2.5">
            <Sliders className="size-6 text-amber-400" />
            <span>Interactive "What-If" Sensitivity Simulator</span>
          </h1>
          <p className="text-xs text-slate-400">
            Dynamically adjust agronomic inputs to observe real-time yield changes and discover optimal field combinations.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleReset}
            className="btn-modern-secondary text-xs h-9"
          >
            <RotateCcw className="size-3.5" />
            <span>Reset Sliders</span>
          </button>

          <button
            type="button"
            onClick={handleApply}
            className="btn-modern-primary text-xs h-9"
          >
            <Zap className="size-3.5" />
            <span>Apply to Field Forecaster</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-7 glass-card p-6 bg-slate-900/70 space-y-6">
          <h2 className="font-heading text-base font-bold text-white pb-3 border-b border-slate-800">
            Interactive Input Controls
          </h2>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                <Beaker className="size-4 text-amber-400" />
                <span>Nitrogen Dosage (N)</span>
              </span>
              <span className="font-heading text-sm font-bold text-amber-400">
                {simN} <span className="text-[10px] font-normal text-slate-400">kg/acre</span>
              </span>
            </div>
            <input
              type="range"
              min="50"
              max="260"
              step="5"
              value={simN}
              onChange={(e) => setSimN(Number(e.target.value))}
              className="slider-custom"
            />
            <div className="flex justify-between text-[10px] text-slate-500">
              <span>Low (50 kg)</span>
              <span>Recommended: 160-180 kg</span>
              <span>Excessive (260 kg)</span>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                <Beaker className="size-4 text-emerald-400" />
                <span>Potassium Dosage (K)</span>
              </span>
              <span className="font-heading text-sm font-bold text-emerald-400">
                {simK} <span className="text-[10px] font-normal text-slate-400">kg/acre</span>
              </span>
            </div>
            <input
              type="range"
              min="30"
              max="180"
              step="5"
              value={simK}
              onChange={(e) => setSimK(Number(e.target.value))}
              className="slider-custom"
            />
            <div className="flex justify-between text-[10px] text-slate-500">
              <span>Low (30 kg)</span>
              <span>Recommended: 90-110 kg</span>
              <span>High (180 kg)</span>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                <Droplets className="size-4 text-sky-400" />
                <span>Soil Moisture Level</span>
              </span>
              <span className="font-heading text-sm font-bold text-sky-400">
                {simM}% <span className="text-[10px] font-normal text-slate-400">capacity</span>
              </span>
            </div>
            <input
              type="range"
              min="30"
              max="90"
              step="1"
              value={simM}
              onChange={(e) => setSimM(Number(e.target.value))}
              className="slider-custom"
            />
            <div className="flex justify-between text-[10px] text-slate-500">
              <span>Drought Stress (30%)</span>
              <span>Optimal (65-75%)</span>
              <span>Waterlogged (90%)</span>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                <Thermometer className="size-4 text-purple-400" />
                <span>Soil pH</span>
              </span>
              <span className="font-heading text-sm font-bold text-purple-400">
                {simPH.toFixed(1)} <span className="text-[10px] font-normal text-slate-400">pH scale</span>
              </span>
            </div>
            <input
              type="range"
              min="5.0"
              max="8.5"
              step="0.1"
              value={simPH}
              onChange={(e) => setSimPH(Number(e.target.value))}
              className="slider-custom"
            />
            <div className="flex justify-between text-[10px] text-slate-500">
              <span>Acidic (5.0)</span>
              <span>Neutral Ideal (6.5 - 7.0)</span>
              <span>Alkaline (8.5)</span>
            </div>
          </div>
        </div>

        <div className="lg:col-span-5 space-y-4">
          <div className="glass-card p-6 bg-slate-900/70 space-y-5">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-400 pb-3 border-b border-slate-800">
              <span>SIMULATION COMPARISON</span>
              <span className="text-amber-400 font-bold">Live Recalculation</span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800">
                <span className="text-[11px] font-semibold text-slate-400 block mb-1">Baseline Yield</span>
                <div className="text-2xl font-bold font-heading text-slate-300">
                  {baselineYield.toFixed(1)}
                </div>
                <span className="text-[10px] text-slate-500">Quintals / Acre</span>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-950/70 border border-amber-500/30">
                <span className="text-[11px] font-semibold text-amber-400 block mb-1">Simulated Yield</span>
                <div className="text-2xl font-bold font-heading text-white">
                  {simulatedYield.toFixed(1)}
                </div>
                <span className="text-[10px] text-amber-400/80">Quintals / Acre</span>
              </div>
            </div>

            <div
              className={`p-4 rounded-xl border flex items-center justify-between ${
                deltaYield >= 0
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                  : "bg-rose-500/10 border-rose-500/30 text-rose-300"
              }`}
            >
              <div>
                <span className="text-xs font-semibold block">Projected Yield Impact</span>
                <span className="text-lg font-bold font-heading">
                  {deltaYield >= 0 ? `+${deltaYield.toFixed(1)}` : deltaYield.toFixed(1)} Q/A
                </span>
              </div>
              <div className="text-right">
                <span className="text-xs font-bold font-mono">
                  {deltaPercent >= 0 ? `+${deltaPercent.toFixed(1)}%` : `${deltaPercent.toFixed(1)}%`}
                </span>
                <span className="text-[10px] block opacity-80">Variance</span>
              </div>
            </div>
          </div>

          <div
            className={`p-5 rounded-2xl border ${
              dynamicInsight.type === "warning"
                ? "bg-amber-500/10 border-amber-500/30 text-amber-200"
                : dynamicInsight.type === "success"
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-200"
                : "bg-slate-900/80 border-slate-800 text-slate-300"
            }`}
          >
            <div className="flex items-center gap-2 font-bold text-sm mb-1">
              {dynamicInsight.type === "warning" ? (
                <AlertTriangle className="size-4 text-amber-400 shrink-0" />
              ) : (
                <CheckCircle2 className="size-4 text-emerald-400 shrink-0" />
              )}
              <span>{dynamicInsight.title}</span>
            </div>
            <p className="text-xs opacity-90 leading-relaxed">
              {dynamicInsight.message}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

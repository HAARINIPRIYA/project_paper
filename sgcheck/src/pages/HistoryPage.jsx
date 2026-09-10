import React, { useState, useEffect, useMemo, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  History,
  Trash2,
  Clock,
  Grid,
  List,
  Filter,
  ArrowDownUp,
  Download,
  Calendar,
  Droplet,
  Leaf,
  Sprout,
  Tractor,
  FlaskConical,
  Crop,
  Cpu,
  BarChart3,
  TrendingUp,
  CheckSquare,
  Square,
  X,
  Eye,
  CheckCircle2,
  AlertCircle,
  Sparkles,
} from "lucide-react"

const MODEL_LABELS = {
  cane_sugar: "CaneSugar v6 (Ensemble)",
  catboost: "CatBoost Regressor",
  xgboost: "XGBoost Regressor",
  random_forest: "Random Forest",
  linear_regression: "Linear Regression (OLS)",
  elastic_net: "ElasticNet",
  ensemble: "CaneSugar Ensemble",
  auto: "Auto (CaneSugar v6)",
}

const MODEL_COLORS = {
  cane_sugar: "text-amber-400 border-amber-500/30 bg-amber-500/10",
  catboost: "text-emerald-400 border-emerald-500/30 bg-emerald-500/10",
  xgboost: "text-sky-400 border-sky-500/30 bg-sky-500/10",
  random_forest: "text-orange-400 border-orange-500/30 bg-orange-500/10",
  linear_regression: "text-purple-400 border-purple-500/30 bg-purple-500/10",
  elastic_net: "text-rose-400 border-rose-500/30 bg-rose-500/10",
  ensemble: "text-amber-400 border-amber-500/30 bg-amber-500/10",
  auto: "text-amber-400 border-amber-500/30 bg-amber-500/10",
}

const FIELD_ICONS = {
  variety: Sprout,
  soil_type: Tractor,
  irrigation_type: Droplet,
  fertilizer_type: FlaskConical,
  crop_type: Crop,
  planting_date: Calendar,
  harvesting_date: Calendar,
}

const FIELD_LABELS = {
  variety: "Variety",
  soil_type: "Soil",
  irrigation_type: "Irrigation",
  fertilizer_type: "Fertilizer",
  crop_type: "Crop Season",
  planting_date: "Planted",
  harvesting_date: "Harvest",
  Nitrogen_kg_per_acre: "Nitrogen",
  Phosphorus_kg_per_acre: "Phosphorus",
  Potassium_kg_per_acre: "Potassium",
  "Soil_Moisture_%": "Moisture",
  Soil_pH: "pH",
  Cane_Height_cm: "Height",
  Brix_Value: "Brix",
}

function formatDate(ts) {
  if (!ts) return ""
  try {
    const d = new Date(ts)
    if (!isNaN(d.getTime())) {
      const now = new Date()
      const diff = now - d
      const mins = Math.floor(diff / 60000)
      const hours = Math.floor(diff / 3600000)
      const days = Math.floor(diff / 86400000)
      if (mins < 1) return "Just now"
      if (mins < 60) return `${mins}m ago`
      if (hours < 24) return `${hours}h ago`
      if (days < 7) return `${days}d ago`
      return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
    }
  } catch {}
  return String(ts)
}

export default function HistoryPage({ onBack }) {
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterModel, setFilterModel] = useState("all")
  const [viewMode, setViewMode] = useState("list")
  const [sortBy, setSortBy] = useState("timestamp")
  const [sortOrder, setSortOrder] = useState("desc")
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [showCompare, setShowCompare] = useState(false)

  const fetchHistory = useCallback(async () => {
    try {
      const response = await fetch("http://localhost:8000/history")
      const data = await response.json()
      if (data.success && Array.isArray(data.predictions)) {
        setHistory(data.predictions)
      }
    } catch (error) {
      setHistory([
        {
          timestamp: new Date(Date.now() - 3600000).toISOString(),
          model: "cane_sugar",
          prediction: 312.45,
          status: "success",
          input: {
            Variety: "Co 0238",
            Crop_Type: "Ratoon",
            Soil_Type: "Loamy",
            Irrigation_Type: "Drip",
            Nitrogen_kg_per_acre: "180",
            Potassium_kg_per_acre: "120",
            "Soil_Moisture_%": "68",
          },
        },
        {
          timestamp: new Date(Date.now() - 86400000).toISOString(),
          model: "catboost",
          prediction: 304.2,
          status: "success",
          input: {
            Variety: "Co 86032",
            Crop_Type: "Plant Cane",
            Soil_Type: "Clay",
            Irrigation_Type: "Furrow",
            Nitrogen_kg_per_acre: "135",
            Potassium_kg_per_acre: "70",
            "Soil_Moisture_%": "55",
          },
        },
      ])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchHistory()
  }, [fetchHistory])

  const clearHistory = async () => {
    if (window.confirm("Are you sure you want to clear all prediction history?")) {
      try {
        await fetch("http://localhost:8000/history", { method: "DELETE" })
      } catch {}
      setHistory([])
      setSelectedIds(new Set())
    }
  }

  const filteredHistory = useMemo(() => {
    let result = [...history]
    if (filterModel !== "all") {
      result = result.filter((item) => item.model === filterModel)
    }
    result.sort((a, b) => {
      const aVal = a[sortBy] ?? ""
      const bVal = b[sortBy] ?? ""
      if (aVal < bVal) return sortOrder === "asc" ? -1 : 1
      if (aVal > bVal) return sortOrder === "asc" ? 1 : -1
      return 0
    })
    return result
  }, [history, filterModel, sortBy, sortOrder])

  const yieldRange = useMemo(() => {
    const vals = filteredHistory
      .map((h) => Number(h.prediction))
      .filter((v) => !isNaN(v) && v > 0)
    if (vals.length === 0) return { min: 100, max: 400 }
    return { min: Math.min(...vals), max: Math.max(...vals) }
  }, [filteredHistory])

  const toggleSelect = useCallback((idx) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(idx)) next.delete(idx)
      else next.add(idx)
      return next
    })
  }, [])

  const clearSelection = useCallback(() => setSelectedIds(new Set()), [])

  const selectedItems = useMemo(
    () => filteredHistory.filter((_, i) => selectedIds.has(i)),
    [filteredHistory, selectedIds]
  )

  const stats = useMemo(() => {
    const modelsUsed = [...new Set(history.map((h) => h.model).filter(Boolean))]
    const validPreds = history.map((h) => Number(h.prediction)).filter((n) => !isNaN(n) && n > 0)
    const avgYield = validPreds.length > 0
      ? (validPreds.reduce((a, b) => a + b, 0) / validPreds.length).toFixed(1)
      : "—"

    return [
      { label: "Total Predictions", value: history.length, sub: "Stored in local registry", icon: History },
      { label: "Models Utilized", value: modelsUsed.length || "—", sub: `${modelsUsed.slice(0, 2).join(", ") || "Stacking"}`, icon: Cpu },
      { label: "Average Forecast", value: avgYield === "—" ? "—" : `${avgYield} Q/A`, sub: "~" + (Number(avgYield) * 0.1).toFixed(1) + " tons/acre", icon: TrendingUp },
      { label: "Active View", value: `${filteredHistory.length} Records`, sub: filterModel === "all" ? "All models" : filterModel, icon: Calendar },
    ]
  }, [history, filteredHistory.length, filterModel])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-center">
        <div className="size-8 rounded-full border-2 border-amber-400 border-t-transparent animate-spin mb-3" />
        <span className="text-xs text-slate-400 ml-3">Loading prediction registry...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6 w-full pb-12 box-border">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-800/80">
        <div>
          <h1 className="font-heading text-2xl font-bold text-white flex items-center gap-2.5">
            <History className="size-6 text-amber-400" />
            <span>Yield Prediction History</span>
          </h1>
          <p className="text-xs text-slate-400">
            Audit, filter, and compare previous inference runs across different soil zones and models.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {selectedIds.size > 0 && (
            <button
              type="button"
              onClick={() => setShowCompare(true)}
              className="btn-modern-primary text-xs h-9 px-3.5"
            >
              <Eye className="size-3.5" />
              <span>Compare Selected ({selectedIds.size})</span>
            </button>
          )}

          <button
            type="button"
            onClick={clearHistory}
            disabled={history.length === 0}
            className="btn-modern-secondary text-xs h-9 px-3 text-rose-400 border-rose-500/30 hover:border-rose-500/50"
          >
            <Trash2 className="size-3.5" />
            <span>Clear History</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full box-border">
        {stats.map((s) => {
          const Icon = s.icon
          return (
            <div key={s.label} className="kpi-tile">
              <div className="kpi-title">
                <span>{s.label}</span>
                <Icon className="size-4 text-amber-400" />
              </div>
              <div className="kpi-value text-white">{s.value}</div>
              <div className="kpi-sub">{s.sub}</div>
            </div>
          )
        })}
      </div>

      <div className="glass-card p-4 bg-slate-900/70 flex flex-wrap items-center justify-between gap-4 box-border">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Filter className="size-3.5 text-slate-400" />
            <span className="text-xs font-semibold text-slate-300">Model:</span>
            <select
              value={filterModel}
              onChange={(e) => setFilterModel(e.target.value)}
              className="smart-select text-xs h-8 py-0 pl-2.5 pr-7 w-44"
            >
              <option value="all">All Production Models</option>
              {Object.entries(MODEL_LABELS).map(([val, label]) => (
                <option key={val} value={val}>{label}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <ArrowDownUp className="size-3.5 text-slate-400" />
            <span className="text-xs font-semibold text-slate-300">Sort:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="smart-select text-xs h-8 py-0 pl-2.5 pr-7 w-32"
            >
              <option value="timestamp">Date</option>
              <option value="prediction">Predicted Yield</option>
              <option value="model">Model</option>
            </select>
            <button
              type="button"
              onClick={() => setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"))}
              className="size-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition-transform"
              style={{ transform: sortOrder === "asc" ? "rotate(180deg)" : "none" }}
              title={sortOrder === "asc" ? "Ascending" : "Descending"}
            >
              <ArrowDownUp className="size-3.5" />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-950/80 border border-slate-800">
          <button
            type="button"
            onClick={() => { setViewMode("list"); clearSelection(); }}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              viewMode === "list" ? "bg-amber-500 text-slate-950 font-bold" : "text-slate-400 hover:text-white"
            }`}
          >
            <List className="size-3.5" />
            <span>List</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode("grid")}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              viewMode === "grid" ? "bg-amber-500 text-slate-950 font-bold" : "text-slate-400 hover:text-white"
            }`}
          >
            <Grid className="size-3.5" />
            <span>Grid (Compare)</span>
          </button>
        </div>
      </div>

      {viewMode === "grid" && selectedIds.size > 0 && (
        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between text-xs text-amber-300">
          <span className="flex items-center gap-2 font-medium">
            <CheckSquare className="size-4 text-amber-400" />
            <span>{selectedIds.size} item(s) selected for side-by-side comparison</span>
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowCompare(true)}
              className="px-3 py-1 rounded-lg bg-amber-500 text-slate-950 font-bold hover:bg-amber-400 transition-colors"
            >
              Launch Side-by-Side Diff
            </button>
            <button
              type="button"
              onClick={clearSelection}
              className="p-1 hover:text-white"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>
      )}

      {filteredHistory.length === 0 ? (
        <div className="glass-card p-12 text-center flex flex-col items-center justify-center bg-slate-900/60">
          <History className="size-10 text-slate-600 mb-3" />
          <h3 className="font-heading text-base font-bold text-white mb-1">No Historical Predictions</h3>
          <p className="text-xs text-slate-400 max-w-sm">
            Execute forecasts in the Yield Forecaster tab to begin compiling your plot history registry.
          </p>
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 w-full box-border">
          {filteredHistory.map((item, idx) => {
            const isSelected = selectedIds.has(idx)
            const val = Number(item.prediction) || 0
            const modelBadge = MODEL_COLORS[item.model] || "text-slate-300 border-slate-700 bg-slate-800"

            return (
              <div
                key={`${item.timestamp}-${idx}`}
                onClick={() => toggleSelect(idx)}
                className={`glass-card p-4 bg-slate-900/70 cursor-pointer transition-all ${
                  isSelected ? "border-amber-500 ring-2 ring-amber-500/30 shadow-lg shadow-amber-500/10" : "hover:border-slate-700"
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${modelBadge}`}>
                    {MODEL_LABELS[item.model] || item.model}
                  </span>
                  <div className="text-slate-400 hover:text-amber-400">
                    {isSelected ? <CheckSquare className="size-4 text-amber-400" /> : <Square className="size-4" />}
                  </div>
                </div>

                <div className="text-center py-2 border-y border-slate-800/80 my-2">
                  <div className="font-heading text-3xl font-bold text-white tracking-tight">
                    {val.toFixed(1)}
                  </div>
                  <div className="text-[10px] text-amber-400 font-semibold">Quintals / Acre</div>
                  <div className="text-[10px] text-slate-400">~{(val * 0.1).toFixed(1)} T/ac</div>
                </div>

                {item.input && (
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {Object.entries(item.input).slice(0, 3).map(([k, v]) => (
                      <span key={k} className="px-2 py-0.5 rounded bg-slate-950/80 border border-slate-800 text-[10px] text-slate-300">
                        {FIELD_LABELS[k] || k}: <strong className="text-white">{v}</strong>
                      </span>
                    ))}
                  </div>
                )}

                <div className="flex items-center justify-between pt-3 mt-3 border-t border-slate-800 text-[10px] text-slate-500">
                  <span className="flex items-center gap-1">
                    <Clock className="size-3" />
                    {formatDate(item.timestamp)}
                  </span>
                  <span className="text-emerald-400 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="size-3" /> Recorded
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="space-y-3 w-full box-border">
          {filteredHistory.map((item, idx) => {
            const val = Number(item.prediction) || 0
            const modelBadge = MODEL_COLORS[item.model] || "text-slate-300 border-slate-700 bg-slate-800"

            const handleDownload = (e) => {
              e.stopPropagation()
              const data = JSON.stringify(item, null, 2)
              const blob = new Blob([data], { type: "application/json" })
              const url = URL.createObjectURL(blob)
              const a = document.createElement("a")
              a.href = url
              a.download = `canesense-prediction-${item.timestamp || Date.now()}.json`
              a.click()
              URL.revokeObjectURL(url)
            }

            return (
              <div
                key={`${item.timestamp}-${idx}`}
                className="glass-card p-4 bg-slate-900/70 flex flex-col md:flex-row md:items-center justify-between gap-4 box-border"
              >
                <div className="flex items-start md:items-center gap-4 min-w-0">
                  <div className="text-center shrink-0 min-w-[90px] p-2.5 rounded-xl bg-slate-950/80 border border-slate-800">
                    <div className="font-heading text-xl font-bold text-amber-400">
                      {val.toFixed(1)}
                    </div>
                    <div className="text-[10px] text-slate-400">Q / Acre</div>
                  </div>

                  <div className="space-y-1.5 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${modelBadge}`}>
                        {MODEL_LABELS[item.model] || item.model}
                      </span>
                      <span className="text-xs text-slate-400 flex items-center gap-1">
                        <Clock className="size-3" />
                        {formatDate(item.timestamp)}
                      </span>
                    </div>

                    {item.input && (
                      <div className="flex items-center gap-2 flex-wrap text-xs text-slate-300">
                        {Object.entries(item.input).slice(0, 4).map(([k, v]) => (
                          <span key={k} className="px-2 py-0.5 rounded bg-slate-950/60 border border-slate-800 text-[10px]">
                            {FIELD_LABELS[k] || k}: <strong className="text-white">{v}</strong>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-800">
                  <button
                    type="button"
                    onClick={handleDownload}
                    className="p-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                    title="Export Record (JSON)"
                  >
                    <Download className="size-3.5" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <AnimatePresence>
        {showCompare && selectedItems.length > 0 && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md"
            onClick={() => setShowCompare(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="glass-card max-w-4xl w-full max-h-[85vh] flex flex-col bg-slate-900 border-slate-700 shadow-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
                <div className="flex items-center gap-2.5">
                  <Eye className="size-5 text-amber-400" />
                  <div>
                    <h3 className="font-heading text-base font-bold text-white">
                      Side-by-Side Prediction Diff
                    </h3>
                    <p className="text-[11px] text-slate-400">Comparing {selectedItems.length} selected plot records</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCompare(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                >
                  <X className="size-5" />
                </button>
              </div>

              <div className="flex-1 overflow-auto p-5 space-y-6">
                <div className="space-y-2 pb-4 border-b border-slate-800">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Yield Comparison (Q/A)</h4>
                  <div className="space-y-2">
                    {selectedItems.map((item, idx) => {
                      const val = Number(item.prediction) || 0
                      const pct = yieldRange.max > yieldRange.min
                        ? ((val - yieldRange.min) / (yieldRange.max - yieldRange.min)) * 100
                        : 60

                      return (
                        <div key={idx} className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-semibold text-slate-300">
                              #{idx + 1} — {MODEL_LABELS[item.model] || item.model}
                            </span>
                            <span className="font-mono font-bold text-amber-400">{val.toFixed(1)} Q/A</span>
                          </div>
                          <div className="h-2 w-full bg-slate-950 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-amber-400 to-amber-500"
                              style={{ width: `${Math.max(10, pct)}%` }}
                            />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400">
                        <th className="py-2.5 pr-4 font-semibold">Parameter</th>
                        {selectedItems.map((item, idx) => (
                          <th key={idx} className="py-2.5 px-4 font-semibold text-white">
                            Plot #{idx + 1}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      <tr>
                        <td className="py-2.5 pr-4 text-slate-400 font-medium">Model Used</td>
                        {selectedItems.map((item, idx) => (
                          <td key={idx} className="py-2.5 px-4 font-semibold text-amber-300">
                            {MODEL_LABELS[item.model] || item.model}
                          </td>
                        ))}
                      </tr>
                      <tr>
                        <td className="py-2.5 pr-4 text-slate-400 font-medium">Predicted Harvest</td>
                        {selectedItems.map((item, idx) => (
                          <td key={idx} className="py-2.5 px-4 font-bold text-white font-mono text-sm">
                            {Number(item.prediction || 0).toFixed(1)} Q/A
                          </td>
                        ))}
                      </tr>
                      {(() => {
                        const allKeys = new Set()
                        selectedItems.forEach((it) => {
                          if (it.input) Object.keys(it.input).forEach((k) => allKeys.add(k))
                        })
                        return Array.from(allKeys).map((k) => (
                          <tr key={k}>
                            <td className="py-2 pr-4 text-slate-400 font-medium">{FIELD_LABELS[k] || k}</td>
                            {selectedItems.map((it, idx) => (
                              <td key={idx} className="py-2 px-4 text-slate-200">
                                {it.input?.[k] || "—"}
                              </td>
                            ))}
                          </tr>
                        ))
                      })()}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}

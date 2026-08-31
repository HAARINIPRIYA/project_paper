import { useState, useEffect, useMemo, useCallback } from "react"
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
  ArrowUpDown,
  AlertCircle,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"

const MODEL_LABELS = {
  cane_sugar: "🍬 CaneSugar v6",
  catboost: "CatBoost",
  xgboost: "XGBoost",
  random_forest: "Random Forest",
  linear_regression: "Linear Regression",
  elastic_net: "ElasticNet",
  ensemble: "Ensemble",
  auto: "Auto (CaneSugar v6)",
}

const MODEL_COLORS = {
  cane_sugar: "var(--accent-gold)",
  catboost: "var(--accent-green)",
  xgboost: "var(--accent-blue)",
  random_forest: "var(--accent-orange)",
  linear_regression: "#9B7ED8",
  elastic_net: "var(--accent-red)",
  ensemble: "var(--accent-gold)",
  auto: "var(--accent-gold)",
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
  crop_type: "Season",
  planting_date: "Planted",
  harvesting_date: "Harvest",
}


function getYieldColor(val, minVal, maxVal) {
  if (minVal === maxVal) return "var(--accent-gold)"
  const ratio = (val - minVal) / (maxVal - minVal)
  if (ratio > 0.66) return "var(--accent-sage)"
  if (ratio > 0.33) return "var(--accent-orange)"
  return "var(--accent-red)"
}

function getYieldLabel(val, minVal, maxVal) {
  if (minVal === maxVal) return "Average"
  const ratio = (val - minVal) / (maxVal - minVal)
  if (ratio > 0.66) return "High"
  if (ratio > 0.33) return "Medium"
  return "Low"
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
  return ts
}

function HistoryPage({ onBack }) {
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterModel, setFilterModel] = useState("all")
  const [viewMode, setViewMode] = useState("list")
  const [sortBy, setSortBy] = useState("timestamp")
  const [sortOrder, setSortOrder] = useState("desc")
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [showCompare, setShowCompare] = useState(false)

  useEffect(() => {
    fetchHistory()
  }, [])

  const fetchHistory = async () => {
    try {
      const response = await fetch("http://localhost:8000/history")
      const data = await response.json()
      if (data.success) {
        setHistory(data.predictions || [])
      }
    } catch (error) {
      console.error("Error fetching history:", error)
    } finally {
      setLoading(false)
    }
  }

  const clearHistory = async () => {
    if (window.confirm("Are you sure you want to clear all prediction history?")) {
      try {
        const response = await fetch("http://localhost:8000/history", {
          method: "DELETE",
        })
        if (response.ok) {
          setHistory([])
          setSelectedIds(new Set())
        }
      } catch (error) {
        console.error("Error clearing history:", error)
      }
    }
  }

  const filteredHistory = useMemo(() => {
    let result = [...history]
    if (filterModel !== "all") {
      result = result.filter((item) => item.model === filterModel)
    }
    result.sort((a, b) => {
      const aVal = a[sortBy]
      const bVal = b[sortBy]
      if (aVal < bVal) return sortOrder === "asc" ? -1 : 1
      if (aVal > bVal) return sortOrder === "asc" ? 1 : -1
      return 0
    })
    return result
  }, [history, filterModel, sortBy, sortOrder])

  
  const yieldRange = useMemo(() => {
    const vals = filteredHistory
      .map((h) => h.prediction)
      .filter((v) => v !== undefined && v !== null && !isNaN(Number(v)))
      .map(Number)
    if (vals.length === 0) return { min: 0, max: 100 }
    return { min: Math.min(...vals), max: Math.max(...vals) }
  }, [filteredHistory])

  const toggleSelect = useCallback((id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
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
    const dateRange = history.length > 0 
      ? `${history[history.length - 1]?.timestamp || "N/A"} - ${history[0]?.timestamp || "N/A"}`
      : "No data"
    return [
      {
        label: "Total Predictions",
        value: history.length || "—",
        meta: "All time predictions",
        icon: History,
      },
      {
        label: "Models Used",
        value: modelsUsed.length || "—",
        meta: modelsUsed.slice(0, 4).join(", ") + (modelsUsed.length > 4 ? " +" : ""),
        icon: Cpu,
      },
      {
        label: "Date Range",
        value: history.length > 0 ? history.length + " records" : "No data",
        meta: dateRange,
        icon: Calendar,
      },
      {
        label: "Avg Yield",
        value: history.length > 0
          ? (history.reduce((s, h) => s + (Number(h.prediction) || 0), 0) / history.length).toFixed(1)
          : "—",
        meta: "Quintal/Acre average",
        icon: TrendingUp,
      },
    ]
  }, [history])

  if (loading) {
    return (
      <div className="flex items-center justify-center" style={{ height: "80vh" }}>
        <div className="flex flex-col items-center gap-4">
          <div className="size-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: "var(--accent-gold)", borderTopColor: "transparent" }} />
          <span style={{ fontSize: "13px", color: "var(--text-secondary)" }}>Loading prediction history...</span>
        </div>
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25 }}
      className="flex flex-col gap-6"
    >
      {}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "2px" }}>
            <div style={{
              width: "28px", height: "28px",
              background: "linear-gradient(135deg, var(--accent-gold), #B88A30)",
              borderRadius: "2px",
              display: "grid", placeItems: "center",
              flexShrink: 0,
            }}>
              <History className="size-3.5" style={{ color: "#fff" }} />
            </div>
            <h1 style={{ fontSize: "18px", fontWeight: 600, margin: 0, color: "var(--text-primary)" }}>Prediction History</h1>
          </div>
          <p style={{ fontSize: "13px", color: "var(--text-secondary)", margin: 0, marginLeft: "36px" }}>
            Track, review and compare all past sugarcane yield predictions
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Badge variant="outline" className="text-[9px] gap-1">
            <span className="size-1.5 rounded-full" style={{ background: history.length > 0 ? "var(--accent-sage)" : "var(--text-muted)" }} />
            {history.length} records
          </Badge>
          {selectedIds.size > 0 && (
            <Button variant="primary" size="sm" className="gap-1.5" onClick={() => setShowCompare(true)}>
              <Eye className="size-3.5" />
              Compare ({selectedIds.size})
            </Button>
          )}
          {onBack && (
            <Button variant="default" size="sm" onClick={onBack} className="gap-1.5">
              <BarChart3 className="size-3.5" />
              Dashboard
            </Button>
          )}
          <Button
            variant="default"
            size="sm"
            onClick={clearHistory}
            disabled={history.length === 0}
            style={{ color: "var(--accent-red)" }}
            className="gap-1.5"
          >
            <Trash2 className="size-3.5" />
            Clear
          </Button>
        </div>
      </div>

      {}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat, idx) => {
          const Icon = stat.icon
          return (
            <div key={idx} className="stat-card">
              <div className="stat-card-header">
                <div>
                  <div className="stat-card-label">{stat.label}</div>
                  <div className="stat-value">{typeof stat.value === "number" ? stat.value : stat.value}</div>
                </div>
                <div className="stat-card-icon">
                  <Icon className="size-4" />
                </div>
              </div>
              <div className="stat-meta">{stat.meta}</div>
            </div>
          )
        })}
      </div>

      {}
      <div className="aws-card">
        <div className="aws-card-body compact">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex items-center gap-2">
              <Filter className="size-3.5" style={{ color: "var(--text-secondary)" }} />
              <span className="divider-label-text">Model:</span>
              <select
                value={filterModel}
                onChange={(e) => setFilterModel(e.target.value)}
                className="input"
                style={{ width: "160px", height: "32px", fontSize: "12px", padding: "0 8px", cursor: "pointer" }}
              >
                <option value="all">All Models</option>
                {Object.entries(MODEL_LABELS).map(([val, label]) => (
                  <option key={val} value={val}>{label}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <ArrowDownUp className="size-3.5" style={{ color: "var(--text-secondary)" }} />
              <span className="divider-label-text">Sort by:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="input"
                style={{ width: "140px", height: "32px", fontSize: "12px", padding: "0 8px", cursor: "pointer" }}
              >
                <option value="timestamp">Date</option>
                <option value="model">Model</option>
                <option value="prediction">Prediction</option>
              </select>
              <button
                type="button"
                onClick={() => setSortOrder(prev => prev === "asc" ? "desc" : "asc")}
                className="btn btn-default btn-icon-sm"
                style={{ transform: sortOrder === "asc" ? "rotate(180deg)" : "none", transition: "transform 200ms" }}
                title={sortOrder === "asc" ? "Ascending" : "Descending"}
              >
                <ArrowDownUp className="size-3" />
              </button>
            </div>
            <div className="flex items-center gap-2 ml-auto">
              <span className="divider-label-text">View:</span>
              <button
                type="button"
                onClick={() => { setViewMode("list"); clearSelection() }}
                className={"btn " + (viewMode === "list" ? "btn-primary" : "btn-default") + " btn-icon-sm"}
                title="List view"
              >
                <List className="size-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode("grid")}
                className={"btn " + (viewMode === "grid" ? "btn-primary" : "btn-default") + " btn-icon-sm"}
                title="Grid view — select items to compare"
              >
                <Grid className="size-3.5" />
              </button>
            </div>
          </div>
          {}
          {viewMode === "grid" && selectedIds.size > 0 && (
            <div className="flex items-center justify-between" style={{ marginTop: "10px", paddingTop: "10px", borderTop: "1px solid var(--border-subtle)" }}>
              <span style={{ fontSize: "11px", color: "var(--text-secondary)" }}>
                <CheckSquare className="size-3" style={{ display: "inline", marginRight: "4px", color: "var(--accent-gold)" }} />
                {selectedIds.size} item{selectedIds.size > 1 ? "s" : ""} selected — click <strong>Compare</strong> to view side by side
              </span>
              <button
                type="button"
                onClick={clearSelection}
                className="btn btn-ghost"
                style={{ fontSize: "11px", height: "28px", padding: "0 8px" }}
              >
                <X className="size-3" />
                Clear
              </button>
            </div>
          )}
        </div>
      </div>

      {}
      <div className="aws-card" style={{ minHeight: "400px" }}>
        <div className="aws-card-header">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div className="flex items-center gap-3">
              <span className="aws-card-title" style={{ fontSize: "14px" }}>
                {viewMode === "grid" ? <Grid className="size-4" style={{ color: "var(--accent-blue)" }} /> : <List className="size-4" style={{ color: "var(--accent-blue)" }} />}
                {viewMode === "grid" ? "Grid View — Select to Compare" : "Predictions"}
              </span>
            </div>
            <Badge variant="secondary" className="text-[9px]">{filteredHistory.length} records</Badge>
          </div>
        </div>
        <div className="aws-card-body" style={{ padding: "0" }}>
          <ScrollArea className="h-[600px]">
            <div className="flex flex-col" style={{ padding: "16px", gap: "12px" }}>
              {filteredHistory.length === 0 ? (
                <div className="flex flex-col items-center justify-center" style={{ padding: "80px 20px", textAlign: "center" }}>
                  <div className="stat-card-icon" style={{ width: "64px", height: "64px", marginBottom: "16px" }}>
                    <History className="size-8" style={{ opacity: 0.5 }} />
                  </div>
                  <h3 style={{ fontSize: "16px", fontWeight: 600, color: "var(--text-primary)", margin: "0 0 6px" }}>
                    {history.length === 0 ? "No predictions yet" : "No matching records"}
                  </h3>
                  <p style={{ fontSize: "13px", color: "var(--text-secondary)", maxWidth: "320px", margin: 0 }}>
                    {history.length === 0
                      ? "Run predictions from the Tools panel and they'll appear here for tracking"
                      : "Try changing the filter to see more results"}
                  </p>
                </div>
              ) : viewMode === "grid" ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {filteredHistory.map((item, index) => (
                    <GridCard
                      key={`${item.timestamp}-${index}`}
                      item={item}
                      index={index}
                      isSelected={selectedIds.has(index)}
                      onToggle={() => toggleSelect(index)}
                      yieldMin={yieldRange.min}
                      yieldMax={yieldRange.max}
                    />
                  ))}
                </div>
              ) : (
                filteredHistory.map((item, index) => (
                  <HistoryCard key={`${item.timestamp}-${index}`} item={item} />
                ))
              )}
            </div>
          </ScrollArea>
        </div>
      </div>

      {}
      <AnimatePresence>
        {showCompare && selectedItems.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center"
            style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}
            onClick={() => setShowCompare(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
              className="compare-modal"
              onClick={(e) => e.stopPropagation()}
              style={{ maxHeight: "85vh", overflow: "hidden" }}
            >
              <div className="compare-modal-header">
                <div className="flex items-center gap-3">
                  <Eye className="size-4" style={{ color: "var(--accent-gold)" }} />
                  <h2 style={{ fontSize: "16px", fontWeight: 600, margin: 0, color: "var(--text-primary)" }}>
                    Compare Predictions
                  </h2>
                  <Badge variant="blue" className="text-[9px]">{selectedItems.length} items</Badge>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCompare(false)}
                  className="btn btn-ghost btn-icon-sm"
                >
                  <X className="size-4" />
                </button>
              </div>
              <ScrollArea style={{ maxHeight: "calc(85vh - 60px)" }}>
                <div className="compare-modal-body">
                  {}
                  <div className="compare-section">
                    <div className="compare-section-title">Yield Comparison (Quintal/Acre)</div>
                    <div className="compare-bar-chart">
                      {selectedItems.map((item, idx) => {
                        const val = Number(item.prediction) || 0
                        const pct = yieldRange.max > yieldRange.min
                          ? ((val - yieldRange.min) / (yieldRange.max - yieldRange.min)) * 100
                          : 50
                        const color = getYieldColor(val, yieldRange.min, yieldRange.max)
                        return (
                          <div key={idx} className="compare-bar-row">
                            <div className="compare-bar-label">
                              <span className="size-2 rounded-full" style={{ background: MODEL_COLORS[item.model] || "var(--text-secondary)", flexShrink: 0 }} />
                              <span className="truncate" style={{ fontSize: "11px", fontWeight: 500 }}>
                                #{idx + 1} — {MODEL_LABELS[item.model] || item.model}
                              </span>
                            </div>
                            <div className="compare-bar-track">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${Math.max(pct, 4)}%` }}
                                transition={{ duration: 0.6, delay: idx * 0.08, ease: [0.25, 0.1, 0.25, 1] }}
                                className="compare-bar-fill"
                                style={{ background: color }}
                              />
                            </div>
                            <div className="compare-bar-value">{val.toFixed(2)}</div>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  {}
                  <div className="compare-section">
                    <div className="compare-section-title">Side-by-Side Details</div>
                    <div className="compare-table-wrap">
                      <table className="compare-table">
                        <thead>
                          <tr>
                            <th style={{ minWidth: "120px" }}>Field</th>
                            {selectedItems.map((item, idx) => (
                              <th key={idx} style={{ minWidth: "140px" }}>
                                <div className="flex items-center gap-1.5">
                                  <span className="size-1.5 rounded-full" style={{ background: MODEL_COLORS[item.model] || "var(--text-secondary)" }} />
                                  #{idx + 1}
                                </div>
                                <div style={{ fontSize: "9px", fontWeight: 400, color: "var(--text-muted)", marginTop: "2px" }}>
                                  {MODEL_LABELS[item.model] || item.model}
                                </div>
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {}
                          <tr>
                            <td className="compare-field-label">
                              <TrendingUp className="size-3" />
                              Yield
                            </td>
                            {selectedItems.map((item, idx) => {
                              const val = Number(item.prediction) || 0
                              const color = getYieldColor(val, yieldRange.min, yieldRange.max)
                              return (
                                <td key={idx}>
                                  <span style={{ fontWeight: 700, color, fontSize: "15px" }}>{val.toFixed(2)}</span>
                                  <span style={{ fontSize: "9px", color: "var(--text-muted)", marginLeft: "4px" }}>Q/A</span>
                                </td>
                              )
                            })}
                          </tr>
                          {}
                          <tr>
                            <td className="compare-field-label">
                              <Cpu className="size-3" />
                              Model
                            </td>
                            {selectedItems.map((item, idx) => (
                              <td key={idx}>
                                <Badge variant="secondary" className="text-[9px]" style={{ height: "20px" }}>
                                  {MODEL_LABELS[item.model] || item.model}
                                </Badge>
                              </td>
                            ))}
                          </tr>
                          {}
                          {selectedItems.some((i) => i.mode) && (
                            <tr>
                              <td className="compare-field-label">
                                <AlertCircle className="size-3" />
                                Mode
                              </td>
                              {selectedItems.map((item, idx) => (
                                <td key={idx}>
                                  <span style={{ fontSize: "12px" }}>
                                    {item.mode === "auto" ? "Auto" : item.mode === "manual" ? "Manual" : "—"}
                                  </span>
                                </td>
                              ))}
                            </tr>
                          )}
                          {}
                          <tr>
                            <td className="compare-field-label">
                              <Clock className="size-3" />
                              Status
                            </td>
                            {selectedItems.map((item, idx) => (
                              <td key={idx}>
                                <Badge
                                  variant={item.status === "success" ? "green" : "red"}
                                  className="text-[8px]"
                                  style={{ height: "18px" }}
                                >
                                  {item.status === "success" ? "Completed" : "Failed"}
                                </Badge>
                              </td>
                            ))}
                          </tr>
                          {}
                          <tr>
                            <td className="compare-field-label">
                              <Calendar className="size-3" />
                              Date
                            </td>
                            {selectedItems.map((item, idx) => (
                              <td key={idx}>
                                <span style={{ fontSize: "11px", color: "var(--text-secondary)" }}>{formatDate(item.timestamp)}</span>
                              </td>
                            ))}
                          </tr>
                          {}
                          {(() => {
                            
                            const allKeys = new Set()
                            selectedItems.forEach((item) => {
                              if (item.input) Object.keys(item.input).forEach((k) => allKeys.add(k))
                            })
                            return Array.from(allKeys).map((key) => {
                              const Icon = FIELD_ICONS[key] || Leaf
                              const label = FIELD_LABELS[key] || key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
                              return (
                                <tr key={key}>
                                  <td className="compare-field-label">
                                    <Icon className="size-3" />
                                    {label}
                                  </td>
                                  {selectedItems.map((item, idx) => {
                                    const val = item.input?.[key]
                                    return (
                                      <td key={idx}>
                                        <span style={{ fontSize: "12px" }}>
                                          {val && val.toString().trim() !== "" ? val : "—"}
                                        </span>
                                      </td>
                                    )
                                  })}
                                </tr>
                              )
                            })
                          })()}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </ScrollArea>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}


function HistoryCard({ item }) {
  const modelColor = MODEL_COLORS[item.model] || "var(--text-secondary)"
  const modeLabel = item.mode === "auto" ? "Auto" : item.mode === "manual" ? "Manual" : null

  const inputFields = useMemo(() => {
    if (!item.input) return []
    return Object.entries(item.input)
      .filter(([, val]) => val && val.toString().trim() !== "" && val.toString().trim() !== "N/A" && val.toString().trim() !== "None")
      .map(([key, val]) => {
        const Icon = FIELD_ICONS[key] || Leaf
        const label = FIELD_LABELS[key] || key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
        return { key, label, value: val, Icon }
      })
  }, [item.input])

  return (
    <div className="aws-card" style={{ overflow: "hidden", transition: "all 200ms", cursor: "default" }}>
      <div style={{ padding: "14px 16px" }}>
        <div className="flex items-start justify-between gap-3" style={{ marginBottom: "12px" }}>
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="size-2.5 shrink-0 rounded-full" style={{ background: modelColor, boxShadow: `0 0 6px ${modelColor}40` }} />
            <Badge variant="secondary" className="text-[9px]" style={{ background: `${modelColor}18`, color: modelColor, border: `1px solid ${modelColor}30`, height: "20px", fontWeight: 600 }}>
              {MODEL_LABELS[item.model] || item.model}
            </Badge>
            {modeLabel && <Badge variant="outline" className="text-[8px]" style={{ height: "18px" }}>{modeLabel}</Badge>}
            {item.selected_model && item.model === "auto" && (
              <Badge variant="blue" className="text-[8px]" style={{ height: "18px" }}>
                {item.selected_model.replace(/_/g, " ")}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {item.timestamp && (
              <span style={{ fontSize: "10px", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "3px", whiteSpace: "nowrap" }}>
                <Clock className="size-2.5" />
                {formatDate(item.timestamp)}
              </span>
            )}
            <button type="button" className="btn btn-ghost btn-icon-sm" style={{ width: "24px", height: "24px" }} title="Download"
              onClick={() => {
                const data = JSON.stringify(item, null, 2)
                const blob = new Blob([data], { type: "application/json" })
                const url = URL.createObjectURL(blob)
                const a = document.createElement("a")
                a.href = url; a.download = `prediction-${item.timestamp || Date.now()}.json`; a.click()
                URL.revokeObjectURL(url)
              }}>
              <Download className="size-3" />
            </button>
          </div>
        </div>

        <div className="flex flex-wrap" style={{ gap: "12px" }}>
          <div className="flex-1" style={{ minWidth: "140px" }}>
            <div style={{ background: "var(--bg-deep)", borderRadius: "var(--radius-md)", padding: "10px 12px", border: "1px solid var(--border-subtle)" }}>
              <div style={{ fontSize: "9px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-muted)", marginBottom: "4px" }}>Yield</div>
              <div style={{ fontSize: "22px", fontWeight: 700, color: "var(--accent-gold)", lineHeight: 1.1, fontFamily: "var(--font-heading)" }}>
                {item.prediction !== undefined && item.prediction !== null ? Number(item.prediction).toFixed(2) : "—"}
              </div>
              <div style={{ fontSize: "10px", color: "var(--text-muted)", marginTop: "2px" }}>Quintal/Acre</div>
            </div>
          </div>
          {inputFields.length > 0 && (
            <div className="flex-1" style={{ minWidth: "140px" }}>
              <div className="flex flex-wrap gap-1.5">
                {inputFields.map(({ key, label, value, Icon }) => (
                  <div key={key} style={{ display: "inline-flex", alignItems: "center", gap: "4px", padding: "4px 8px", background: "var(--bg-deep)", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-subtle)", fontSize: "11px", color: "var(--text-secondary)", maxWidth: "100%" }}>
                    <Icon className="size-3 shrink-0" style={{ color: "var(--accent-gold)" }} />
                    <span style={{ fontWeight: 500, color: "var(--text-muted)", marginRight: "2px", whiteSpace: "nowrap" }}>{label}:</span>
                    <span className="truncate" style={{ color: "var(--text-primary)", maxWidth: "160px" }}>{value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {item.status && (
          <div className="flex items-center justify-between" style={{ marginTop: "12px", paddingTop: "10px", borderTop: "1px solid var(--border-subtle)" }}>
            <span style={{ fontSize: "10px", color: "var(--text-muted)" }}>Status</span>
            <Badge variant={item.status === "success" ? "green" : "red"} className="text-[9px]" style={{ height: "18px" }}>
              <span className="size-1.5 rounded-full" style={{ background: item.status === "success" ? "var(--accent-sage)" : "var(--accent-red)", marginRight: "4px", display: "inline-block" }} />
              {item.status === "success" ? "Completed" : "Failed"}
            </Badge>
          </div>
        )}
      </div>
    </div>
  )
}


function GridCard({ item, index, isSelected, onToggle, yieldMin, yieldMax }) {
  const modelColor = MODEL_COLORS[item.model] || "var(--text-secondary)"
  const val = Number(item.prediction) || 0
  const yieldColor = getYieldColor(val, yieldMin, yieldMax)
  const yieldLabel = getYieldLabel(val, yieldMin, yieldMax)
  const pct = yieldMax > yieldMin ? ((val - yieldMin) / (yieldMax - yieldMin)) * 100 : 50
  const modeLabel = item.mode === "auto" ? "Auto" : item.mode === "manual" ? "Manual" : null

  const inputTags = useMemo(() => {
    if (!item.input) return []
    return Object.entries(item.input)
      .filter(([, v]) => v && v.toString().trim() !== "" && v.toString().trim() !== "N/A")
      .slice(0, 3) 
      .map(([key, val]) => {
        const label = FIELD_LABELS[key] || key.replace(/_/g, " ")
        return { key, label, value: val }
      })
  }, [item.input])

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2, delay: Math.min(index * 0.025, 0.2) }}
      className="aws-card"
      style={{
        overflow: "hidden",
        cursor: "pointer",
        transition: "all 200ms",
        borderColor: isSelected ? "var(--accent-gold)" : undefined,
        boxShadow: isSelected ? "0 0 0 2px var(--accent-gold), var(--shadow-md)" : undefined,
        position: "relative",
      }}
      onClick={onToggle}
    >
      {}
      <div
        className="grid-select-btn"
        style={{
          position: "absolute",
          top: "8px",
          right: "8px",
          zIndex: 2,
          display: "grid",
          placeItems: "center",
          width: "24px",
          height: "24px",
          borderRadius: "var(--radius-sm)",
          background: isSelected ? "var(--accent-gold)" : "var(--bg-elevated)",
          color: isSelected ? "#1A1A1A" : "var(--text-muted)",
          transition: "all 150ms",
        }}
      >
        {isSelected ? <CheckSquare className="size-3.5" /> : <Square className="size-3.5" />}
      </div>

      <div style={{ padding: "14px" }}>
        {}
        <div className="flex items-center gap-2" style={{ marginBottom: "10px" }}>
          <span className="size-2 rounded-full" style={{ background: modelColor }} />
          <span className="truncate" style={{ fontSize: "10px", fontWeight: 600, color: modelColor, textTransform: "uppercase", letterSpacing: "0.04em" }}>
            {MODEL_LABELS[item.model] || item.model}
          </span>
          {modeLabel && (
            <Badge variant="outline" className="text-[7px]" style={{ height: "16px", padding: "0 4px" }}>
              {modeLabel}
            </Badge>
          )}
        </div>

        {}
        <div style={{ textAlign: "center", padding: "8px 0 6px" }}>
          <div style={{ fontSize: "32px", fontWeight: 700, fontFamily: "var(--font-heading)", color: yieldColor, lineHeight: 1, letterSpacing: "-0.02em" }}>
            {val.toFixed(1)}
          </div>
          <div style={{ fontSize: "9px", color: "var(--text-muted)", marginTop: "2px" }}>Quintal/Acre</div>
        </div>

        {}
        <div className="compare-bar-track" style={{ height: "4px", margin: "8px 0" }}>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${Math.max(pct, 4)}%` }}
            transition={{ duration: 0.5, delay: index * 0.03, ease: [0.25, 0.1, 0.25, 1] }}
            className="compare-bar-fill"
            style={{ background: yieldColor }}
          />
        </div>

        {}
        <div className="flex items-center justify-between" style={{ marginBottom: "10px" }}>
          <Badge
            variant="secondary"
            className="text-[7px]"
            style={{
              height: "18px",
              background: `${yieldColor}18`,
              color: yieldColor,
              border: `1px solid ${yieldColor}30`,
            }}
          >
            {yieldLabel}
          </Badge>
          <span style={{ fontSize: "9px", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "2px" }}>
            <Clock className="size-2.5" />
            {formatDate(item.timestamp)}
          </span>
        </div>

        {}
        {inputTags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {inputTags.map(({ key, label, value }) => (                <span
                key={key}
                style={{
                  fontSize: "8px",
                  padding: "2px 6px",
                  borderRadius: "var(--radius-xs)",
                  background: "var(--bg-deep)",
                  border: "1px solid var(--border-subtle)",
                  color: "var(--text-muted)",
                  maxWidth: "100%",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {label}: <strong className="truncate" style={{ color: "var(--text-secondary)", maxWidth: "80px" }}>{value}</strong>
              </span>
            ))}
            {Object.keys(item.input || {}).filter((k) => {
              const v = item.input[k]
              return v && v.toString().trim() !== "" && v.toString().trim() !== "N/A"
            }).length > 3 && (
              <span style={{ fontSize: "8px", color: "var(--text-muted)", padding: "2px 4px" }}>
                +{Object.keys(item.input).filter((k) => item.input[k]).length - 3}
              </span>
            )}
          </div>
        )}

        {}
        {item.status && (
          <div className="flex items-center justify-end" style={{ marginTop: "10px", paddingTop: "8px", borderTop: "1px solid var(--border-subtle)" }}>
            <Badge variant={item.status === "success" ? "green" : "red"} className="text-[7px]" style={{ height: "16px" }}>
              {item.status === "success" ? "Completed" : "Failed"}
            </Badge>
          </div>
        )}
      </div>
    </motion.div>
  )
}

export default HistoryPage

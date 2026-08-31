import { useMemo, useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Calendar,
  ChevronRight,
  Cpu,
  Crop,
  Droplets,
  FlaskConical,
  Loader2,
  Radar,
  Sparkles,
  Sprout,
  Tractor,
  Trees,
  Zap,
  Bot,
  Settings2,
  Bookmark,
  Beaker,
  Thermometer,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { predictAuto, predictEnsemble, predictWithModel, getPresets } from "@/lib/api"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import ModelResults from "./ModelResults"

const MODEL_OPTIONS = [
  { value: "auto", label: "Auto (Best: CaneSugar v6)" },
  { value: "cane_sugar", label: "🍬 CaneSugar v6 (Ensemble)" },
  { value: "catboost", label: "CatBoost" },
  { value: "xgboost", label: "XGBoost" },
  { value: "random_forest", label: "Random Forest" },
  { value: "ensemble", label: "Ensemble (All Models)" },
  { value: "linear_regression", label: "Linear Regression" },
  { value: "elastic_net", label: "ElasticNet" },
]

const DROPDOWN_OPTIONS = {
  Variety: ["", "Co-0238", "CoJ64", "Co98014", "CoC671", "Co86032", "Other"],
  Crop_Type: ["", "Kharif", "Rabi", "Spring", "Zaid", "Summer", "Late"],
  Soil_Type: ["", "Loamy", "Clay", "Sandy", "Alluvial", "Silt", "Peaty", "Saline", "Other"],
  Irrigation_Type: ["", "Drip", "Flood", "Sprinkler", "Furrow", "Basin", "Other"],
  Fertilizer_Type: ["", "Urea", "DAP", "NPK", "Organic", "Vermicompost", "Compost", "Other"],
}

const DEFAULT_PRESETS = [
  {
    id: "high_yield_co0238",
    name: "🌟 High-Yield Co-0238 (Drip)",
    description: "Optimal NPK, drip irrigation, loamy soil, early planting",
    data: {
      Planting_Date: "2024-01-15",
      Harvesting_Date: "2024-12-10",
      Variety: "Co-0238",
      Crop_Type: "Kharif",
      Soil_Type: "Loamy",
      Irrigation_Type: "Drip",
      Fertilizer_Type: "Urea",
      Nitrogen_kg_per_acre: "180",
      Phosphorus_kg_per_acre: "75",
      Potassium_kg_per_acre: "120",
      "Soil_Moisture_%": "32",
      Soil_pH: "7.2",
    }
  },
  {
    id: "rainfed_kharif",
    name: "🌧️ Rainfed Kharif (CoJ64)",
    description: "Monsoon rainfed crop on clay soil with moderate fertilizer",
    data: {
      Planting_Date: "2024-06-20",
      Harvesting_Date: "2025-04-15",
      Variety: "CoJ64",
      Crop_Type: "Kharif",
      Soil_Type: "Clay",
      Irrigation_Type: "Flood",
      Fertilizer_Type: "DAP",
      Nitrogen_kg_per_acre: "140",
      Phosphorus_kg_per_acre: "60",
      Potassium_kg_per_acre: "85",
      "Soil_Moisture_%": "24",
      Soil_pH: "7.5",
    }
  },
  {
    id: "water_stressed",
    name: "⚠️ Water-Stressed Field",
    description: "Low soil moisture, sandy soil, nitrogen deficiency",
    data: {
      Planting_Date: "2024-03-01",
      Harvesting_Date: "2024-11-15",
      Variety: "Co98014",
      Crop_Type: "Rabi",
      Soil_Type: "Sandy",
      Irrigation_Type: "Flood",
      Fertilizer_Type: "Organic",
      Nitrogen_kg_per_acre: "75",
      Phosphorus_kg_per_acre: "35",
      Potassium_kg_per_acre: "45",
      "Soil_Moisture_%": "12.5",
      Soil_pH: "8.1",
    }
  },
  {
    id: "ratoon_crop",
    name: "🌱 Ratoon High-Density",
    description: "High tillering ratoon crop on alluvial soil with NPK blend",
    data: {
      Planting_Date: "2024-02-10",
      Harvesting_Date: "2024-12-25",
      Variety: "Co-0238",
      Crop_Type: "Spring",
      Soil_Type: "Alluvial",
      Irrigation_Type: "Sprinkler",
      Fertilizer_Type: "NPK",
      Nitrogen_kg_per_acre: "195",
      Phosphorus_kg_per_acre: "80",
      Potassium_kg_per_acre: "130",
      "Soil_Moisture_%": "30",
      Soil_pH: "6.9",
    }
  }
]

const isDropdownField = (name) => Object.prototype.hasOwnProperty.call(DROPDOWN_OPTIONS, name)

const FIELD_META = {
  Planting_Date: { label: "Planting Date", icon: Calendar, placeholder: "YYYY-MM-DD", type: "date", required: true },
  Harvesting_Date: { label: "Harvesting Date", icon: Trees, placeholder: "YYYY-MM-DD", type: "date", required: false },
  Variety: { label: "Variety", icon: Sprout, placeholder: "Select variety", type: "select", required: false },
  Crop_Type: { label: "Crop Season", icon: Crop, placeholder: "Select season", type: "select", required: false },
  Soil_Type: { label: "Soil Type", icon: Tractor, placeholder: "Select soil type", type: "select", required: false },
  Irrigation_Type: { label: "Irrigation Method", icon: Droplets, placeholder: "Select method", type: "select", required: false },
  Fertilizer_Type: { label: "Fertilizer Type", icon: FlaskConical, placeholder: "Select fertilizer", type: "select", required: false },
  Nitrogen_kg_per_acre: { label: "Nitrogen (N) kg/acre", icon: Beaker, placeholder: "e.g. 160", type: "number", required: false },
  Potassium_kg_per_acre: { label: "Potassium (K) kg/acre", icon: Sprout, placeholder: "e.g. 100", type: "number", required: false },
  Phosphorus_kg_per_acre: { label: "Phosphorus (P) kg/acre", icon: Beaker, placeholder: "e.g. 60", type: "number", required: false },
  "Soil_Moisture_%": { label: "Soil Moisture %", icon: Droplets, placeholder: "e.g. 28", type: "number", required: false },
  Soil_pH: { label: "Soil pH (5.5 - 8.5)", icon: Thermometer, placeholder: "e.g. 7.2", type: "number", required: false },
}

const CORE_FIELDS = ["Planting_Date", "Harvesting_Date", "Variety", "Crop_Type"]
const ADVANCED_FIELDS = ["Soil_Type", "Irrigation_Type", "Fertilizer_Type", "Nitrogen_kg_per_acre", "Potassium_kg_per_acre", "Phosphorus_kg_per_acre", "Soil_Moisture_%", "Soil_pH"]

function GPSForm({ onSubmit, gpsData, availableModels, onPredictionResult = null, onEnsembleResult = null }) {
  const [formData, setFormData] = useState({
    Planting_Date: "2024-01-15",
    Harvesting_Date: "2024-11-30",
    Variety: "Co-0238",
    Crop_Type: "Kharif",
    Soil_Type: "Loamy",
    Irrigation_Type: "Drip",
    Fertilizer_Type: "Urea",
    Nitrogen_kg_per_acre: "160",
    Potassium_kg_per_acre: "100",
    Phosphorus_kg_per_acre: "60",
    "Soil_Moisture_%": "28",
    Soil_pH: "7.2",
  })

  const [presets, setPresets] = useState(DEFAULT_PRESETS)
  const [predictionResult, setPredictionResult] = useState(null)
  const [ensembleResult, setEnsembleResult] = useState(null)
  const [isPredicting, setIsPredicting] = useState(false)
  const [predictionMode, setPredictionMode] = useState("auto")
  const [selectedModel, setSelectedModel] = useState("cane_sugar")
  const [errors, setErrors] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Fetch presets from API if available
  useEffect(() => {
    async function loadPresets() {
      try {
        const res = await getPresets()
        if (res && res.presets && res.presets.length > 0) {
          setPresets(res.presets)
        }
      } catch {}
    }
    loadPresets()
  }, [])

  // Sync with prop
  useEffect(() => {
    if (gpsData) {
      setFormData((prev) => ({ ...prev, ...gpsData }))
    }
  }, [gpsData])

  const validateForm = () => {
    const newErrors = {}
    if (!formData.Planting_Date) {
      newErrors.Planting_Date = "Planting date is required"
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }))
    }
  }

  const handleApplyPreset = (preset) => {
    setFormData((prev) => ({ ...prev, ...preset.data }))
    onSubmit({ ...formData, ...preset.data })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validateForm()) return
    setIsSubmitting(true)
    await new Promise((resolve) => setTimeout(resolve, 200))
    onSubmit(formData)
    setIsSubmitting(false)
  }

  const buildFieldPayload = () => {
    const payload = {}
    for (const [k, v] of Object.entries(formData)) {
      if (v !== undefined && v !== null && String(v).trim() !== "") {
        payload[k] = v
      }
    }
    return payload
  }

  const handlePredictClick = async () => {
    if (isPredicting) return
    if (!validateForm()) return

    setIsPredicting(true)
    setPredictionResult(null)
    setEnsembleResult(null)

    const fieldData = buildFieldPayload()
    onSubmit(fieldData)

    try {
      if (predictionMode === "auto" || selectedModel === "auto") {
        const result = await predictAuto(fieldData)
        setPredictionResult(result)
        if (onPredictionResult) onPredictionResult(result)
      } else if (selectedModel === "ensemble") {
        const result = await predictEnsemble([fieldData])
        setEnsembleResult(result)
        if (onEnsembleResult) onEnsembleResult(result)
      } else {
        const result = await predictWithModel(selectedModel, fieldData)
        setPredictionResult(result)
        if (onPredictionResult) onPredictionResult(result)
      }
    } catch (err) {
      console.error("Prediction failed:", err)
      setPredictionResult({ error: err.message })
    } finally {
      setIsPredicting(false)
    }
  }

  const manualModels = useMemo(
    () => MODEL_OPTIONS.filter(
      (m) => m.value !== "auto" && (m.value === "ensemble" || m.value === "cane_sugar" || availableModels?.includes(m.value))
    ),
    [availableModels]
  )

  return (
    <div className="flex flex-col gap-4">
      {/* 1-Click Quick Presets */}
      <div className="field-section" style={{ background: "var(--bg-deep)", padding: "10px 12px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-subtle)" }}>
        <div className="flex items-center justify-between mb-2">
          <span style={{ fontSize: "11px", fontWeight: 600, color: "var(--accent-gold)", display: "flex", alignItems: "center", gap: "4px" }}>
            <Bookmark className="size-3" /> Quick Field Presets
          </span>
          <span style={{ fontSize: "9px", color: "var(--text-muted)" }}>1-Click Load</span>
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          {presets.slice(0, 4).map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => handleApplyPreset(p)}
              style={{
                textAlign: "left",
                padding: "6px 8px",
                borderRadius: "var(--radius-sm)",
                background: "var(--bg-surface)",
                border: "1px solid var(--border-subtle)",
                cursor: "pointer",
                transition: "all 150ms",
              }}
              className="hover:border-primary hover:bg-muted"
            >
              <div style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {p.name}
              </div>
              <div style={{ fontSize: "9px", color: "var(--text-muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {p.description}
              </div>
            </button>
          ))}
        </div>
      </div>

      <Tabs defaultValue="inputs" className="w-full">
        <TabsList className="w-full">
          <TabsTrigger value="inputs">
            <Calendar className="size-3" />
            Field Data
          </TabsTrigger>
          <TabsTrigger value="predict">
            <Radar className="size-3" />
            Predict & Engine
          </TabsTrigger>
        </TabsList>

        <TabsContent value="inputs">
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            {/* Core Fields */}
            {CORE_FIELDS.map((fieldName) => {
              const meta = FIELD_META[fieldName]
              const Icon = meta.icon
              const err = errors[fieldName]
              return (
                <div key={fieldName} className="field-section">
                  <div className="field-label-row">
                    <Icon className="size-3.5" style={{ color: "var(--text-secondary)" }} />
                    <label className="field-label">
                      {meta.label}
                      {meta.required && <span style={{ color: "var(--accent-red)", marginLeft: "2px" }}>*</span>}
                    </label>
                  </div>
                  {isDropdownField(fieldName) ? (
                    <select
                      name={fieldName}
                      value={formData[fieldName] || ""}
                      onChange={handleChange}
                      className="input"
                      style={{ height: "38px", width: "100%", fontSize: "13px", padding: "0 10px", cursor: "pointer" }}
                    >
                      {DROPDOWN_OPTIONS[fieldName].map((opt) => (
                        <option key={opt} value={opt}>
                          {opt || `— Select ${meta.label} —`}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <Input
                      name={fieldName}
                      type={meta.type}
                      value={formData[fieldName] || ""}
                      onChange={handleChange}
                      placeholder={meta.placeholder}
                      aria-invalid={Boolean(err)}
                      className={err ? "border-red" : ""}
                    />
                  )}
                  {err && (
                    <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} style={{ fontSize: "11px", color: "var(--accent-red)" }}>
                      {err}
                    </motion.div>
                  )}
                </div>
              )
            })}

            {/* Advanced Field Parameters Collapsible */}
            <details className="group" open style={{ marginTop: "4px" }}>
              <summary
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  fontSize: "12px",
                  fontWeight: 600,
                  color: "var(--accent-gold)",
                  cursor: "pointer",
                  padding: "6px 0",
                  borderBottom: "1px solid var(--border-subtle)",
                  marginBottom: "8px",
                }}
              >
                <ChevronRight className="size-3.5 transition-transform group-open:rotate-90" />
                Soil & Fertilizer Parameters ({ADVANCED_FIELDS.length})
              </summary>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {ADVANCED_FIELDS.map((fieldName) => {
                  const meta = FIELD_META[fieldName]
                  const Icon = meta.icon
                  return (
                    <div key={fieldName} className="field-section">
                      <div className="field-label-row">
                        <Icon className="size-3.5" style={{ color: "var(--text-secondary)" }} />
                        <label className="field-label">{meta.label}</label>
                      </div>
                      {isDropdownField(fieldName) ? (
                        <select
                          name={fieldName}
                          value={formData[fieldName] || ""}
                          onChange={handleChange}
                          className="input"
                          style={{ height: "38px", width: "100%", fontSize: "12px", padding: "0 8px", cursor: "pointer" }}
                        >
                          {DROPDOWN_OPTIONS[fieldName].map((opt) => (
                            <option key={opt} value={opt}>
                              {opt || `— Select ${meta.label} —`}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <Input
                          name={fieldName}
                          type={meta.type}
                          value={formData[fieldName] || ""}
                          onChange={handleChange}
                          placeholder={meta.placeholder}
                          style={{ height: "38px", fontSize: "12px" }}
                        />
                      )}
                    </div>
                  )
                })}
              </div>
            </details>

            <div className="flex gap-2 mt-2">
              <Button type="submit" variant="default" disabled={isSubmitting} className="flex-1">
                {isSubmitting ? (
                  <><Loader2 className="size-3.5 animate-spin" /> Saving...</>
                ) : (
                  <><Sparkles className="size-3.5" /> Save Parameters</>
                )}
              </Button>
              <Button type="button" variant="primary" onClick={handlePredictClick} disabled={isPredicting} className="flex-1 gap-1.5">
                {isPredicting ? <Loader2 className="size-3.5 animate-spin" /> : <Radar className="size-3.5" />}
                Predict Yield
              </Button>
            </div>
          </form>
        </TabsContent>

        <TabsContent value="predict">
          <div className="flex flex-col gap-3">
            {/* Prediction Mode Selector */}
            <div className="field-section">
              <div className="field-label-row">
                <Cpu className="size-3.5" style={{ color: "var(--text-secondary)" }} />
                <label className="field-label">Model Architecture Routing</label>
              </div>
              <div
                style={{
                  display: "flex",
                  gap: "4px",
                  padding: "3px",
                  borderRadius: "var(--radius-sm)",
                  background: "var(--bg-deep)",
                  border: "1px solid var(--border-subtle)",
                }}
              >
                <button
                  type="button"
                  onClick={() => { setPredictionMode("auto"); setSelectedModel("cane_sugar") }}
                  style={{
                    flex: 1,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "6px",
                    padding: "7px 12px",
                    borderRadius: "3px",
                    border: "none",
                    fontSize: "12px",
                    fontWeight: 600,
                    cursor: "pointer",
                    transition: "all 150ms",
                    background: predictionMode === "auto" ? "var(--accent-gold)" : "transparent",
                    color: predictionMode === "auto" ? "#1A1A1A" : "var(--text-secondary)",
                  }}
                >
                  <Bot className="size-3.5" />
                  Auto (CaneSugar v6)
                </button>
                <button
                  type="button"
                  onClick={() => { setPredictionMode("manual"); setSelectedModel(manualModels[0]?.value || "cane_sugar") }}
                  style={{
                    flex: 1,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "6px",
                    padding: "7px 12px",
                    borderRadius: "3px",
                    border: "none",
                    fontSize: "12px",
                    fontWeight: 600,
                    cursor: "pointer",
                    transition: "all 150ms",
                    background: predictionMode === "manual" ? "var(--accent-blue)" : "transparent",
                    color: predictionMode === "manual" ? "#fff" : "var(--text-secondary)",
                  }}
                >
                  <Settings2 className="size-3.5" />
                  Manual Mode
                </button>
              </div>
            </div>

            {/* Mode Description */}
            {predictionMode === "auto" && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "10px 12px",
                  borderRadius: "var(--radius-sm)",
                  border: "1px solid rgba(212, 168, 67, 0.25)",
                  background: "rgba(212, 168, 67, 0.08)",
                }}
              >
                <Sparkles className="size-4 shrink-0 text-amber-500" />
                <div style={{ fontSize: "12px", color: "var(--text-secondary)", lineHeight: 1.4 }}>
                  <strong style={{ color: "var(--accent-gold)" }}>CaneSugar v6 Flagship</strong>
                  {" "}— Custom 8-Fold Stacking Ensemble ($R^2$ 91.2%) combining CatBoost, XGBoost, LightGBM, ExtraTrees & Bayesian Ridge.
                </div>
              </motion.div>
            )}

            {predictionMode === "manual" && (
              <div className="field-section">
                <div className="field-label-row">
                  <Radar className="size-3.5" style={{ color: "var(--text-secondary)" }} />
                  <label className="field-label">Select Specific Model</label>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {manualModels.map((m) => (
                    <button
                      key={m.value}
                      type="button"
                      onClick={() => setSelectedModel(m.value)}
                      className={"model-chip" + (selectedModel === m.value ? " active" : "")}
                      style={{
                        borderColor: selectedModel === m.value ? "var(--accent-gold)" : undefined,
                        background: selectedModel === m.value ? "var(--accent-gold-bg)" : undefined,
                        color: selectedModel === m.value ? "var(--accent-gold)" : undefined,
                      }}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <Button
              type="button"
              variant="primary"
              onClick={handlePredictClick}
              disabled={isPredicting || !formData.Planting_Date}
              className="w-full gap-2 mt-2"
            >
              {isPredicting ? (
                <><Loader2 className="size-4 animate-spin" /> Computing Yield Forecast...</>
              ) : (
                <><Radar className="size-4" /> Run Prediction ({predictionMode === "auto" ? "CaneSugar v6" : selectedModel})</>
              )}
            </Button>

            {/* Results Output */}
            {predictionResult && !predictionResult.error && (
              <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="mt-2">
                <ModelResults result={predictionResult} />
              </motion.div>
            )}

            {ensembleResult && (
              <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="mt-2">
                <ModelResults result={ensembleResult} isEnsemble />
              </motion.div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default GPSForm

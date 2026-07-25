import { useMemo, useState } from "react"
import { motion } from "framer-motion"
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
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { predictAuto, predictEnsemble, predictWithModel } from "@/lib/api"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import ModelResults from "./ModelResults"

const MODEL_OPTIONS = [
  { value: "auto", label: "Auto (Best Model)" },
  { value: "cane_sugar", label: "🍬 CaneSugar" },
  { value: "catboost", label: "CatBoost" },
  { value: "xgboost", label: "XGBoost" },
  { value: "random_forest", label: "Random Forest" },
  { value: "linear_regression", label: "Linear Regression" },
  { value: "elastic_net", label: "ElasticNet" },
  { value: "ensemble", label: "Ensemble (All Models)" },
]

const FIELD_META = {
  Planting_Date: { label: "Planting Date", icon: Calendar, placeholder: "YYYY-MM-DD", type: "date", required: true },
  Harvesting_Date: { label: "Harvesting Date", icon: Trees, placeholder: "YYYY-MM-DD", type: "date", required: false },
  Variety: { label: "Variety", icon: Sprout, placeholder: "e.g., Co-0238", type: "text", required: false },
  Crop_Type: { label: "Crop Type / Season", icon: Crop, placeholder: "e.g., Kharif, Rabi, Spring", type: "text", required: false },
  Soil_Type: { label: "Soil Type", icon: Tractor, placeholder: "e.g., Loamy, Clay, Sandy", type: "text", required: false },
  Irrigation_Type: { label: "Irrigation Type", icon: Droplets, placeholder: "e.g., Drip, Flood, Sprinkler", type: "text", required: false },
  Fertilizer_Type: { label: "Fertilizer Type", icon: FlaskConical, placeholder: "e.g., Urea, DAP, Organic", type: "text", required: false },
}

const CORE_FIELDS = ["Planting_Date", "Harvesting_Date", "Variety", "Crop_Type"]
const ADVANCED_FIELDS = ["Soil_Type", "Irrigation_Type", "Fertilizer_Type"]

function GPSForm({ onSubmit, gpsData, availableModels }) {
  const [formData, setFormData] = useState({
    Planting_Date: '',
    Harvesting_Date: '',
    Variety: '',
    Crop_Type: '',
    Soil_Type: '',
    Irrigation_Type: '',
    Fertilizer_Type: '',
  })
  const [predictionResult, setPredictionResult] = useState(null)
  const [ensembleResult, setEnsembleResult] = useState(null)
  const [isPredicting, setIsPredicting] = useState(false)
  const [predictionMode, setPredictionMode] = useState("auto") // "auto" | "manual"
  const [selectedModel, setSelectedModel] = useState("auto")
  const [errors, setErrors] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  const validateForm = () => {
    const newErrors = {}
    if (!formData.Planting_Date) {
      newErrors.Planting_Date = 'Planting date is required'
    }
    if (formData.Harvesting_Date && !/^\d{4}-\d{2}-\d{2}$/.test(formData.Harvesting_Date)) {
      newErrors.Harvesting_Date = 'Use YYYY-MM-DD format'
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }))
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validateForm()) return
    setIsSubmitting(true)
    await new Promise(resolve => setTimeout(resolve, 300))
    onSubmit(formData)
    setIsSubmitting(false)
  }

  const buildFieldPayload = () => {
    const payload = {}
    for (const key of Object.keys(FIELD_META)) {
      if (formData[key] && formData[key].trim() !== '') {
        payload[key] = formData[key]
      }
    }
    return payload
  }

  const handlePredictClick = async () => {
    if (isPredicting) return
    setIsPredicting(true)
    setPredictionResult(null)
    setEnsembleResult(null)

    try {
      const fieldData = buildFieldPayload()

      if (selectedModel === "ensemble") {
        const result = await predictEnsemble([fieldData])
        setEnsembleResult(result)
      } else if (selectedModel === "auto") {
        const result = await predictAuto(fieldData)
        setPredictionResult({ ...result, model: result.best_model || result.model })
      } else {
        const result = await predictWithModel(selectedModel, fieldData)
        setPredictionResult(result)
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
      (m) => m.value !== "auto" && (m.value === "ensemble" || availableModels?.includes(m.value))
    ),
    [availableModels]
  )

  // bestModelName placeholder — the actual best model is determined at prediction time by the backend

  const savedSummary = gpsData ? [
    gpsData.Planting_Date && `Planted: ${gpsData.Planting_Date}`,
    gpsData.Variety && ` · ${gpsData.Variety}`,
    gpsData.Crop_Type && ` · ${gpsData.Crop_Type}`,
    gpsData.Soil_Type && ` · ${gpsData.Soil_Type}`,
  ].filter(Boolean).join('') : null

  return (
    <div className="flex flex-col gap-4">
      <Tabs defaultValue="inputs" className="w-full">
        <TabsList className="w-full">
          <TabsTrigger value="inputs">
            <Calendar className="size-3" />
            Inputs
          </TabsTrigger>
          <TabsTrigger value="predict">
            <Radar className="size-3" />
            Predict
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
                  <Input
                    name={fieldName}
                    type={meta.type}
                    value={formData[fieldName]}
                    onChange={handleChange}
                    placeholder={meta.placeholder}
                    aria-invalid={Boolean(err)}
                    className={err ? "border-red" : ""}
                  />
                  {err ? (
                    <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                      style={{ fontSize: "11px", color: "var(--accent-red)" }}>
                      {err}
                    </motion.div>
                  ) : null}
                </div>
              )
            })}

            {/* Advanced Fields */}
            <details className="group" style={{ marginTop: "4px" }}>
              <summary style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                fontSize: "11px",
                fontWeight: 500,
                fontFamily: "var(--font-body)",
                color: "var(--text-secondary)",
                cursor: "pointer",
                padding: "6px 0",
                transition: "color 120ms",
              }}>
                <ChevronRight className="size-3 transition-transform group-open:rotate-90" />
                Advanced options ({ADVANCED_FIELDS.length})
              </summary>
              <div className="mt-3 flex flex-col gap-3">
                {ADVANCED_FIELDS.map((fieldName) => {
                  const meta = FIELD_META[fieldName]
                  const Icon = meta.icon
                  return (
                    <div key={fieldName} className="field-section">
                      <div className="field-label-row">
                        <Icon className="size-3.5" style={{ color: "var(--text-secondary)" }} />
                        <label className="field-label">{meta.label}</label>
                      </div>
                      <Input
                        name={fieldName}
                        type={meta.type}
                        value={formData[fieldName]}
                        onChange={handleChange}
                        placeholder={meta.placeholder}
                      />
                    </div>
                  )
                })}
              </div>
            </details>

            <Button type="submit" variant="primary" disabled={isSubmitting} className="mt-1 w-full">
              {isSubmitting ? (
                <><Loader2 className="size-3.5 animate-spin" /> Saving...</>
              ) : (
                <><Sparkles className="size-3.5" /> Save field details</>
              )}
            </Button>

            {gpsData ? (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "8px 10px",
                  border: "1px solid transparent",
                  borderRadius: "2px",
                  background: "var(--accent-green-bg)",
                  fontSize: "11px",
                  color: "var(--accent-green)",
                }}
              >
                <Sparkles className="size-3 shrink-0" />
                <span className="truncate">{savedSummary}</span>
              </motion.div>
            ) : null}
          </form>
        </TabsContent>

        <TabsContent value="predict">
          <div className="flex flex-col gap-3">
            {/* Mode Toggle: Auto vs Manual */}
            <div className="field-section">
              <div className="field-label-row">
                <Cpu className="size-3.5" style={{ color: "var(--text-secondary)" }} />
                <label className="field-label">Prediction Mode</label>
              </div>
              <div style={{
                display: "flex",
                gap: "4px",
                padding: "3px",
                borderRadius: "4px",
                background: "var(--bg-deep)",
                border: "1px solid var(--border-subtle)",
              }}>
                <button
                  type="button"
                  onClick={() => { setPredictionMode("auto"); setSelectedModel("auto") }}
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
                    background: predictionMode === "auto" ? "var(--accent-green)" : "transparent",
                    color: predictionMode === "auto" ? "#08090A" : "var(--text-secondary)",
                  }}
                >
                  <Bot className="size-3.5" />
                  Auto Mode
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

            {/* Auto Mode: Show info */}
            {predictionMode === "auto" && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "10px 12px",
                  borderRadius: "2px",
                  border: "1px solid rgba(0, 214, 143, 0.2)",
                  background: "rgba(0, 214, 143, 0.06)",
                }}
              >
                <Zap className="size-4 shrink-0" style={{ color: "var(--accent-green)" }} />
                <div style={{ fontSize: "12px", color: "var(--text-secondary)", lineHeight: 1.4 }}>
                  <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>Auto Mode</span>
                  — The system will automatically select the best-performing model based on R² score
                </div>
              </motion.div>
            )}

            {/* Manual Mode: Model Selection */}
            {predictionMode === "manual" && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className="field-section"
              >
                <div className="field-label-row">
                  <Radar className="size-3.5" style={{ color: "var(--text-secondary)" }} />
                  <label className="field-label">Select Model</label>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {manualModels.map((m) => (
                    <button
                      key={m.value}
                      type="button"
                      onClick={() => setSelectedModel(m.value)}
                      className={"model-chip" + (selectedModel === m.value ? " active" : "")}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Predict Button */}
            <Button
              type="button"
              variant="primary"
              onClick={handlePredictClick}
              disabled={isPredicting || !formData.Planting_Date}
              className="w-full gap-2"
            >
              {isPredicting ? (
                <><Loader2 className="size-4 animate-spin" /> Predicting...</>
              ) : (
                <><Radar className="size-4" /> Run Prediction</>
              )}
            </Button>

            {/* Status */}
            <div style={{
              display: "flex",
              flexDirection: "column",
              gap: "6px",
              padding: "8px 10px",
              border: "1px solid var(--border-subtle)",
              borderRadius: "2px",
              background: "var(--bg-deep)",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "11px", color: "var(--text-secondary)" }}>
                <span className="size-1.5 rounded-full" style={{ background: "var(--accent-green)", flexShrink: 0 }} />
                <span>
                  {formData.Planting_Date
                    ? `Using ${Object.values(formData).filter(Boolean).length} field parameter(s)`
                    : "Enter planting date first"}
                </span>
              </div>
              {formData.Planting_Date && (
                <div className="flex flex-wrap gap-1">
                  {Object.entries(formData)
                    .filter(([, v]) => v && v.trim() !== '')
                    .map(([key]) => (
                      <Badge key={key} variant="secondary" className="text-[8px]" style={{ height: "16px" }}>
                        {FIELD_META[key]?.label || key}
                      </Badge>
                    ))}
                </div>
              )}
            </div>

            {/* Error */}
            {predictionResult?.error ? (
              <div style={{
                padding: "8px 10px",
                border: "1px solid transparent",
                borderRadius: "2px",
                background: "var(--accent-red-bg)",
                fontSize: "12px",
                color: "var(--accent-red)",
              }}>
                {predictionResult.error}
              </div>
            ) : null}

            {/* Results */}
            {predictionResult && !predictionResult.error ? (
              <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
                <ModelResults result={predictionResult} />
              </motion.div>
            ) : null}

            {ensembleResult ? (
              <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
                <ModelResults result={ensembleResult} isEnsemble />
              </motion.div>
            ) : null}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default GPSForm

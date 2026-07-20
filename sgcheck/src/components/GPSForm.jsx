import { useMemo, useState } from "react"
import { motion } from "framer-motion"
import {
  Calendar,
  ChevronRight,
  Crop,
  Droplets,
  FlaskConical,
  Loader2,
  Radar,
  Sparkles,
  Sprout,
  Tractor,
  Trees,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { predictAuto, predictEnsemble, predictWithModel } from "@/lib/api"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import ModelResults from "./ModelResults"

const MODEL_OPTIONS = [
  { value: "auto", label: "Auto (Best Model)" },
  { value: "catboost", label: "CatBoost" },
  { value: "xgboost", label: "XGBoost" },
  { value: "random_forest", label: "Random Forest" },
  { value: "linear_regression", label: "Linear Regression" },
  { value: "elastic_net", label: "ElasticNet" },
  { value: "ensemble", label: "Ensemble (All)" },
]

// Exact backend field names and descriptions
const FIELD_META = {
  Planting_Date: { label: "Planting Date", icon: Calendar, placeholder: "YYYY-MM-DD", type: "date", required: true },
  Harvesting_Date: { label: "Harvesting Date", icon: Trees, placeholder: "YYYY-MM-DD", type: "date", required: false },
  Variety: { label: "Variety", icon: Sprout, placeholder: "e.g., Co-0238", type: "text", required: false },
  Crop_Type: { label: "Crop Type / Season", icon: Crop, placeholder: "e.g., Kharif, Rabi, Spring, Autumn", type: "text", required: false },
  Soil_Type: { label: "Soil Type", icon: Tractor, placeholder: "e.g., Loamy, Clay, Sandy, Alluvial", type: "text", required: false },
  Irrigation_Type: { label: "Irrigation Type", icon: Droplets, placeholder: "e.g., Drip, Flood, Sprinkler", type: "text", required: false },
  Fertilizer_Type: { label: "Fertilizer Type", icon: FlaskConical, placeholder: "e.g., Urea, DAP, Organic, NPK", type: "text", required: false },
}

// Core fields that show by default
const CORE_FIELDS = ["Planting_Date", "Harvesting_Date", "Variety", "Crop_Type"]

// Advanced fields hidden behind collapse
const ADVANCED_FIELDS = ["Soil_Type", "Irrigation_Type", "Fertilizer_Type"]

function GPSForm({ onSubmit, gpsData, availableModels }) {
  // Initialize with backend-matching snake_case field names
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
  const [selectedModel, setSelectedModel] = useState("auto")
  const [errors, setErrors] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  const validateForm = () => {
    const newErrors = {}
    if (!formData.Planting_Date) {
      newErrors.Planting_Date = 'Planting date is required for predictions'
    }
    // Validate date format if provided
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
    // Pass data with exact backend field names
    onSubmit(formData)
    setIsSubmitting(false)
  }

  /** Build the payload with exact backend field names, omitting empty values */
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
      } else {
        const result = selectedModel === "auto"
          ? await predictAuto(fieldData)
          : await predictWithModel(selectedModel, fieldData)
        setPredictionResult(result)
      }
    } catch (err) {
      console.error("Prediction failed:", err)
      setPredictionResult({ error: err.message })
    } finally {
      setIsPredicting(false)
    }
  }

  const activeModels = useMemo(
    () => MODEL_OPTIONS.filter(
      (m) => m.value === "auto" || m.value === "ensemble" || availableModels?.includes(m.value)
    ),
    [availableModels]
  )

  // Summary of saved data for display
  const savedSummary = gpsData ? [
    gpsData.Planting_Date && `Planted: ${gpsData.Planting_Date}`,
    gpsData.Variety && ` · ${gpsData.Variety}`,
    gpsData.Crop_Type && ` · ${gpsData.Crop_Type}`,
    gpsData.Soil_Type && ` · ${gpsData.Soil_Type}`,
  ].filter(Boolean).join('') : null

  return (
    <div className="flex flex-col gap-4">
      <Tabs defaultValue="inputs" className="w-full">
        <TabsList className="w-full justify-start">
          <TabsTrigger value="inputs" style={{ flex: "1" }}>
            <Calendar className="size-3" />
            Inputs
          </TabsTrigger>
          <TabsTrigger value="predict" style={{ flex: "1" }}>
            <Radar className="size-3" />
            Predict
          </TabsTrigger>
        </TabsList>

        <TabsContent value="inputs" style={{ marginTop: "0.75rem" }}>
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            {/* Core Fields */}
            {CORE_FIELDS.map((fieldName) => {
              const meta = FIELD_META[fieldName]
              const Icon = meta.icon
              const err = errors[fieldName]
              return (
                <div key={fieldName} className="field-section">
                  <div className="field-label-row">
                    <Icon className="text-muted-foreground size-3.5" />
                    <label className="field-label">
                      {meta.label}
                      {meta.required && <span className="text-destructive ml-0.5">*</span>}
                    </label>
                  </div>
                  <Input
                    name={fieldName}
                    type={meta.type}
                    value={formData[fieldName]}
                    onChange={handleChange}
                    placeholder={meta.placeholder}
                    aria-invalid={Boolean(err)}
                    className={err ? "border-destructive" : ""}
                  />
                  {err ? (
                    <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="text-[11px] text-destructive">
                      {err}
                    </motion.div>
                  ) : null}
                </div>
              )
            })}

            {/* Advanced Fields (collapsible) */}
            <details className="group">
              <summary className="flex cursor-pointer items-center gap-1.5 text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors py-1">
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
                        <Icon className="text-muted-foreground size-3.5" />
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

            <Button type="submit" disabled={isSubmitting} className="mt-1 w-full">
              {isSubmitting ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Sparkles className="size-3.5" />
                  Save field details
                </>
              )}
            </Button>

            {gpsData ? (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-50/50 dark:bg-emerald-950/20 px-3 py-2 text-[11px] text-emerald-700 dark:text-emerald-300"
              >
                <Sparkles className="size-3 shrink-0" />
                <span className="truncate">{savedSummary}</span>
              </motion.div>
            ) : null}
          </form>
        </TabsContent>

        <TabsContent value="predict" style={{ marginTop: "0.75rem" }}>
          <div className="flex flex-col gap-3">
            {/* Model Selection */}
            <div className="field-section">
              <div className="field-label-row">
                <Radar className="text-muted-foreground size-3.5" />
                <label className="field-label">Select Model</label>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {activeModels.map((m) => (
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
            </div>

            {/* Predict Button */}
            <Button
              type="button"
              onClick={handlePredictClick}
              disabled={isPredicting || !formData.Planting_Date}
              className="w-full gap-2"
            >
              {isPredicting ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Predicting...
                </>
              ) : (
                <>
                  <Sparkles className="size-4" />
                  Run Prediction
                </>
              )}
            </Button>

            {/* Status / saved fields overview */}
            <div className="flex flex-col gap-1.5 rounded-lg border border-border/40 bg-muted/20 px-3 py-2">
              <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                <span className="size-1.5 rounded-full bg-emerald-500 shrink-0" />
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
                      <Badge key={key} variant="secondary" className="text-[8px] h-3.5">
                        {FIELD_META[key]?.label || key}
                      </Badge>
                    ))}
                </div>
              )}
            </div>

            {/* Error display */}
            {predictionResult?.error ? (
              <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                {predictionResult.error}
              </div>
            ) : null}

            {/* Results */}
            {predictionResult && !predictionResult.error ? (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                <ModelResults result={predictionResult} />
              </motion.div>
            ) : null}

            {ensembleResult ? (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
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

import { useMemo, useState } from "react"
import { motion } from "framer-motion"
import { Calendar, ChevronRight, Loader2, MapPin, Radar, Sparkles } from "lucide-react"
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

function GPSForm({ onSubmit, gpsData, availableModels }) {
  const [formData, setFormData] = useState({
    latitude: '',
    longitude: '',
    plantingDate: '',
    variety: '',
    soilType: '',
    irrigationType: '',
    fertilizerType: '',
  })
  const [predictionResult, setPredictionResult] = useState(null)
  const [ensembleResult, setEnsembleResult] = useState(null)
  const [isPredicting, setIsPredicting] = useState(false)
  const [selectedModel, setSelectedModel] = useState("auto")
  const [errors, setErrors] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  const validateForm = () => {
    const newErrors = {}
    if (!formData.latitude) {
      newErrors.latitude = 'Latitude is required'
    } else if (isNaN(formData.latitude) || formData.latitude < -90 || formData.latitude > 90) {
      newErrors.latitude = 'Valid latitude: -90 to 90'
    }
    if (!formData.longitude) {
      newErrors.longitude = 'Longitude is required'
    } else if (isNaN(formData.longitude) || formData.longitude < -180 || formData.longitude > 180) {
      newErrors.longitude = 'Valid longitude: -180 to 180'
    }
    if (!formData.plantingDate) {
      newErrors.plantingDate = 'Planting date is required'
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

  const handlePredictClick = async () => {
    if (isPredicting) return
    setIsPredicting(true)
    setPredictionResult(null)
    setEnsembleResult(null)

    try {
      const fieldData = {
        Planting_Date: formData.plantingDate || undefined,
        Variety: formData.variety || undefined,
        Soil_Type: formData.soilType || undefined,
        Irrigation_Type: formData.irrigationType || undefined,
        Fertilizer_Type: formData.fertilizerType || undefined,
      }

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

  const fields = useMemo(
    () => [
      { name: "latitude", label: "Latitude", placeholder: "e.g., 23.8859", icon: MapPin },
      { name: "longitude", label: "Longitude", placeholder: "e.g., 45.0792", icon: MapPin },
    ],
    []
  )

  const extraFields = useMemo(
    () => [
      { name: "variety", label: "Variety", placeholder: "e.g., Co-0238" },
      { name: "soilType", label: "Soil Type", placeholder: "e.g., Loamy, Clay" },
      { name: "irrigationType", label: "Irrigation Type", placeholder: "e.g., Drip, Flood" },
      { name: "fertilizerType", label: "Fertilizer Type", placeholder: "e.g., Urea, DAP" },
    ],
    []
  )

  const activeModels = useMemo(
    () => MODEL_OPTIONS.filter(
      (m) => m.value === "auto" || m.value === "ensemble" || availableModels?.includes(m.value)
    ),
    [availableModels]
  )

  return (
    <div className="flex flex-col gap-4">
      <Tabs defaultValue="inputs" className="w-full">
        <TabsList className="w-full justify-start">
          <TabsTrigger value="inputs" style={{ flex: "1" }}>
            <MapPin className="size-3" />
            Inputs
          </TabsTrigger>
          <TabsTrigger value="predict" style={{ flex: "1" }}>
            <Radar className="size-3" />
            Predict
          </TabsTrigger>
        </TabsList>

        <TabsContent value="inputs" style={{ marginTop: "0.75rem" }}>
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            {/* Coordinates */}
            <div className="grid grid-cols-1 gap-3">
              {fields.map((f) => {
                const Icon = f.icon
                const err = errors[f.name]
                return (
                  <div key={f.name} className="field-section">
                    <div className="field-label-row">
                      <Icon className="text-muted-foreground size-3.5" />
                      <label className="field-label">{f.label}</label>
                    </div>
                    <Input
                      name={f.name}
                      value={formData[f.name]}
                      onChange={handleChange}
                      placeholder={f.placeholder}
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

              {/* Planting Date */}
              <div className="field-section">
                <div className="field-label-row">
                  <Calendar className="text-muted-foreground size-3.5" />
                  <label className="field-label">Planting date</label>
                </div>
                <Input
                  type="date"
                  name="plantingDate"
                  value={formData.plantingDate}
                  onChange={handleChange}
                  aria-invalid={Boolean(errors.plantingDate)}
                  className={errors.plantingDate ? "border-destructive" : ""}
                />
                {errors.plantingDate ? (
                  <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="text-[11px] text-destructive">
                    {errors.plantingDate}
                  </motion.div>
                ) : null}
              </div>

              {/* Optional fields */}
              <details className="group">
                <summary className="flex cursor-pointer items-center gap-1.5 text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors">
                  <ChevronRight className="size-3 transition-transform group-open:rotate-90" />
                  Advanced options ({extraFields.length})
                </summary>
                <div className="mt-3 flex flex-col gap-3">
                  {extraFields.map((f) => (
                    <div key={f.name} className="field-section">
                      <div className="field-label-row">
                        <Radar className="text-muted-foreground size-3.5" />
                        <label className="field-label">{f.label}</label>
                      </div>
                      <Input
                        name={f.name}
                        value={formData[f.name]}
                        onChange={handleChange}
                        placeholder={f.placeholder}
                      />
                    </div>
                  ))}
                </div>
              </details>
            </div>

            <Button type="submit" disabled={isSubmitting} className="mt-1 w-full">
              {isSubmitting ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <MapPin className="size-3.5" />
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
                Saved: {gpsData.latitude}, {gpsData.longitude} · {gpsData.plantingDate}
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
              disabled={isPredicting || !formData.latitude || !formData.longitude || !formData.plantingDate}
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

            {/* Status Info */}
            <div className="flex items-center gap-2 rounded-lg border border-border/40 bg-muted/20 px-3 py-2 text-[11px] text-muted-foreground">
              <span className="size-1.5 rounded-full bg-emerald-500" />
              {gpsData
                ? `Using field context: ${gpsData.latitude}, ${gpsData.longitude}`
                : "Save field context first for best results"}
            </div>

            {/* Error display */}
            {predictionResult?.error ? (
              <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                {predictionResult.error}
              </div>
            ) : null}

            {/* Results */}
            {predictionResult && !predictionResult.error ? (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <ModelResults result={predictionResult} />
              </motion.div>
            ) : null}

            {ensembleResult ? (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
              >
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

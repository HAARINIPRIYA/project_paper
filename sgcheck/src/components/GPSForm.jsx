import { useMemo, useState } from "react"
import { motion } from "framer-motion"
import { Calendar, Loader2, MapPin, Radar } from "lucide-react"
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
      newErrors.latitude = 'Must be a valid latitude (-90 to 90)'
    }

    if (!formData.longitude) {
      newErrors.longitude = 'Longitude is required'
    } else if (isNaN(formData.longitude) || formData.longitude < -180 || formData.longitude > 180) {
      newErrors.longitude = 'Must be a valid longitude (-180 to 180)'
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
    await new Promise(resolve => setTimeout(resolve, 500))
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
      {
        name: "latitude",
        label: "Latitude",
        placeholder: "e.g., 23.8859",
        icon: MapPin,
      },
      {
        name: "longitude",
        label: "Longitude",
        placeholder: "e.g., 45.0792",
        icon: MapPin,
      },
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

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-sm font-medium tracking-tight">Field context</div>
          <div className="text-xs text-muted-foreground">
            Coordinates and planting date help the model reason about growth conditions.
          </div>
        </div>
        <Badge variant="secondary">Stage 2</Badge>
      </div>

      <Tabs defaultValue="inputs">
        <TabsList className="w-full justify-start">
          <TabsTrigger value="inputs" style={{ flex: "1" }}>Inputs</TabsTrigger>
          <TabsTrigger value="predict" style={{ flex: "1" }}>Predict</TabsTrigger>
        </TabsList>

        <TabsContent value="inputs" style={{ marginTop: "0.75rem" }}>
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <div className="grid grid-cols-1 gap-3">
              {fields.map((f) => {
                const Icon = f.icon
                const err = errors[f.name]
                return (
                  <div key={f.name} className="field-section">
                    <div className="field-label-row">
                      <Icon className="text-muted-foreground size-4" />
                      <label className="field-label">{f.label}</label>
                    </div>
                    <Input
                      name={f.name}
                      value={formData[f.name]}
                      onChange={handleChange}
                      placeholder={f.placeholder}
                      aria-invalid={Boolean(err)}
                      style={err ? { borderColor: "var(--destructive)", boxShadow: "0 0 0 3px color-mix(in srgb, var(--destructive) 20%, transparent)" } : {}}
                    />
                    {err ? (
                      <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} className="text-xs text-destructive">
                        {err}
                      </motion.div>
                    ) : null}
                  </div>
                )
              })}

              <div className="field-section">
                <div className="field-label-row">
                  <Calendar className="text-muted-foreground size-4" />
                  <label className="field-label">Planting date</label>
                </div>
                <Input
                  type="date"
                  name="plantingDate"
                  value={formData.plantingDate}
                  onChange={handleChange}
                  aria-invalid={Boolean(errors.plantingDate)}
                  style={errors.plantingDate ? { borderColor: "var(--destructive)", boxShadow: "0 0 0 3px color-mix(in srgb, var(--destructive) 20%, transparent)" } : {}}
                />
                {errors.plantingDate ? (
                  <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} className="text-xs text-destructive">
                    {errors.plantingDate}
                  </motion.div>
                ) : null}
              </div>

              {/* Optional advanced fields */}
              {extraFields.map((f) => (
                <div key={f.name} className="field-section">
                  <div className="field-label-row">
                    <Radar className="text-muted-foreground size-4" />
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

            <Button type="submit" disabled={isSubmitting} className="mt-1">
              {isSubmitting ? "Saving..." : "Save field details"}
            </Button>

            {gpsData ? (
              <div className="text-xs text-muted-foreground">
                Saved: {gpsData.latitude}, {gpsData.longitude} · {gpsData.plantingDate}
              </div>
            ) : null}
          </form>
        </TabsContent>

        <TabsContent value="predict" style={{ marginTop: "0.75rem" }}>
          <div className="flex flex-col gap-3">
            <div className="field-section">
              <div className="field-label-row">
                <Radar className="text-muted-foreground size-4" />
                <label className="field-label">Select model</label>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {MODEL_OPTIONS.filter(
                  (m) => m.value === "auto" || m.value === "ensemble" || availableModels?.includes(m.value)
                ).map((m) => (
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

            <Button
              type="button"
              onClick={handlePredictClick}
              disabled={isPredicting || !formData.latitude || !formData.longitude}
            >
              {isPredicting ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Predicting...
                </>
              ) : (
                <>
                  <Radar className="size-4" />
                  Run Prediction
                </>
              )}
            </Button>

            {predictionResult?.error ? (
              <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                {predictionResult.error}
              </div>
            ) : null}

            {predictionResult && !predictionResult.error ? (
              <ModelResults result={predictionResult} />
            ) : null}

            {ensembleResult ? (
              <ModelResults result={ensembleResult} isEnsemble />
            ) : null}

            {gpsData ? (
              <div className="rounded-lg border bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
                Using saved field context: {gpsData.latitude}, {gpsData.longitude}
              </div>
            ) : null}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default GPSForm

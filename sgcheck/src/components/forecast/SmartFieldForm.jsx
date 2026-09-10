import React, { useState, useMemo } from "react"
import {
  Calendar,
  Leaf,
  Sun,
  Sprout,
  Droplets,
  Beaker,
  Thermometer,
  Zap,
  ChevronRight,
  ChevronDown,
  RotateCcw,
  Sparkles,
  MapPin,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Globe,
  Clock,
  CloudRain,
} from "lucide-react"
import {
  parseLocationCoordinates,
  inferAgroDataFromCoordinates,
} from "@/services/agroInferenceService.js"
import { fetchWeatherAggregation } from "@/services/weatherApi.js"

const FIELD_DEFAULTS = {
  Planting_Date: "2024-01-15",
  Harvesting_Date: "2024-11-30",
  Variety: "Co 0238",
  Crop_Type: "Ratoon",
  Soil_Type: "Loamy",
  Irrigation_Type: "Drip",
  Fertilizer_Type: "Urea",
  Nitrogen_kg_per_acre: "140",
  Phosphorus_kg_per_acre: "60",
  Potassium_kg_per_acre: "80",
  "Soil_Moisture_%": "65",
  Soil_pH: "6.8",
  Cane_Height_cm: "285",
  Cane_Diameter_cm: "2.8",
  Brix_Value: "19.5",
}

export default function SmartFieldForm({
  formData = {},
  onChange,
  onSubmit,
  isPredicting = false,
  onReset,
}) {
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [locationInput, setLocationInput] = useState("")
  const [isInferring, setIsInferring] = useState(false)
  const [inferredInfo, setInferredInfo] = useState(null)
  const [inferError, setInferError] = useState(null)
  const [dateWeatherSuccess, setDateWeatherSuccess] = useState(null)

  const handleChange = (e) => {
    const { name, value } = e.target
    onChange && onChange(name, value)

    if (name === "Planting_Date" || name === "Harvesting_Date") {
      const pDate = name === "Planting_Date" ? value : values.Planting_Date
      const hDate = name === "Harvesting_Date" ? value : values.Harvesting_Date
      if (pDate && hDate) {
        const p = new Date(pDate)
        const h = new Date(hDate)
        const diff = Math.ceil((h - p) / (1000 * 60 * 60 * 24))
        if (!isNaN(diff) && diff > 0) {
          let estH = 285
          let estB = "19.5"
          if (diff < 90) {
            estH = Math.round(40 + diff * 0.8)
            estB = "10.5"
          } else if (diff < 180) {
            estH = Math.round(112 + (diff - 90) * 1.25)
            estB = (11.5 + ((diff - 90) / 90) * 3.5).toFixed(1)
          } else if (diff < 270) {
            estH = Math.round(225 + (diff - 180) * 0.6)
            estB = (15.0 + ((diff - 180) / 90) * 3.0).toFixed(1)
          } else if (diff <= 360) {
            estH = Math.round(279 + Math.min(diff - 270, 70) * 0.15)
            estB = (18.0 + ((diff - 270) / 90) * 2.2).toFixed(1)
          } else {
            estH = Math.min(345, Math.round(300 + Math.min(diff - 360, 360) * 0.08))
            estB = Math.min(23.0, +(20.2 + Math.min(diff - 360, 360) * 0.005).toFixed(1))
          }
          onChange && onChange("Cane_Height_cm", String(estH))
          onChange && onChange("Brix_Value", String(estB))

          if (inferredInfo) {
            const durationFactor = diff > 360
              ? Math.min(1.40, 1.0 + ((diff - 360) / 365) * 0.25)
              : diff < 240
              ? Math.max(0.80, diff / 300)
              : 1.0
            const baseN = Number(inferredInfo.inferredFields?.Nitrogen_kg_per_acre || 140)
            const baseP = Number(inferredInfo.inferredFields?.Phosphorus_kg_per_acre || 55)
            const baseK = Number(inferredInfo.inferredFields?.Potassium_kg_per_acre || 80)
            onChange && onChange("Nitrogen_kg_per_acre", String(Math.round(baseN * durationFactor)))
            onChange && onChange("Phosphorus_kg_per_acre", String(Math.round(baseP * durationFactor)))
            onChange && onChange("Potassium_kg_per_acre", String(Math.round(baseK * durationFactor)))
          }
        }
      }
    }
  }

  const values = { ...FIELD_DEFAULTS, ...formData }

  const cropDuration = useMemo(() => {
    if (!values.Planting_Date || !values.Harvesting_Date) return null
    const p = new Date(values.Planting_Date)
    const h = new Date(values.Harvesting_Date)
    const diff = Math.ceil((h - p) / (1000 * 60 * 60 * 24))
    if (isNaN(diff)) return null
    if (diff <= 0) return { days: diff, valid: false, stage: "Invalid Date Range", stageColor: "text-rose-400" }

    let stage = "Early Tillering"
    let stageColor = "text-amber-400"
    let estHeight = 120
    let estBrix = "12.0"

    if (diff < 90) {
      stage = "Germination & Tillering (0–90d)"
      stageColor = "text-emerald-400"
      estHeight = Math.round(40 + diff * 0.8)
      estBrix = "10.5"
    } else if (diff < 180) {
      stage = "Grand Vegetative Growth (90–180d)"
      stageColor = "text-sky-400"
      estHeight = Math.round(112 + (diff - 90) * 1.25)
      estBrix = (11.5 + ((diff - 90) / 90) * 3.5).toFixed(1)
    } else if (diff < 270) {
      stage = "Stalk Elongation & Internode (180–270d)"
      stageColor = "text-amber-400"
      estHeight = Math.round(225 + (diff - 180) * 0.6)
      estBrix = (15.0 + ((diff - 180) / 90) * 3.0).toFixed(1)
    } else if (diff <= 360) {
      stage = "Peak Sucrose Ripening (270–360d)"
      stageColor = "text-amber-300"
      estHeight = Math.round(279 + Math.min(diff - 270, 70) * 0.15)
      estBrix = (18.0 + ((diff - 270) / 90) * 2.2).toFixed(1)
    } else {
      stage = "Adsali / Extended Maturity (>360d)"
      stageColor = "text-purple-400"
      estHeight = Math.min(345, Math.round(300 + Math.min(diff - 360, 360) * 0.08))
      estBrix = Math.min(23.0, +(20.2 + Math.min(diff - 360, 360) * 0.005).toFixed(1))
    }

    return {
      days: diff,
      valid: true,
      stage,
      stageColor,
      estHeight,
      estBrix: Number(estBrix),
      nPerDay: (Number(values.Nitrogen_kg_per_acre || 140) / diff).toFixed(2),
      pPerDay: (Number(values.Phosphorus_kg_per_acre || 60) / diff).toFixed(2),
      kPerDay: (Number(values.Potassium_kg_per_acre || 80) / diff).toFixed(2),
    }
  }, [
    values.Planting_Date,
    values.Harvesting_Date,
    values.Nitrogen_kg_per_acre,
    values.Phosphorus_kg_per_acre,
    values.Potassium_kg_per_acre,
  ])

  const handleSyncDateRangeWeather = async () => {
    if (!cropDuration || !cropDuration.valid) return
    setIsInferring(true)
    setInferError(null)
    setDateWeatherSuccess(null)
    try {
      const lat = Number(formData.Latitude || 11.082861)
      const lon = Number(formData.Longitude || 77.991917)
      const agg = await fetchWeatherAggregation(lat, lon, values.Planting_Date, values.Harvesting_Date)
      if (agg && agg.canesugar_features) {
        const updates = {
          ...agg.canesugar_features,
          Cane_Height_cm: String(cropDuration.estHeight),
          Brix_Value: String(cropDuration.estBrix),
        }
        if (typeof onChange === "function") {
          onChange(updates)
          Object.entries(updates).forEach(([k, v]) => onChange(k, v))
        }
        setShowAdvanced(true)
        const rain = agg.canesugar_features.Rainfall_Total_mm !== undefined ? `${Number(agg.canesugar_features.Rainfall_Total_mm).toFixed(0)}mm rain` : ""
        const temp = agg.canesugar_features.Temp_Avg_C !== undefined ? `${Number(agg.canesugar_features.Temp_Avg_C).toFixed(1)}°C avg` : ""
        const rad = agg.canesugar_features.Solar_Radiation_MJ_m2_day !== undefined ? `${Number(agg.canesugar_features.Solar_Radiation_MJ_m2_day).toFixed(1)} MJ/m² radiation` : ""
        const details = [rain, temp, rad].filter(Boolean).join(", ")
        setDateWeatherSuccess(`Weather synced for ${agg.provenance?.data_points_used || cropDuration.days} days duration: ${details}.`)
      } else {
        setDateWeatherSuccess(`Date range of ${cropDuration.days} days verified and biometrics updated.`)
      }
    } catch (err) {
      setInferError(`Date range weather sync: ${err.message || "Failed to aggregate historical data"}`)
    } finally {
      setIsInferring(false)
    }
  }

  const handlePredictSubmit = (e) => {
    if (e) {
      e.preventDefault?.()
      e.stopPropagation?.()
    }
    if (isPredicting) return
    if (cropDuration && !cropDuration.valid) {
      setInferError("Please ensure Harvesting Date is later than Planting Date.")
      return
    }
    onSubmit && onSubmit(values)
  }

  const handleAutofillFromLocation = async (overrideInput) => {
    const query = (typeof overrideInput === "string" ? overrideInput : locationInput).trim()
    if (!query) return

    setInferError(null)
    setIsInferring(true)

    try {
      const coords = parseLocationCoordinates(query)
      if (!coords || !coords.latitude || !coords.longitude) {
        setInferError("Could not parse coordinates. Please enter DMS (e.g. 11°04'58.3\"N 77°59'30.9\"E), decimal (11.082861, 77.991917), or a Google Maps link.")
        setIsInferring(false)
        return
      }

      const result = await inferAgroDataFromCoordinates({
        latitude: coords.latitude,
        longitude: coords.longitude,
        plantingDate: values.Planting_Date,
        harvestDate: values.Harvesting_Date,
      })

      if (result.success) {
        setInferredInfo(result)
        if (typeof onChange === "function") {
          onChange(result.inferredFields)
          Object.entries(result.inferredFields).forEach(([k, v]) => {
            onChange(k, v)
          })
          if (result.weatherResult?.canesugar_features) {
            onChange(result.weatherResult.canesugar_features)
          }
        }
        setShowAdvanced(true)
      } else {
        setInferError("Could not infer agro data for these coordinates.")
      }
    } catch (err) {
      setInferError(`Inference failed: ${err.message || "Network or parsing error"}`)
    } finally {
      setIsInferring(false)
    }
  }

  return (
    <div className="glass-card p-6 bg-slate-900/70">
      <div className="flex items-center justify-between mb-5 pb-4 border-b border-slate-800">
        <div>
          <h2 className="font-heading text-lg font-bold text-white flex items-center gap-2">
            <Sprout className="size-5 text-amber-400" />
            <span>Field & Agronomic Parameters</span>
          </h2>
          <p className="text-xs text-slate-400">Enter field measurements or autofill from GPS coordinates</p>
        </div>

        <button
          type="button"
          onClick={() => {
            setInferredInfo(null)
            setInferError(null)
            setLocationInput("")
            onReset && onReset()
          }}
          className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1 transition-colors cursor-pointer"
          title="Reset to defaults"
        >
          <RotateCcw className="size-3.5" />
          <span>Reset</span>
        </button>
      </div>

      <div className="p-4 rounded-xl bg-slate-950/80 border border-amber-500/30 mb-6 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
          <div className="flex items-center gap-2">
            <div className="size-6 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
              <MapPin className="size-3.5" />
            </div>
            <span className="text-xs font-bold text-white uppercase tracking-wider">
              Autofill from Map Location / GPS Coordinates
            </span>
          </div>
          <span className="text-[11px] text-amber-400/90 font-medium">
            Auto-derives NPK, pH, moisture, &amp; biometrics
          </span>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-2">
          <div className="relative flex-1 w-full">
            <input
              type="text"
              value={locationInput}
              onChange={(e) => setLocationInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault()
                  handleAutofillFromLocation()
                }
              }}
              placeholder='e.g. 11°04&apos;58.3"N 77°59&apos;30.9"E or Google Maps link...'
              className="smart-input w-full pl-3 pr-8 text-xs font-mono"
              disabled={isInferring}
            />
            {locationInput && (
              <button
                type="button"
                onClick={() => setLocationInput("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 text-sm cursor-pointer"
              >
                &times;
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() => handleAutofillFromLocation()}
            disabled={isInferring || !locationInput.trim()}
            className="btn-modern-primary py-2 px-4 text-xs shrink-0 w-full sm:w-auto cursor-pointer"
          >
            {isInferring ? (
              <>
                <Loader2 className="size-3.5 animate-spin" />
                <span>Fetching Agro-Data...</span>
              </>
            ) : (
              <>
                <Sparkles className="size-3.5" />
                <span>Fetch Soil &amp; Agro-Data</span>
              </>
            )}
          </button>
        </div>

        <div className="flex items-center gap-2 flex-wrap pt-0.5">
          <span className="text-[10px] text-slate-400 font-semibold">Try sample:</span>
          <button
            type="button"
            onClick={() => {
              const val = `11°04'58.3"N 77°59'30.9"E`
              setLocationInput(val)
              handleAutofillFromLocation(val)
            }}
            className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-900 border border-slate-800 text-slate-300 hover:text-amber-300 hover:border-amber-500/40 transition-colors cursor-pointer"
          >
            11°04'58.3"N 77°59'30.9"E (Karur / Namakkal)
          </button>
          <button
            type="button"
            onClick={() => {
              const val = `16.6956, 74.2317`
              setLocationInput(val)
              handleAutofillFromLocation(val)
            }}
            className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-900 border border-slate-800 text-slate-300 hover:text-amber-300 hover:border-amber-500/40 transition-colors cursor-pointer"
          >
            16.6956, 74.2317 (Kolhapur)
          </button>
          <button
            type="button"
            onClick={() => {
              const val = `29.9500, 78.0800`
              setLocationInput(val)
              handleAutofillFromLocation(val)
            }}
            className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-900 border border-slate-800 text-slate-300 hover:text-amber-300 hover:border-amber-500/40 transition-colors cursor-pointer"
          >
            29.9500, 78.0800 (Haridwar)
          </button>
        </div>

        {inferredInfo && (
          <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-300 space-y-2 animate-fadeIn">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 font-semibold">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="size-4 text-emerald-400 shrink-0" />
                <span>
                  Resolved: {inferredInfo.location.placeName} ({inferredInfo.coordinates.latitude}&deg;N, {inferredInfo.coordinates.longitude}&deg;E)
                </span>
              </span>
              <span className="text-[10px] bg-emerald-500/20 px-2 py-0.5 rounded-full text-emerald-300 font-mono w-fit">
                {inferredInfo.location.elevation} Elev · {inferredInfo.location.zoneDescription}
              </span>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              <span className="font-semibold text-amber-300">Autofilled Parameters:</span> NPK ({inferredInfo.inferredFields.Nitrogen_kg_per_acre}N-{inferredInfo.inferredFields.Phosphorus_kg_per_acre}P-{inferredInfo.inferredFields.Potassium_kg_per_acre}K kg/ac) &middot; Soil pH {inferredInfo.inferredFields.Soil_pH} &middot; Soil Moisture {inferredInfo.inferredFields["Soil_Moisture_%"]}% &middot; Cane Height {inferredInfo.inferredFields.Cane_Height_cm}cm &middot; Brix {inferredInfo.inferredFields.Brix_Value}% &middot; Soil Type: {inferredInfo.inferredFields.Soil_Type}
            </p>
          </div>
        )}

        {inferError && (
          <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-xs text-rose-400 flex items-center gap-2">
            <AlertCircle className="size-4 shrink-0" />
            <span>{inferError}</span>
          </div>
        )}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          e.stopPropagation()
          handlePredictSubmit(e)
        }}
        className="space-y-6"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <Calendar className="size-3.5 text-amber-400" />
              <span>Planting Date</span>
            </label>
            <input
              type="date"
              name="Planting_Date"
              value={values.Planting_Date}
              onChange={handleChange}
              className="smart-input"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <Calendar className="size-3.5 text-amber-400" />
              <span>Harvesting Date</span>
            </label>
            <input
              type="date"
              name="Harvesting_Date"
              value={values.Harvesting_Date}
              onChange={handleChange}
              className="smart-input"
              required
            />
          </div>

          {cropDuration && (
            <div
              className={`md:col-span-2 p-3 rounded-xl border transition-all ${
                cropDuration.valid
                  ? "bg-slate-950/70 border-amber-500/25 space-y-2.5"
                  : "bg-rose-500/10 border-rose-500/30 text-rose-400 text-xs flex items-center gap-2"
              }`}
            >
              {!cropDuration.valid ? (
                <>
                  <AlertCircle className="size-4 shrink-0" />
                  <span>
                    Harvesting Date must be after Planting Date (Duration is {cropDuration.days} days).
                  </span>
                </>
              ) : (
                <>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Clock className="size-4 text-amber-400 shrink-0" />
                      <span className="text-xs font-bold text-white">
                        Crop Duration:{" "}
                        <span className="text-amber-400 font-mono font-extrabold">{cropDuration.days} Days</span>
                        <span className="text-slate-400 text-[11px] font-normal ml-1">
                          (~{(cropDuration.days / 30.4).toFixed(1)} Months)
                        </span>
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span
                        className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-slate-900 border border-slate-800 ${cropDuration.stageColor}`}
                      >
                        {cropDuration.stage}
                      </span>
                      <button
                        type="button"
                        onClick={handleSyncDateRangeWeather}
                        disabled={isInferring}
                        className="text-[11px] px-2.5 py-1 rounded-md bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 flex items-center gap-1.5 transition-all cursor-pointer"
                        title="Fetch historical meteorological archive for these exact dates"
                      >
                        {isInferring ? (
                          <>
                            <Loader2 className="size-3 animate-spin" />
                            <span>Aggregating Weather...</span>
                          </>
                        ) : (
                          <>
                            <CloudRain className="size-3 text-amber-400" />
                            <span>Sync Date-Range Weather</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-[11px] border-t border-slate-800/80">
                    <div className="p-2 rounded-lg bg-slate-900/80 border border-slate-800/80">
                      <span className="text-slate-400 block text-[10px] font-medium">Daily N-Demand</span>
                      <span className="font-bold text-white font-mono">
                        {cropDuration.nPerDay}{" "}
                        <span className="text-slate-500 text-[10px] font-normal">kg/ac/d</span>
                      </span>
                    </div>
                    <div className="p-2 rounded-lg bg-slate-900/80 border border-slate-800/80">
                      <span className="text-slate-400 block text-[10px] font-medium">Daily P-Demand</span>
                      <span className="font-bold text-white font-mono">
                        {cropDuration.pPerDay}{" "}
                        <span className="text-slate-500 text-[10px] font-normal">kg/ac/d</span>
                      </span>
                    </div>
                    <div className="p-2 rounded-lg bg-slate-900/80 border border-slate-800/80">
                      <span className="text-slate-400 block text-[10px] font-medium">Daily K-Demand</span>
                      <span className="font-bold text-white font-mono">
                        {cropDuration.kPerDay}{" "}
                        <span className="text-slate-500 text-[10px] font-normal">kg/ac/d</span>
                      </span>
                    </div>
                    <div className="p-2 rounded-lg bg-slate-900/80 border border-slate-800/80">
                      <span className="text-slate-400 block text-[10px] font-medium">Phenology Calc.</span>
                      <span className="font-bold text-emerald-400 font-mono">
                        ~{cropDuration.estHeight}cm / {cropDuration.estBrix}% Brix
                      </span>
                    </div>
                  </div>

                  {dateWeatherSuccess && (
                    <div className="text-[11px] text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1.5 rounded-md flex items-center gap-1.5 animate-fadeIn">
                      <CheckCircle2 className="size-3.5 text-emerald-400 shrink-0" />
                      <span>{dateWeatherSuccess}</span>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <Leaf className="size-3.5 text-emerald-400" />
              <span>Sugarcane Variety</span>
            </label>
            <select
              name="Variety"
              value={values.Variety}
              onChange={handleChange}
              className="smart-select"
            >
              <option value="Co 0238">Co 0238 (Karan 4 - Elite High Yield)</option>
              <option value="Co 86032">Co 86032 (Nayana - Drought Hardy)</option>
              <option value="CoM 0265">CoM 0265 (Phule 265 - High Tonnage)</option>
              <option value="CoLk 94184">CoLk 94184 (Birendra)</option>
              <option value="Co 11015">Co 11015 (Early Sweet)</option>
              <option value="Standard">Standard Commercial Cultivar</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <Sun className="size-3.5 text-amber-400" />
              <span>Crop Season / Type</span>
            </label>
            <select
              name="Crop_Type"
              value={values.Crop_Type}
              onChange={handleChange}
              className="smart-select"
            >
              <option value="Ratoon">Ratoon Cane (2nd Season Harvest)</option>
              <option value="Plant Cane">Plant Cane (Virgin Sowing)</option>
              <option value="Autumn">Autumn Planting</option>
              <option value="Spring">Spring Planting</option>
              <option value="Adsali">Adsali (16-18 Month Super Cane)</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <Sprout className="size-3.5 text-amber-500" />
              <span>Soil Classification</span>
            </label>
            <select
              name="Soil_Type"
              value={values.Soil_Type}
              onChange={handleChange}
              className="smart-select"
            >
              <option value="Loamy">Loamy (Optimal Drainage & Nutrients)</option>
              <option value="Clay">Clay (Heavy, High Water Retention)</option>
              <option value="Sandy Loam">Sandy Loam (Rapid Infiltration)</option>
              <option value="Alluvial">Alluvial (Fertile River Basin)</option>
              <option value="Black Cotton">Black Cotton (Vertisol High Clay)</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <Droplets className="size-3.5 text-sky-400" />
              <span>Irrigation Method</span>
            </label>
            <select
              name="Irrigation_Type"
              value={values.Irrigation_Type}
              onChange={handleChange}
              className="smart-select"
            >
              <option value="Drip">Drip Fertigation (Precision +20% Yield)</option>
              <option value="Furrow">Furrow Irrigation</option>
              <option value="Flood">Flood / Basin (Conventional)</option>
              <option value="Sprinkler">Overhead Sprinkler</option>
            </select>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-800">
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <Beaker className="size-4 text-amber-400" />
              <span>Nutrient Dosing &amp; Soil Chemistry</span>
            </div>
            {inferredInfo && (
              <span className="text-[10px] text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 rounded-full font-semibold flex items-center gap-1">
                <CheckCircle2 className="size-3" /> Auto-Calibrated from GPS
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 space-y-1">
              <span className="text-[11px] font-semibold text-slate-400 block">Nitrogen (N)</span>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  name="Nitrogen_kg_per_acre"
                  value={values.Nitrogen_kg_per_acre}
                  onChange={handleChange}
                  className="w-full bg-transparent font-heading text-base font-bold text-white outline-none"
                  min="20"
                  max="300"
                />
                <span className="text-[10px] text-slate-500 shrink-0">kg/ac</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 space-y-1">
              <span className="text-[11px] font-semibold text-slate-400 block">Phosphorus (P)</span>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  name="Phosphorus_kg_per_acre"
                  value={values.Phosphorus_kg_per_acre}
                  onChange={handleChange}
                  className="w-full bg-transparent font-heading text-base font-bold text-white outline-none"
                  min="10"
                  max="150"
                />
                <span className="text-[10px] text-slate-500 shrink-0">kg/ac</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 space-y-1">
              <span className="text-[11px] font-semibold text-slate-400 block">Potassium (K)</span>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  name="Potassium_kg_per_acre"
                  value={values.Potassium_kg_per_acre}
                  onChange={handleChange}
                  className="w-full bg-transparent font-heading text-base font-bold text-white outline-none"
                  min="20"
                  max="200"
                />
                <span className="text-[10px] text-slate-500 shrink-0">kg/ac</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 space-y-1">
              <span className="text-[11px] font-semibold text-slate-400 block">Soil Moisture</span>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  name="Soil_Moisture_%"
                  value={values["Soil_Moisture_%"]}
                  onChange={handleChange}
                  className="w-full bg-transparent font-heading text-base font-bold text-sky-400 outline-none"
                  min="10"
                  max="100"
                />
                <span className="text-[10px] text-slate-500 shrink-0">%</span>
              </div>
            </div>
          </div>
        </div>

        <div className="pt-2">
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center gap-2 text-xs font-semibold text-amber-400 hover:text-amber-300 transition-colors py-1 cursor-pointer flex-wrap"
          >
            <span className="flex items-center gap-1.5">
              {showAdvanced ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
              <span>{showAdvanced ? "Hide Advanced Biometrics (Stalk Geometry & Brix)" : "Show Advanced Biometrics (Stalk Geometry & Brix)"}</span>
            </span>
            {cropDuration && cropDuration.valid && (
              <span className="text-[10px] text-emerald-400 font-normal bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                Crop Age: {cropDuration.days} Days ({cropDuration.stage})
              </span>
            )}
          </button>

          {showAdvanced && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3 p-4 rounded-xl bg-slate-950/50 border border-slate-800">
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-300">Soil pH</label>
                <input
                  type="number"
                  step="0.1"
                  name="Soil_pH"
                  value={values.Soil_pH}
                  onChange={handleChange}
                  className="smart-input text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-300">Cane Height (cm)</label>
                <input
                  type="number"
                  name="Cane_Height_cm"
                  value={values.Cane_Height_cm}
                  onChange={handleChange}
                  className="smart-input text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-300">Sucrose Brix (%)</label>
                <input
                  type="number"
                  step="0.1"
                  name="Brix_Value"
                  value={values.Brix_Value}
                  onChange={handleChange}
                  className="smart-input text-xs"
                />
              </div>
            </div>
          )}
        </div>

        <div className="pt-2">
          <button
            type="button"
            onClick={handlePredictSubmit}
            disabled={isPredicting}
            className="btn-modern-primary w-full shadow-lg shadow-amber-500/25 cursor-pointer font-heading tracking-wide text-base"
          >
            <Sparkles className="size-5" />
            <span>{isPredicting ? "Computing Stacking Ensemble Prediction..." : "Forecast Harvest Yield Now"}</span>
          </button>
        </div>
      </form>
    </div>
  )
}

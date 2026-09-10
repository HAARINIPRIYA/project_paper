import React from "react"
import LocationSelector from "@/components/location/LocationSelector"
import { MapPin, CheckCircle2, CloudRain, Sparkles } from "lucide-react"

export default function LocationPage({
  formData,
  onWeatherDataReady,
  weatherLinked = false,
}) {
  return (
    <div className="space-y-6 w-full pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-800/80">
        <div>
          <h1 className="font-heading text-2xl font-bold text-white flex items-center gap-2.5">
            <MapPin className="size-6 text-amber-400" />
            <span>Field Geolocation & Agro-Meteorology</span>
          </h1>
          <p className="text-xs text-slate-400">
            Pinpoint your sugarcane plot on the interactive map to automatically fetch historical weather, rainfall, and evapotranspiration data.
          </p>
        </div>

        {weatherLinked && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
            <CheckCircle2 className="size-3.5" />
            <span>Agro-Weather Data Linked</span>
          </div>
        )}
      </div>

      {/* Map & Geolocation Studio */}
      <div className="glass-card p-6 bg-slate-900/70">
        <LocationSelector
          onWeatherDataReady={onWeatherDataReady}
          plantingDate={formData?.Planting_Date || "2024-01-15"}
          harvestDate={formData?.Harvesting_Date || "2024-11-30"}
        />
      </div>
    </div>
  )
}

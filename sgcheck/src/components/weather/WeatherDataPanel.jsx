import { Loader2, CheckCircle2, CloudSun, Info } from "lucide-react"
import EnvironmentalDataCard from "./EnvironmentalDataCard"
import { WEATHER_FEATURE_LABELS } from "@/services/weatherApi"

function WeatherDataPanel({ weatherData, loading, error, availableFeatures = [], missingFeatures = [] }) {
  if (loading) {
    return (
      <div
        style={{
          padding: "16px",
          borderRadius: "var(--radius-sm)",
          background: "var(--bg-deep)",
          border: "1px solid var(--border-subtle)",
          display: "flex",
          alignItems: "center",
          gap: "10px",
        }}
      >
        <Loader2 className="size-4 animate-spin" style={{ color: "var(--accent-gold)" }} />
        <div>
          <div style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-primary)" }}>
            Fetching environmental conditions...
          </div>
          <div style={{ fontSize: "10px", color: "var(--text-muted)", marginTop: "2px" }}>
            Retrieving weather data from Open-Meteo
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div
        style={{
          padding: "12px 14px",
          borderRadius: "var(--radius-sm)",
          background: "rgba(255, 107, 107, 0.08)",
          border: "1px solid rgba(255, 107, 107, 0.2)",
          fontSize: "12px",
          color: "var(--accent-red)",
        }}
      >
        {error}
      </div>
    )
  }

  if (!weatherData && availableFeatures.length === 0) {
    return null
  }

  const allFeatureKeys = [
    "Rainfall_Total_mm",
    "Rainfall_Seasonal_mm",
    "Temp_Avg_C",
    "Temp_Max_C",
    "Temp_Min_C",
    "Humidity_%",
    "Solar_Radiation_MJ_m2_day",
    "Wind_Speed_kmph",
    "Evapotranspiration_mm_day",
    "Dew_Point_C",
    "Heat_Stress_Days",
    "Frost_Days",
    "Soil_Moisture_%",
    "Altitude_m",
  ]

  const count = availableFeatures.filter((f) => allFeatureKeys.includes(f)).length

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <CloudSun className="size-3.5" style={{ color: "var(--accent-gold)" }} />
          <span style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-secondary)" }}>
            Environmental Data
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          {count > 0 && (
            <span
              style={{
                fontSize: "9px",
                fontWeight: 600,
                color: "var(--accent-green)",
                padding: "2px 6px",
                borderRadius: "3px",
                background: "rgba(45, 106, 79, 0.15)",
              }}
            >
              <CheckCircle2 className="size-2.5" style={{ display: "inline", verticalAlign: "-1px", marginRight: "3px" }} />
              {count} auto
            </span>
          )}
          <span style={{ fontSize: "9px", color: "var(--text-muted)" }}>Open-Meteo</span>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "6px" }}>
        {allFeatureKeys.map((key) => {
          const meta = WEATHER_FEATURE_LABELS[key]
          if (!meta) return null

          const isAvailable = availableFeatures.includes(key)
          const value = weatherData?.[key] ?? weatherData?.canesugar_features?.[key]

          return (
            <EnvironmentalDataCard
              key={key}
              label={meta.label}
              value={value}
              unit={meta.unit}
              icon={meta.icon}
              isAvailable={isAvailable}
            />
          )
        })}
      </div>

      {weatherData?.soil_temperature_c != null && weatherData.soil_temperature_c > 0 && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            padding: "6px 10px",
            borderRadius: "var(--radius-sm)",
            background: "var(--bg-deep)",
            border: "1px solid var(--border-subtle)",
            fontSize: "10px",
            color: "var(--text-muted)",
          }}
        >
          <Info className="size-3 shrink-0" style={{ color: "var(--accent-blue)" }} />
          <span>
            Soil temperature: <strong style={{ color: "var(--text-secondary)" }}>{Number(weatherData.soil_temperature_c).toFixed(1)}\u00B0C</strong>
            {" "} (informational \u2014 kept separate from atmospheric temperature)
          </span>
        </div>
      )}

      {missingFeatures.length > 0 && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            padding: "6px 10px",
            borderRadius: "var(--radius-sm)",
            background: "rgba(255, 181, 71, 0.06)",
            border: "1px solid rgba(255, 181, 71, 0.15)",
            fontSize: "10px",
            color: "var(--text-muted)",
          }}
        >
          <Info className="size-3 shrink-0" style={{ color: "var(--accent-orange)" }} />
          <span>
            Some environmental data unavailable from historical archive. The model will use trained defaults.
          </span>
        </div>
      )}
    </div>
  )
}

export default WeatherDataPanel

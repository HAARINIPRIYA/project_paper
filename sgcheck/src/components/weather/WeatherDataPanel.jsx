import { Loader2, CheckCircle2, CloudSun, Info, AlertTriangle } from "lucide-react"
import EnvironmentalDataCard from "./EnvironmentalDataCard"
import { WEATHER_FEATURE_LABELS } from "@/services/weatherApi"

function WeatherDataPanel({ weatherData, loading, error, availableFeatures = [], missingFeatures = [], featureStatus = {}, compact = false }) {
  if (loading) {
    return (
      <div
        style={{
          padding: compact ? "10px 12px" : "16px",
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
          <div style={{ fontSize: compact ? "11px" : "12px", fontWeight: 600, color: "var(--text-primary)" }}>
            Fetching environmental conditions...
          </div>
          {!compact && <div style={{ fontSize: "10px", color: "var(--text-muted)", marginTop: "2px" }}>
            Retrieving historical weather data from Open-Meteo
          </div>}
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

  const autoCount = allFeatureKeys.filter((k) => {
    const s = featureStatus[k]
    return s && (s.status === "AUTO_FETCHED" || s.status === "DERIVED")
  }).length

  const derivedCount = allFeatureKeys.filter((k) => featureStatus[k]?.status === "DERIVED").length
  const manualRequired = allFeatureKeys.filter((k) => featureStatus[k]?.status === "MANUAL_REQUIRED").length
  const unavailableCount = allFeatureKeys.filter((k) => featureStatus[k]?.status === "UNAVAILABLE").length

  const provenance = weatherData?.provenance || weatherData?.canesugar_features?._provenance

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <CloudSun className="size-3.5" style={{ color: "var(--accent-gold)" }} />
          <span style={{ fontSize: compact ? "10px" : "11px", fontWeight: 600, color: "var(--text-secondary)" }}>
            Environmental Data
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          {autoCount > 0 && (
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
              {autoCount} auto
            </span>
          )}
          {derivedCount > 0 && (
            <span
              style={{
                fontSize: "9px",
                fontWeight: 600,
                color: "#7C5CFC",
                padding: "2px 6px",
                borderRadius: "3px",
                background: "rgba(124, 92, 252, 0.12)",
              }}
            >
              {derivedCount} derived
            </span>
          )}
          <span style={{ fontSize: "9px", color: "var(--text-muted)" }}>Open-Meteo</span>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: compact ? "4px" : "6px" }}>
        {allFeatureKeys.map((key) => {
          const meta = WEATHER_FEATURE_LABELS[key]
          if (!meta) return null

          const featureStatusEntry = featureStatus[key] || {}
          const status = featureStatusEntry.status || (availableFeatures.includes(key) ? "AUTO_FETCHED" : "UNAVAILABLE")
          const sourceVariable = featureStatusEntry.source_variable || null

          let value = weatherData?.canesugar_features?.[key] ?? weatherData?.[key]
          if (value === 0 && status === "UNAVAILABLE") value = null

          return (
            <EnvironmentalDataCard
              key={key}
              label={meta.label}
              value={value}
              unit={meta.unit}
              icon={meta.icon}
              status={status}
              sourceVariable={sourceVariable}
              compact={compact}
            />
          )
        })}
      </div>

      {weatherData?.canesugar_features?.soil_temperature_c != null && weatherData.canesugar_features.soil_temperature_c > 0 && (
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
            Soil temperature: <strong style={{ color: "var(--text-secondary)" }}>{Number(weatherData.canesugar_features.soil_temperature_c).toFixed(1)}&deg;C</strong>
            {" "}(informational &mdash; kept separate from atmospheric temperature)
          </span>
        </div>
      )}

      {manualRequired > 0 && !compact && (
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: "6px",
            padding: "8px 10px",
            borderRadius: "var(--radius-sm)",
            background: "rgba(255, 181, 71, 0.06)",
            border: "1px solid rgba(255, 181, 71, 0.15)",
            fontSize: "10px",
            color: "var(--text-secondary)",
            lineHeight: 1.5,
          }}
        >
          <AlertTriangle className="size-3 shrink-0" style={{ color: "var(--accent-orange)", marginTop: "1px" }} />
          <span>
            <strong style={{ color: "var(--accent-orange)" }}>{manualRequired} field(s) require manual input</strong>
            {" "}&mdash; not available from historical weather archive. Please provide values in the form below.
          </span>
        </div>
      )}

      {unavailableCount > 0 && manualRequired === 0 && !compact && (
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
          <Info className="size-3 shrink-0" style={{ color: "var(--text-muted)" }} />
          <span>
            {unavailableCount} optional environmental field(s) unavailable from archive.
          </span>
        </div>
      )}

      {!compact && provenance && provenance.data_points_used > 0 && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            padding: "5px 10px",
            borderRadius: "var(--radius-sm)",
            background: "var(--bg-deep)",
            border: "1px solid var(--border-subtle)",
            fontSize: "9px",
            color: "var(--text-muted)",
          }}
        >
          <Info className="size-2.5 shrink-0" style={{ color: "var(--text-muted)" }} />
          <span>
            Period: {provenance.planting_date} to {provenance.harvest_date}
            {" "}&middot; {provenance.data_points_used} days used
            {" "}&middot; Source: {provenance.source}
          </span>
        </div>
      )}
    </div>
  )
}

export default WeatherDataPanel

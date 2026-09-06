import {
  CloudRain,
  Thermometer,
  ThermometerSun,
  ThermometerSnowflake,
  Droplets,
  Sun,
  Wind,
  Cloud,
  Flame,
  Snowflake,
  Mountain,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react"

const ICON_MAP = {
  CloudRain,
  Thermometer,
  ThermometerSun,
  ThermometerSnowflake,
  Droplets,
  Sun,
  Wind,
  Cloud,
  Flame,
  Snowflake,
  Mountain,
}

function EnvironmentalDataCard({ label, value, unit, icon, isAvailable, source = "Open-Meteo" }) {
  const IconComponent = ICON_MAP[icon] || Droplets

  return (
    <div
      style={{
        padding: "10px 12px",
        borderRadius: "var(--radius-sm)",
        background: isAvailable ? "rgba(212, 168, 67, 0.04)" : "var(--bg-deep)",
        border: `1px solid ${isAvailable ? "rgba(212, 168, 67, 0.15)" : "var(--border-subtle)"}`,
        transition: "all 200ms",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
        <IconComponent
          className="size-3"
          style={{ color: isAvailable ? "var(--accent-gold)" : "var(--text-muted)" }}
        />
        <span
          style={{
            fontSize: "10px",
            fontWeight: 600,
            color: "var(--text-muted)",
            textTransform: "uppercase",
            letterSpacing: "0.04em",
          }}
        >
          {label}
        </span>
      </div>

      <div
        style={{
          fontSize: "16px",
          fontWeight: 700,
          fontFamily: "var(--font-heading)",
          color: isAvailable ? "var(--text-primary)" : "var(--text-muted)",
          marginBottom: "3px",
        }}
      >
        {isAvailable && value != null ? (
          <>
            {Number.isInteger(value) ? value : Number(value).toFixed(1)}
            <span style={{ fontSize: "11px", fontWeight: 500, marginLeft: "3px", color: "var(--text-secondary)" }}>
              {unit}
            </span>
          </>
        ) : (
          <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>\u2014</span>
        )}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
        {isAvailable ? (
          <>
            <CheckCircle2 className="size-2.5" style={{ color: "var(--accent-green)" }} />
            <span style={{ fontSize: "9px", color: "var(--accent-green)" }}>Auto-fetched</span>
          </>
        ) : (
          <>
            <AlertTriangle className="size-2.5" style={{ color: "var(--accent-orange)" }} />
            <span style={{ fontSize: "9px", color: "var(--accent-orange)" }}>Enter manually</span>
          </>
        )}
      </div>
    </div>
  )
}

export default EnvironmentalDataCard

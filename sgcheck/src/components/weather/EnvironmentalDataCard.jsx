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
  ArrowUpRight,
  XCircle,
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

const STATUS_CONFIG = {
  AUTO_FETCHED: {
    color: "var(--accent-green)",
    bg: "rgba(45, 106, 79, 0.1)",
    border: "rgba(45, 106, 79, 0.25)",
    icon: CheckCircle2,
    label: "Auto-fetched",
  },
  DERIVED: {
    color: "#7C5CFC",
    bg: "rgba(124, 92, 252, 0.08)",
    border: "rgba(124, 92, 252, 0.2)",
    icon: ArrowUpRight,
    label: "Derived",
  },
  MANUAL_REQUIRED: {
    color: "var(--accent-orange)",
    bg: "rgba(255, 181, 71, 0.08)",
    border: "rgba(255, 181, 71, 0.2)",
    icon: AlertTriangle,
    label: "Manual required",
  },
  UNAVAILABLE: {
    color: "var(--text-muted)",
    bg: "var(--bg-deep)",
    border: "var(--border-subtle)",
    icon: XCircle,
    label: "Unavailable",
  },
}

function EnvironmentalDataCard({ label, value, unit, icon, status = "UNAVAILABLE", sourceVariable, compact = false }) {
  const IconComponent = ICON_MAP[icon] || Droplets
  const statusInfo = STATUS_CONFIG[status] || STATUS_CONFIG.UNAVAILABLE
  const StatusIcon = statusInfo.icon
  const hasValue = value != null && value !== 0

  return (
    <div
      style={{
        padding: compact ? "6px 8px" : "10px 12px",
        borderRadius: "var(--radius-sm)",
        background: hasValue ? statusInfo.bg : "var(--bg-deep)",
        border: `1px solid ${hasValue ? statusInfo.border : "var(--border-subtle)"}`,
        transition: "all 200ms",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
        <IconComponent
          className="size-3"
          style={{ color: hasValue ? statusInfo.color : "var(--text-muted)" }}
        />
        <span
          style={{
            fontSize: compact ? "8px" : "10px",
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
          fontSize: compact ? "13px" : "16px",
          fontWeight: 700,
          fontFamily: "var(--font-heading)",
          color: hasValue ? "var(--text-primary)" : "var(--text-muted)",
          marginBottom: "3px",
        }}
      >
        {hasValue ? (
          <>
            {Number.isInteger(value) ? value : Number(value).toFixed(1)}
            <span style={{ fontSize: compact ? "9px" : "11px", fontWeight: 500, marginLeft: "3px", color: "var(--text-secondary)" }}>
              {unit}
            </span>
          </>
        ) : (
          <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>&mdash;</span>
        )}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
        <StatusIcon className="size-2.5" style={{ color: statusInfo.color }} />
        <span style={{ fontSize: compact ? "7px" : "9px", color: statusInfo.color }}>
          {statusInfo.label}
        </span>
        {sourceVariable && status === "DERIVED" && (
          <span style={{ fontSize: "8px", color: "var(--text-muted)", marginLeft: "2px" }}>
            ({sourceVariable})
          </span>
        )}
      </div>
    </div>
  )
}

export default EnvironmentalDataCard

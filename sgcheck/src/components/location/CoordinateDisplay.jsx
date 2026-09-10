import { Crosshair } from "lucide-react"

function CoordinateDisplay({ latitude, longitude, compact = false }) {
  const hasCoords = latitude != null && longitude != null

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: compact ? "8px" : "12px",
        padding: compact ? "8px 10px" : "10px 12px",
        borderRadius: "var(--radius-sm)",
        background: hasCoords ? "rgba(212, 168, 67, 0.06)" : "var(--bg-deep)",
        border: `1px solid ${hasCoords ? "rgba(212, 168, 67, 0.2)" : "var(--border-subtle)"}`,
      }}
    >
      <Crosshair
        className="size-4 shrink-0"
        style={{ color: hasCoords ? "var(--accent-gold)" : "var(--text-muted)" }}
      />
      <div style={{ flex: 1, display: "flex", gap: "16px" }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: "9px", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
            Latitude
          </div>
          <div
            style={{
              fontSize: compact ? "12px" : "14px",
              fontWeight: 700,
              fontFamily: "var(--font-mono)",
              color: hasCoords ? "var(--text-primary)" : "var(--text-muted)",
              marginTop: "1px",
            }}
          >
            {latitude != null ? Number(latitude).toFixed(6) : "\u2014"}
          </div>
        </div>
        <div style={{ width: "1px", background: "var(--border-subtle)" }} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: "9px", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
            Longitude
          </div>
          <div
            style={{
              fontSize: compact ? "12px" : "14px",
              fontWeight: 700,
              fontFamily: "var(--font-mono)",
              color: hasCoords ? "var(--text-primary)" : "var(--text-muted)",
              marginTop: "1px",
            }}
          >
            {longitude != null ? Number(longitude).toFixed(6) : "\u2014"}
          </div>
        </div>
      </div>
    </div>
  )
}

export default CoordinateDisplay

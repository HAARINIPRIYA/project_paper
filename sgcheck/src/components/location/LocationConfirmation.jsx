import { CheckCircle2, Loader2, MapPin, AlertTriangle } from "lucide-react"

function LocationConfirmation({ latitude, longitude, district, place, status, onConfirm }) {
  const hasCoords = latitude != null && longitude != null
  const isConfirmed = status === "confirmed"
  const isLoading = status === "loading"
  const isError = status === "error"

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
      {hasCoords && (
        <div
          style={{
            padding: "8px 10px",
            borderRadius: "var(--radius-sm)",
            background: "var(--bg-deep)",
            border: "1px solid var(--border-subtle)",
            fontSize: "11px",
            color: "var(--text-secondary)",
            display: "flex",
            flexDirection: "column",
            gap: "3px",
          }}
        >
          {district && (
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <MapPin className="size-3 shrink-0" style={{ color: "var(--text-muted)" }} />
              <span>
                <strong style={{ color: "var(--text-primary)" }}>District:</strong> {district}
              </span>
            </div>
          )}
          {place && (
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <MapPin className="size-3 shrink-0" style={{ color: "var(--text-muted)" }} />
              <span>
                <strong style={{ color: "var(--text-primary)" }}>Place:</strong> {place}
              </span>
            </div>
          )}
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <MapPin className="size-3 shrink-0" style={{ color: "var(--accent-gold)" }} />
            <span>
              <strong style={{ color: "var(--text-primary)" }}>Field:</strong> {Number(latitude).toFixed(4)}, {Number(longitude).toFixed(4)}
            </span>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={onConfirm}
        disabled={!hasCoords || isLoading || isConfirmed}
        style={{
          width: "100%",
          height: "42px",
          padding: "0 14px",
          fontSize: "13px",
          fontWeight: 600,
          fontFamily: "var(--font-body)",
          borderRadius: "var(--radius-sm)",
          border: "none",
          cursor: !hasCoords || isLoading || isConfirmed ? "default" : "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "6px",
          transition: "all 150ms",
          background: isConfirmed
            ? "rgba(45, 106, 79, 0.2)"
            : isLoading
            ? "var(--bg-deep)"
            : hasCoords
            ? "var(--accent-gold)"
            : "var(--bg-deep)",
          color: isConfirmed
            ? "var(--accent-green)"
            : isLoading
            ? "var(--text-muted)"
            : hasCoords
            ? "#1A1A1A"
            : "var(--text-muted)",
          opacity: !hasCoords && !isLoading ? 0.5 : 1,
        }}
      >
        {isLoading ? (
          <>
            <Loader2 className="size-3.5 animate-spin" />
            Fetching environmental data...
          </>
        ) : isConfirmed ? (
          <>
            <CheckCircle2 className="size-3.5" />
            Location confirmed \u2014 Weather data ready
          </>
        ) : isError ? (
          <>
            <AlertTriangle className="size-3.5" />
            Failed \u2014 Click to retry
          </>
        ) : (
          <>
            <MapPin className="size-3.5" />
            Confirm Field Location
          </>
        )}
      </button>
    </div>
  )
}

export default LocationConfirmation

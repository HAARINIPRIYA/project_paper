import { useState, useRef, useEffect } from "react"
import { ChevronRight, MapPin } from "lucide-react"
import { DISTRICTS } from "@/services/locationApi"

function DistrictSelector({ value, onChange }) {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState("")
  const ref = useRef(null)

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setIsOpen(false)
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [])

  const selected = DISTRICTS.find((d) => `${d.name}, ${d.state}` === value)

  const filtered = DISTRICTS.filter((d) => {
    const term = search.toLowerCase()
    return (
      d.name.toLowerCase().includes(term) ||
      d.state.toLowerCase().includes(term)
    )
  })

  const grouped = {}
  for (const d of filtered) {
    if (!grouped[d.state]) grouped[d.state] = []
    grouped[d.state].push(d)
  }

  function handleSelect(district) {
    onChange(`${district.name}, ${district.state}`)
    setIsOpen(false)
    setSearch("")
  }

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <div className="field-label-row">
        <MapPin className="size-3.5" style={{ color: "var(--text-secondary)" }} />
        <label className="field-label">District</label>
      </div>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: "100%",
          height: "42px",
          padding: "0 10px",
          fontSize: "13px",
          fontFamily: "var(--font-body)",
          color: selected ? "var(--text-primary)" : "var(--text-muted)",
          background: "var(--bg-input)",
          border: "1px solid var(--border-default)",
          borderRadius: "var(--radius-sm)",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "8px",
          textAlign: "left",
          transition: "border-color 150ms",
        }}
      >
        <span className="truncate" style={{ flex: 1 }}>
          {selected ? `${selected.name}, ${selected.state}` : "Select District"}
        </span>
        <ChevronRight
          className="size-3 shrink-0"
          style={{
            transform: isOpen ? "rotate(90deg)" : "rotate(0deg)",
            transition: "transform 200ms",
            color: "var(--text-muted)",
          }}
        />
      </button>

      {isOpen && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            marginTop: "4px",
            background: "var(--bg-elevated)",
            border: "1px solid var(--border-default)",
            borderRadius: "var(--radius-sm)",
            zIndex: 50,
            maxHeight: "280px",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
            boxShadow: "var(--shadow-lg)",
          }}
        >
          <div style={{ padding: "6px 8px", borderBottom: "1px solid var(--border-subtle)" }}>
            <input
              type="text"
              placeholder="Search district or state..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
              style={{
                width: "100%",
                height: "30px",
                padding: "0 8px",
                fontSize: "12px",
                fontFamily: "var(--font-body)",
                background: "var(--bg-input)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "4px",
                color: "var(--text-primary)",
                outline: "none",
              }}
            />
          </div>

          <div style={{ overflowY: "auto", flex: 1 }}>
            {Object.entries(grouped).map(([state, districts]) => (
              <div key={state}>
                <div
                  style={{
                    padding: "4px 10px",
                    fontSize: "10px",
                    fontWeight: 700,
                    color: "var(--accent-gold)",
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    background: "var(--bg-deep)",
                    position: "sticky",
                    top: 0,
                  }}
                >
                  {state}
                </div>
                {districts.map((d) => (
                  <button
                    key={`${d.name}-${d.state}`}
                    type="button"
                    onClick={() => handleSelect(d)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      width: "100%",
                      padding: "7px 10px",
                      fontSize: "12px",
                      fontFamily: "var(--font-body)",
                      color: "var(--text-primary)",
                      background:
                        `${d.name}, ${d.state}` === value
                          ? "rgba(212, 168, 67, 0.12)"
                          : "transparent",
                      border: "none",
                      cursor: "pointer",
                      textAlign: "left",
                      transition: "background 100ms",
                    }}
                    onMouseEnter={(e) => {
                      if (`${d.name}, ${d.state}` !== value)
                        e.currentTarget.style.background = "var(--bg-card-hover)"
                    }}
                    onMouseLeave={(e) => {
                      if (`${d.name}, ${d.state}` !== value)
                        e.currentTarget.style.background = "transparent"
                    }}
                  >
                    <MapPin className="size-3 shrink-0" style={{ color: "var(--text-muted)" }} />
                    <span>{d.name}</span>
                  </button>
                ))}
              </div>
            ))}
            {filtered.length === 0 && (
              <div style={{ padding: "12px 10px", fontSize: "12px", color: "var(--text-muted)", textAlign: "center" }}>
                No districts found
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default DistrictSelector

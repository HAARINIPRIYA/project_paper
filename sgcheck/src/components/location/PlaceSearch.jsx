import { useState, useRef, useEffect, useCallback } from "react"
import { Search, MapPin, Loader2 } from "lucide-react"
import { searchPlaces } from "@/services/locationApi"

function PlaceSearch({ district, onSelect, disabled }) {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState([])
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [selectedName, setSelectedName] = useState("")
  const debounceRef = useRef(null)
  const inputRef = useRef(null)
  const containerRef = useRef(null)

  useEffect(() => {
    function handleClick(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [])

  const doSearch = useCallback(
    async (term) => {
      if (!term || term.trim().length < 2) {
        setResults([])
        setIsOpen(false)
        return
      }

      setLoading(true)
      try {
        const districtName = district ? district.split(",")[0].trim() : null
        const stateName = district ? district.split(",")[1]?.trim() : null

        const places = await searchPlaces(term, districtName, stateName, "India", 8)
        setResults(places)
        setIsOpen(places.length > 0)
      } catch (err) {
        console.error("Place search failed:", err)
        setResults([])
        setIsOpen(false)
      } finally {
        setLoading(false)
      }
    },
    [district]
  )

  function handleChange(e) {
    const val = e.target.value
    setQuery(val)
    setSelectedName("")

    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => doSearch(val), 400)
  }

  function handleSelect(place) {
    setQuery(place.name)
    setSelectedName(place.name)
    setIsOpen(false)
    onSelect({
      name: place.name,
      displayName: place.display_name,
      latitude: place.latitude,
      longitude: place.longitude,
    })
  }

  function handleClear() {
    setQuery("")
    setSelectedName("")
    setResults([])
    setIsOpen(false)
  }

  return (
    <div ref={containerRef} style={{ position: "relative" }}>
      <div className="field-label-row">
        <Search className="size-3.5" style={{ color: "var(--text-secondary)" }} />
        <label className="field-label">Search Place</label>
      </div>
      <div style={{ position: "relative" }}>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleChange}
          onFocus={() => results.length > 0 && setIsOpen(true)}
          placeholder={district ? `Search within ${district.split(",")[0]}...` : "Select a district first"}
          disabled={disabled}
          style={{
            width: "100%",
            height: "42px",
            padding: "0 32px 0 10px",
            fontSize: "13px",
            fontFamily: "var(--font-body)",
            color: "var(--text-primary)",
            background: "var(--bg-input)",
            border: "1px solid var(--border-default)",
            borderRadius: "var(--radius-sm)",
            outline: "none",
            opacity: disabled ? 0.5 : 1,
            transition: "border-color 150ms",
          }}
        />
        <div
          style={{
            position: "absolute",
            right: "8px",
            top: "50%",
            transform: "translateY(-50%)",
            display: "flex",
            alignItems: "center",
            gap: "4px",
          }}
        >
          {loading ? (
            <Loader2 className="size-3.5 animate-spin" style={{ color: "var(--accent-gold)" }} />
          ) : query ? (
            <button
              type="button"
              onClick={handleClear}
              style={{
                background: "none",
                border: "none",
                color: "var(--text-muted)",
                cursor: "pointer",
                padding: "2px",
                fontSize: "14px",
                lineHeight: 1,
              }}
            >
              ×
            </button>
          ) : null}
        </div>
      </div>

      {isOpen && results.length > 0 && (
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
            maxHeight: "240px",
            overflowY: "auto",
            boxShadow: "var(--shadow-lg)",
          }}
        >
          {results.map((place, idx) => (
            <button
              key={`${place.osm_id || idx}`}
              type="button"
              onClick={() => handleSelect(place)}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: "8px",
                width: "100%",
                padding: "8px 10px",
                fontSize: "12px",
                fontFamily: "var(--font-body)",
                color: "var(--text-primary)",
                background: "transparent",
                border: "none",
                borderBottom: idx < results.length - 1 ? "1px solid var(--border-subtle)" : "none",
                cursor: "pointer",
                textAlign: "left",
                transition: "background 100ms",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-card-hover)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              <MapPin
                className="size-3 shrink-0"
                style={{ color: "var(--accent-gold)", marginTop: "2px" }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600 }}>{place.name}</div>
                <div
                  style={{
                    fontSize: "10px",
                    color: "var(--text-muted)",
                    marginTop: "1px",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {place.display_name}
                </div>
                <div style={{ fontSize: "10px", color: "var(--text-muted)", marginTop: "1px" }}>
                  {place.latitude.toFixed(4)}, {place.longitude.toFixed(4)}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default PlaceSearch

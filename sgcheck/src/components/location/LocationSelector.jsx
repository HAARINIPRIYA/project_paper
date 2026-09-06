import { useState, useCallback } from "react"
import { MapPin, Bot } from "lucide-react"
import DistrictSelector from "./DistrictSelector"
import PlaceSearch from "./PlaceSearch"
import FieldLocationMap from "./FieldLocationMap"
import CoordinateDisplay from "./CoordinateDisplay"
import LocationConfirmation from "./LocationConfirmation"
import LocationBot from "./LocationBot"
import WeatherDataPanel from "@/components/weather/WeatherDataPanel"
import { fetchWeatherAggregation } from "@/services/weatherApi"

function LocationSelector({ onWeatherDataReady, plantingDate, harvestDate }) {
  const [district, setDistrict] = useState("")
  const [placeName, setPlaceName] = useState("")
  const [latitude, setLatitude] = useState(null)
  const [longitude, setLongitude] = useState(null)
  const [mapCenter, setMapCenter] = useState(null)
  const [mapZoom, setMapZoom] = useState(null)

  const [weatherData, setWeatherData] = useState(null)
  const [availableFeatures, setAvailableFeatures] = useState([])
  const [missingFeatures, setMissingFeatures] = useState([])
  const [confirmStatus, setConfirmStatus] = useState("idle")
  const [weatherError, setWeatherError] = useState(null)
  const [activeTab, setActiveTab] = useState("manual")

  const resetLocation = useCallback(() => {
    setPlaceName("")
    setLatitude(null)
    setLongitude(null)
    setMapCenter(null)
    setMapZoom(null)
    setWeatherData(null)
    setAvailableFeatures([])
    setMissingFeatures([])
    setConfirmStatus("idle")
    setWeatherError(null)
  }, [])

  const handlePlaceSelect = useCallback((place) => {
    setPlaceName(place.name)
    setLatitude(place.latitude)
    setLongitude(place.longitude)
    setMapCenter([place.latitude, place.longitude])
    setMapZoom(14)
    setWeatherData(null)
    setAvailableFeatures([])
    setMissingFeatures([])
    setConfirmStatus("idle")
    setWeatherError(null)
  }, [])

  const handleMarkerMove = useCallback((lat, lng) => {
    setLatitude(lat)
    setLongitude(lng)
  }, [])

  const handleDistrictChange = useCallback((value) => {
    setDistrict(value)
    resetLocation()
  }, [resetLocation])

  const handleBotLocation = useCallback((loc) => {
    setLatitude(loc.latitude)
    setLongitude(loc.longitude)
    setMapCenter([loc.latitude, loc.longitude])
    setMapZoom(14)
    setPlaceName(loc.place_name || "")
    setWeatherData(null)
    setAvailableFeatures([])
    setMissingFeatures([])
    setConfirmStatus("idle")
    setWeatherError(null)
  }, [])

  const handleConfirm = useCallback(async () => {
    if (latitude == null || longitude == null) return

    setConfirmStatus("loading")
    setWeatherError(null)

    try {
      if (!plantingDate || !harvestDate) {
        setWeatherError("Please set planting and harvest dates first.")
        setConfirmStatus("error")
        return
      }

      const result = await fetchWeatherAggregation(
        latitude,
        longitude,
        plantingDate,
        harvestDate
      )

      if (result.success) {
        setWeatherData(result)
        setAvailableFeatures(result.available_features || [])
        setMissingFeatures(result.missing_features || [])
        setConfirmStatus("confirmed")

        if (onWeatherDataReady) {
          onWeatherDataReady({
            features: result.canesugar_features || {},
            available: result.available_features || [],
            missing: result.missing_features || [],
            location: result.location || {},
          })
        }
      } else {
        setWeatherError("Unable to retrieve environmental data. Please try again.")
        setConfirmStatus("error")
      }
    } catch (err) {
      console.error("Weather fetch failed:", err)
      setWeatherError(
        err.message?.includes("timed out")
          ? "Environmental service timed out. Please try again."
          : err.message?.includes("Network")
          ? "Network connection unavailable."
          : "Unable to retrieve environmental data. Please try again or enter values manually."
      )
      setConfirmStatus("error")
    }
  }, [latitude, longitude, onWeatherDataReady, plantingDate, harvestDate])

  return (
    <div
      className="field-section location-section"
      style={{
        background: "var(--bg-surface)",
        border: "1px solid var(--border-subtle)",
        borderRadius: "var(--radius-sm)",
        padding: "14px",
        display: "flex",
        flexDirection: "column",
        gap: "12px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
        <MapPin className="size-3.5" style={{ color: "var(--accent-gold)" }} />
        <span style={{ fontSize: "12px", fontWeight: 700, color: "var(--accent-gold)" }}>
          Field Location
        </span>
        <span style={{ fontSize: "9px", color: "var(--text-muted)", marginLeft: "auto" }}>
          Step 1 of 3
        </span>
      </div>

      <div
        style={{
          display: "flex",
          gap: "3px",
          padding: "3px",
          borderRadius: "var(--radius-sm)",
          background: "var(--bg-deep)",
          border: "1px solid var(--border-subtle)",
        }}
      >
        <button
          type="button"
          onClick={() => setActiveTab("manual")}
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "5px",
            padding: "6px 10px",
            borderRadius: "3px",
            border: "none",
            fontSize: "11px",
            fontWeight: 600,
            cursor: "pointer",
            transition: "all 150ms",
            background: activeTab === "manual" ? "var(--accent-gold)" : "transparent",
            color: activeTab === "manual" ? "#1A1A1A" : "var(--text-secondary)",
            fontFamily: "var(--font-body)",
          }}
        >
          <MapPin className="size-3" />
          District & Map
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("bot")}
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "5px",
            padding: "6px 10px",
            borderRadius: "3px",
            border: "none",
            fontSize: "11px",
            fontWeight: 600,
            cursor: "pointer",
            transition: "all 150ms",
            background: activeTab === "bot" ? "rgba(124, 92, 252, 0.2)" : "transparent",
            color: activeTab === "bot" ? "#C4B5FD" : "var(--text-secondary)",
            fontFamily: "var(--font-body)",
          }}
        >
          <Bot className="size-3" />
          Paste Link / Coordinates
        </button>
      </div>

      {activeTab === "manual" && (
        <>
          <DistrictSelector value={district} onChange={handleDistrictChange} />

          <PlaceSearch
            district={district}
            onSelect={handlePlaceSelect}
            disabled={!district}
          />

          <FieldLocationMap
            latitude={latitude}
            longitude={longitude}
            onMarkerMove={handleMarkerMove}
            mapCenter={mapCenter}
            mapZoom={mapZoom}
          />

          <CoordinateDisplay latitude={latitude} longitude={longitude} />
        </>
      )}

      {activeTab === "bot" && (
        <LocationBot onLocationDetected={handleBotLocation} />
      )}

      {(latitude != null && longitude != null) && (
        <>
          <LocationConfirmation
            latitude={latitude}
            longitude={longitude}
            district={district}
            place={placeName}
            status={confirmStatus}
            onConfirm={handleConfirm}
          />

          {(confirmStatus === "loading" || confirmStatus === "confirmed" || weatherError) && (
            <WeatherDataPanel
              weatherData={weatherData}
              loading={confirmStatus === "loading"}
              error={weatherError}
              availableFeatures={availableFeatures}
              missingFeatures={missingFeatures}
            />
          )}
        </>
      )}
    </div>
  )
}

export default LocationSelector

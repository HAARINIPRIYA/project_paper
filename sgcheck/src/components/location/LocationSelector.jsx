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
import { inferAgroDataFromCoordinates } from "@/services/agroInferenceService"

function LocationSelector({ onWeatherDataReady, plantingDate, harvestDate, compact = false }) {
  const [district, setDistrict] = useState("")
  const [placeName, setPlaceName] = useState("")
  const [latitude, setLatitude] = useState(null)
  const [longitude, setLongitude] = useState(null)
  const [mapCenter, setMapCenter] = useState(null)
  const [mapZoom, setMapZoom] = useState(null)

  const [weatherData, setWeatherData] = useState(null)
  const [availableFeatures, setAvailableFeatures] = useState([])
  const [missingFeatures, setMissingFeatures] = useState([])
  const [featureStatus, setFeatureStatus] = useState({})
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
    setFeatureStatus({})
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
    setFeatureStatus({})
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
    setFeatureStatus({})
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

      // Concurrently infer soil chemistry & nutrient dosing
      let agroInference = null
      try {
        agroInference = await inferAgroDataFromCoordinates({
          latitude,
          longitude,
          plantingDate,
          harvestDate,
        })
      } catch (err) {
        console.warn("Agro inference in LocationSelector:", err)
      }

      if (result.success || agroInference?.success) {
        setWeatherData(result)
        setAvailableFeatures(result.available_features || [])
        setMissingFeatures(result.missing_features || [])
        setFeatureStatus(result.feature_status || {})
        setConfirmStatus("confirmed")

        if (onWeatherDataReady) {
          onWeatherDataReady({
            features: {
              ...(result.canesugar_features || {}),
              ...(agroInference?.inferredFields || {}),
            },
            available: result.available_features || [],
            missing: result.missing_features || [],
            location: result.location || agroInference?.location || {},
            agroInference,
          })
        }
      } else {
        setWeatherError("Unable to retrieve environmental data. Please try again.")
        setConfirmStatus("error")
      }
    } catch (err) {
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
      style={{
        display: "flex",
        flexDirection: "column",
        gap: compact ? "10px" : "16px",
      }}
    >
      <div
        style={{
          display: "flex",
          gap: "3px",
          padding: "3px",
          borderRadius: "var(--radius-sm)",
          background: "var(--bg-deep)",
          border: "1px solid var(--border-subtle)",
          width: compact ? "100%" : "fit-content",
        }}
      >
        <button
          type="button"
          onClick={() => setActiveTab("manual")}
          style={{
            flex: compact ? 1 : "none",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "5px",
            padding: compact ? "5px 8px" : "7px 14px",
            borderRadius: "3px",
            border: "none",
            fontSize: compact ? "10px" : "12px",
            fontWeight: 600,
            cursor: "pointer",
            transition: "all 150ms",
            background: activeTab === "manual" ? "var(--accent-gold)" : "transparent",
            color: activeTab === "manual" ? "#1A1A1A" : "var(--text-secondary)",
            fontFamily: "var(--font-body)",
          }}
        >
          <MapPin className={compact ? "size-2.5" : "size-3"} />
          District & Map
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("bot")}
          style={{
            flex: compact ? 1 : "none",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "5px",
            padding: compact ? "5px 8px" : "7px 14px",
            borderRadius: "3px",
            border: "none",
            fontSize: compact ? "10px" : "12px",
            fontWeight: 600,
            cursor: "pointer",
            transition: "all 150ms",
            background: activeTab === "bot" ? "rgba(124, 92, 252, 0.2)" : "transparent",
            color: activeTab === "bot" ? "#C4B5FD" : "var(--text-secondary)",
            fontFamily: "var(--font-body)",
          }}
        >
          <Bot className={compact ? "size-2.5" : "size-3"} />
          Paste Link / Coordinates
        </button>
      </div>

      {activeTab === "manual" && (
        <div className={compact ? "flex flex-col gap-3" : "grid grid-cols-1 lg:grid-cols-12 gap-5 items-start w-full min-w-0"}>
          <div className={compact ? "flex flex-col gap-2.5" : "lg:col-span-5 flex flex-col gap-3 min-w-0 w-full"}>
            <DistrictSelector value={district} onChange={handleDistrictChange} compact={compact} />

            <PlaceSearch
              district={district}
              onSelect={handlePlaceSelect}
              disabled={!district}
              compact={compact}
            />

            <CoordinateDisplay latitude={latitude} longitude={longitude} compact={compact} />
          </div>

          <div className={compact ? "w-full" : "lg:col-span-7 min-w-0 w-full"}>
            <FieldLocationMap
              latitude={latitude}
              longitude={longitude}
              onMarkerMove={handleMarkerMove}
              mapCenter={mapCenter}
              mapZoom={mapZoom}
              height={compact ? "180px" : "400px"}
            />
          </div>
        </div>
      )}

      {activeTab === "bot" && (
        <LocationBot onLocationDetected={handleBotLocation} compact={compact} />
      )}

      {(latitude != null && longitude != null) && (
        <div style={{ display: "flex", flexDirection: "column", gap: compact ? "8px" : "12px" }}>
          <LocationConfirmation
            latitude={latitude}
            longitude={longitude}
            district={district}
            place={placeName}
            status={confirmStatus}
            onConfirm={handleConfirm}
            compact={compact}
          />

          {(confirmStatus === "loading" || confirmStatus === "confirmed" || weatherError) && (
            <WeatherDataPanel
              weatherData={weatherData}
              loading={confirmStatus === "loading"}
              error={weatherError}
              availableFeatures={availableFeatures}
              missingFeatures={missingFeatures}
              featureStatus={featureStatus}
              compact={compact}
            />
          )}
        </div>
      )}
    </div>
  )
}

export default LocationSelector

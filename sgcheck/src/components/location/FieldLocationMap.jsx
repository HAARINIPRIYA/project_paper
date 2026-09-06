import { useEffect, useRef, useMemo } from "react"
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from "react-leaflet"
import L from "leaflet"

const DEFAULT_CENTER = [20.5937, 78.9629]
const DEFAULT_ZOOM = 5

const markerIcon = new L.DivIcon({
  className: "field-marker",
  html: `<div style="
    width: 28px; height: 28px;
    background: #D4A843;
    border: 3px solid #fff;
    border-radius: 50%;
    box-shadow: 0 2px 8px rgba(0,0,0,0.4);
    display: grid; place-items: center;
  ">
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#1A1A1A" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
      <circle cx="12" cy="10" r="3"/>
    </svg>
  </div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 28],
})

function MapEventHandler({ onMarkerMove }) {
  useMapEvents({
    click(e) {
      onMarkerMove(e.latlng.lat, e.latlng.lng)
    },
  })
  return null
}

function MapCenterUpdater({ center, zoom }) {
  const map = useMap()

  useEffect(() => {
    if (center && center[0] && center[1]) {
      map.flyTo(center, zoom || 14, { duration: 1.0 })
    }
  }, [center, zoom, map])

  return null
}

function DraggableMarker({ position, onMove }) {
  const markerRef = useRef(null)

  const eventHandlers = useMemo(
    () => ({
      dragend() {
        const marker = markerRef.current
        if (marker) {
          const { lat, lng } = marker.getLatLng()
          onMove(lat, lng)
        }
      },
    }),
    [onMove]
  )

  if (!position) return null

  return (
    <Marker
      ref={markerRef}
      position={position}
      icon={markerIcon}
      draggable={true}
      eventHandlers={eventHandlers}
    />
  )
}

function FieldLocationMap({ latitude, longitude, onMarkerMove, mapCenter, mapZoom }) {
  const center = useMemo(() => {
    if (latitude && longitude) return [latitude, longitude]
    if (mapCenter) return mapCenter
    return DEFAULT_CENTER
  }, [latitude, longitude, mapCenter])

  const zoom = useMemo(() => {
    if (latitude && longitude) return mapZoom || 14
    if (mapCenter) return 12
    return DEFAULT_ZOOM
  }, [latitude, longitude, mapCenter, mapZoom])

  const markerPosition = useMemo(() => {
    if (latitude && longitude) return [latitude, longitude]
    return null
  }, [latitude, longitude])

  return (
    <div
      style={{
        width: "100%",
        height: "300px",
        borderRadius: "var(--radius-sm)",
        overflow: "hidden",
        border: "1px solid var(--border-default)",
        position: "relative",
      }}
    >
      <MapContainer
        center={center}
        zoom={zoom}
        style={{ width: "100%", height: "100%" }}
        zoomControl={true}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapCenterUpdater center={center} zoom={zoom} />
        <MapEventHandler onMarkerMove={onMarkerMove} />
        <DraggableMarker position={markerPosition} onMove={onMarkerMove} />
      </MapContainer>

      {!latitude && !longitude && (
        <div
          style={{
            position: "absolute",
            bottom: "8px",
            left: "50%",
            transform: "translateX(-50%)",
            background: "rgba(0,0,0,0.75)",
            color: "#fff",
            padding: "4px 12px",
            borderRadius: "4px",
            fontSize: "11px",
            fontWeight: 500,
            zIndex: 1000,
            pointerEvents: "none",
            whiteSpace: "nowrap",
          }}
        >
          Search a place or click the map to set field location
        </div>
      )}
    </div>
  )
}

export default FieldLocationMap

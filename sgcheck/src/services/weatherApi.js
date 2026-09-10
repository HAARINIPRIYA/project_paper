const API_BASE = (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_URL) || "http://localhost:8000";

export async function fetchWeather(latitude, longitude, startDate, endDate) {
  const res = await fetch(`${API_BASE}/weather/fetch`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      latitude,
      longitude,
      start_date: startDate,
      end_date: endDate,
    }),
  });

  if (!res.ok) {
    const detail = await res.json().catch(() => ({}));
    throw new Error(detail.detail || `Weather fetch failed: ${res.status}`);
  }

  return res.json();
}

export async function fetchWeatherAggregation(latitude, longitude, plantingDate, harvestDate) {
  const res = await fetch(`${API_BASE}/weather/aggregate-for-prediction`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      latitude,
      longitude,
      planting_date: plantingDate,
      harvest_date: harvestDate,
    }),
  });

  if (!res.ok) {
    const detail = await res.json().catch(() => ({}));
    throw new Error(detail.detail || `Weather aggregation failed: ${res.status}`);
  }

  return res.json();
}

export const WEATHER_FEATURE_LABELS = {
  Rainfall_Total_mm: { label: "Total Rainfall", unit: "mm", icon: "CloudRain" },
  Rainfall_Seasonal_mm: { label: "Seasonal Rainfall", unit: "mm", icon: "CloudRain" },
  Temp_Avg_C: { label: "Avg Temperature", unit: "\u00B0C", icon: "Thermometer" },
  Temp_Max_C: { label: "Max Temperature", unit: "\u00B0C", icon: "ThermometerSun" },
  Temp_Min_C: { label: "Min Temperature", unit: "\u00B0C", icon: "ThermometerSnowflake" },
  Humidity_pct: { label: "Relative Humidity", unit: "%", icon: "Droplets" },
  "Humidity_%": { label: "Relative Humidity", unit: "%", icon: "Droplets" },
  Solar_Radiation_MJ_m2_day: { label: "Solar Radiation", unit: "MJ/m\u00B2/day", icon: "Sun" },
  Wind_Speed_kmph: { label: "Wind Speed", unit: "km/h", icon: "Wind" },
  Evapotranspiration_mm_day: { label: "Evapotranspiration", unit: "mm/day", icon: "Droplets" },
  Dew_Point_C: { label: "Dew Point", unit: "\u00B0C", icon: "Cloud" },
  Heat_Stress_Days: { label: "Heat Stress Days", unit: "days", icon: "Flame" },
  Frost_Days: { label: "Frost Days", unit: "days", icon: "Snowflake" },
  "Soil_Moisture_%": { label: "Soil Moisture", unit: "%", icon: "Droplets" },
  Altitude_m: { label: "Elevation", unit: "m", icon: "Mountain" },
};

export function formatWeatherValue(key, value) {
  if (value === null || value === undefined || value === 0) return null;

  const meta = WEATHER_FEATURE_LABELS[key];
  if (!meta) return String(value);

  if (Number.isInteger(value) || ["Heat_Stress_Days", "Frost_Days"].includes(key)) {
    return `${value} ${meta.unit}`;
  }

  return `${Number(value).toFixed(1)} ${meta.unit}`;
}

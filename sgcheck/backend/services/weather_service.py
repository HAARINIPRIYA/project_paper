import logging
from datetime import datetime, timedelta
from typing import Dict, Any, Optional, List

import requests

logger = logging.getLogger(__name__)

FORECAST_URL = "https://api.open-meteo.com/v1/forecast"
ARCHIVE_URL = "https://archive-api.open-meteo.com/v1/archive"
ELEVATION_URL = "https://api.open-meteo.com/v1/elevation"

ARCHIVE_DAILY_VARIABLES = [
    "precipitation_sum",
    "temperature_2m_max",
    "temperature_2m_min",
    "temperature_2m_mean",
    "shortwave_radiation_sum",
    "wind_speed_10m_max",
]

FORECAST_DAILY_VARIABLES = [
    "precipitation_sum",
    "temperature_2m_max",
    "temperature_2m_min",
    "temperature_2m_mean",
    "relative_humidity_2m",
    "shortwave_radiation_sum",
    "wind_speed_10m",
    "wind_speed_10m_max",
    "et0_fao",
    "dew_point_2m",
    "soil_moisture_0_to_7cm",
    "soil_moisture_7_to_28cm",
    "soil_moisture_28_to_100cm",
    "soil_temperature_6cm",
]


class WeatherService:
    def __init__(self, forecast_url: Optional[str] = None, archive_url: Optional[str] = None):
        self.forecast_url = forecast_url or FORECAST_URL
        self.archive_url = archive_url or ARCHIVE_URL
        self.session = requests.Session()
        self.session.headers.update({
            "User-Agent": "CaneSugar/1.0 (sugarcane-yield-prediction)",
        })

    def get_daily_weather(
        self,
        latitude: float,
        longitude: float,
        start_date: str,
        end_date: str,
    ) -> Dict[str, Any]:
        if not self._validate_inputs(latitude, longitude, start_date, end_date):
            return {"daily": {}, "metadata": {"status": "error", "message": "Invalid inputs"}}

        archive_end = (datetime.now() - timedelta(days=5)).strftime("%Y-%m-%d")

        daily_data = {}
        sources_used = []

        start_dt = datetime.strptime(start_date, "%Y-%m-%d")
        end_dt = datetime.strptime(end_date, "%Y-%m-%d")
        archive_end_dt = datetime.strptime(archive_end, "%Y-%m-%d")

        if start_dt <= archive_end_dt:
            archive_fetch_end = min(end_dt, archive_end_dt).strftime("%Y-%m-%d")
            archive_data = self._fetch_archive(
                latitude, longitude, start_date, archive_fetch_end
            )
            if archive_data:
                daily_data = self._merge_daily_data(daily_data, archive_data)
                sources_used.append("archive")

        if end_dt > archive_end_dt:
            forecast_fetch_start = max(start_dt, archive_end_dt + timedelta(days=1)).strftime("%Y-%m-%d")
            forecast_data = self._fetch_forecast(
                latitude, longitude, forecast_fetch_start, end_date
            )
            if forecast_data:
                daily_data = self._merge_daily_data(daily_data, forecast_data)
                sources_used.append("forecast")

        return {
            "daily": daily_data,
            "metadata": {
                "status": "success" if daily_data else "partial",
                "sources": sources_used,
                "start_date": start_date,
                "end_date": end_date,
                "latitude": latitude,
                "longitude": longitude,
            },
        }

    def get_elevation(self, latitude: float, longitude: float) -> Optional[float]:
        try:
            resp = self.session.get(
                ELEVATION_URL,
                params={"latitude": latitude, "longitude": longitude},
                timeout=10,
            )
            resp.raise_for_status()
            data = resp.json()
            elevations = data.get("elevation", [])
            if elevations and len(elevations) > 0:
                return float(elevations[0])
        except Exception as e:
            logger.warning(f"Elevation API failed: {e}")
        return None

    def _fetch_forecast(
        self, latitude: float, longitude: float, start_date: str, end_date: str
    ) -> Optional[Dict[str, List]]:
        params = {
            "latitude": latitude,
            "longitude": longitude,
            "start_date": start_date,
            "end_date": end_date,
            "daily": ",".join(FORECAST_DAILY_VARIABLES),
        }
        try:
            resp = self.session.get(self.forecast_url, params=params, timeout=15)
            resp.raise_for_status()
            data = resp.json()
            daily = data.get("daily", {})
            return self._normalize_date_key(daily)
        except requests.Timeout:
            logger.error("Weather forecast API timed out")
            return None
        except requests.RequestException as e:
            logger.error(f"Weather forecast API failed: {e}")
            return None
        except (KeyError, ValueError) as e:
            logger.error(f"Failed to parse forecast response: {e}")
            return None

    def _fetch_archive(
        self, latitude: float, longitude: float, start_date: str, end_date: str
    ) -> Optional[Dict[str, List]]:
        params = {
            "latitude": latitude,
            "longitude": longitude,
            "start_date": start_date,
            "end_date": end_date,
            "daily": ",".join(ARCHIVE_DAILY_VARIABLES),
        }
        try:
            resp = self.session.get(self.archive_url, params=params, timeout=15)
            resp.raise_for_status()
            data = resp.json()
            daily = data.get("daily", {})
            return self._normalize_date_key(daily)
        except requests.Timeout:
            logger.error("Weather archive API timed out")
            return None
        except requests.RequestException as e:
            logger.error(f"Weather archive API failed: {e}")
            return None
        except (KeyError, ValueError) as e:
            logger.error(f"Failed to parse archive response: {e}")
            return None

    @staticmethod
    def _normalize_date_key(data: Dict) -> Dict:
        if "time" in data and "date" not in data:
            data["date"] = data.pop("time")
        return data

    @staticmethod
    def _merge_daily_data(base: Dict, overlay: Dict) -> Dict:
        if not base:
            return overlay
        if not overlay:
            return base

        base_dates = set(base.get("date", []))
        result = {}

        for key, values in base.items():
            result[key] = list(values) if values else []

        overlay_dates = overlay.get("date", [])
        overlay_date_indices = {d: i for i, d in enumerate(overlay_dates)}

        for date_str, idx in overlay_date_indices.items():
            if date_str not in base_dates:
                for key, values in overlay.items():
                    if key == "date":
                        result.setdefault("date", []).append(date_str)
                    elif idx < len(values):
                        result.setdefault(key, []).append(values[idx])
            else:
                base_idx = base["date"].index(date_str) if date_str in base["date"] else -1
                if base_idx >= 0:
                    for key, values in overlay.items():
                        if key != "date" and key in result:
                            if base_idx < len(result[key]) and result[key][base_idx] is None:
                                if idx < len(values):
                                    result[key][base_idx] = values[idx]

        return result

    @staticmethod
    def _validate_inputs(
        latitude: float, longitude: float, start_date: str, end_date: str
    ) -> bool:
        try:
            lat = float(latitude)
            lon = float(longitude)
            if not (-90.0 <= lat <= 90.0 and -180.0 <= lon <= 180.0):
                return False
            sd = datetime.strptime(start_date, "%Y-%m-%d")
            ed = datetime.strptime(end_date, "%Y-%m-%d")
            if ed < sd:
                return False
            return True
        except (TypeError, ValueError):
            return False


_weather_service = None


def get_weather_service() -> WeatherService:
    global _weather_service
    if _weather_service is None:
        _weather_service = WeatherService()
    return _weather_service

import time
import logging
from typing import List, Optional, Dict, Any

import requests

logger = logging.getLogger(__name__)

_MIN_REQUEST_INTERVAL = 1.0
_last_request_time = 0.0


def _rate_limit():
    global _last_request_time
    elapsed = time.time() - _last_request_time
    if elapsed < _MIN_REQUEST_INTERVAL:
        time.sleep(_MIN_REQUEST_INTERVAL - elapsed)
    _last_request_time = time.time()


class GeocodingService:
    BASE_URL = "https://nominatim.openstreetmap.org"
    USER_AGENT = "CaneSugar/1.0 (sugarcane-yield-prediction)"

    def __init__(self, base_url: Optional[str] = None):
        self.base_url = base_url or self.BASE_URL
        self.session = requests.Session()
        self.session.headers.update({
            "User-Agent": self.USER_AGENT,
            "Accept": "application/json",
        })

    def search_places(
        self,
        query: str,
        district: Optional[str] = None,
        state: Optional[str] = None,
        country: str = "India",
        limit: int = 10,
    ) -> List[Dict[str, Any]]:
        if not query or not query.strip():
            return []

        _rate_limit()

        search_query = query.strip()
        if district:
            search_query = f"{search_query}, {district}"
        if state:
            search_query = f"{search_query}, {state}"
        if country:
            search_query = f"{search_query}, {country}"

        params = {
            "q": search_query,
            "format": "json",
            "limit": min(limit, 50),
            "addressdetails": 1,
            "extratags": 0,
            "namedetails": 0,
        }

        try:
            resp = self.session.get(
                f"{self.base_url}/search",
                params=params,
                timeout=10,
            )
            resp.raise_for_status()
            results = resp.json()

            return [
                {
                    "name": self._extract_place_name(r),
                    "display_name": r.get("display_name", ""),
                    "latitude": float(r["lat"]),
                    "longitude": float(r["lon"]),
                    "type": r.get("type", ""),
                    "importance": r.get("importance", 0),
                    "osm_id": r.get("osm_id"),
                    "boundingbox": r.get("boundingbox"),
                }
                for r in results
            ]
        except requests.Timeout:
            logger.error("Geocoding request timed out")
            return []
        except requests.RequestException as e:
            logger.error(f"Geocoding request failed: {e}")
            return []
        except (KeyError, ValueError, TypeError) as e:
            logger.error(f"Failed to parse geocoding response: {e}")
            return []

    def reverse_geocode(
        self,
        latitude: float,
        longitude: float,
    ) -> Optional[Dict[str, Any]]:
        if not self.validate_coordinates(latitude, longitude):
            return None

        _rate_limit()

        params = {
            "lat": latitude,
            "lon": longitude,
            "format": "json",
            "addressdetails": 1,
        }

        try:
            resp = self.session.get(
                f"{self.base_url}/reverse",
                params=params,
                timeout=10,
            )
            resp.raise_for_status()
            data = resp.json()

            address = data.get("address", {})
            return {
                "name": self._extract_place_name(data),
                "display_name": data.get("display_name", ""),
                "latitude": latitude,
                "longitude": longitude,
                "district": address.get("county", address.get("district", "")),
                "state": address.get("state", ""),
                "country": address.get("country", ""),
                "postcode": address.get("postcode", ""),
            }
        except requests.Timeout:
            logger.error("Reverse geocoding request timed out")
            return None
        except requests.RequestException as e:
            logger.error(f"Reverse geocoding request failed: {e}")
            return None
        except (KeyError, ValueError, TypeError) as e:
            logger.error(f"Failed to parse reverse geocoding response: {e}")
            return None

    def validate_coordinates(self, latitude: float, longitude: float) -> bool:
        try:
            lat = float(latitude)
            lon = float(longitude)
            return -90.0 <= lat <= 90.0 and -180.0 <= lon <= 180.0
        except (TypeError, ValueError):
            return False

    @staticmethod
    def _extract_place_name(result: Dict[str, Any]) -> str:
        addr = result.get("address", {})
        for key in [
            "village", "town", "city", "suburb", "neighbourhood",
            "county", "district", "state_district",
        ]:
            if key in addr:
                return addr[key]
        display = result.get("display_name", "")
        if display:
            return display.split(",")[0].strip()
        return ""


_geocoding_service = None


def get_geocoding_service() -> GeocodingService:
    global _geocoding_service
    if _geocoding_service is None:
        _geocoding_service = GeocodingService()
    return _geocoding_service

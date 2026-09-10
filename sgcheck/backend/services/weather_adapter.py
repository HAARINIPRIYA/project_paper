import logging
import math
from datetime import datetime
from typing import Dict, Any, Optional, List

logger = logging.getLogger(__name__)

TRAINING_RANGES = {
    "Rainfall_Total_mm": (800.0, 2000.0),
    "Rainfall_Seasonal_mm": (400.0, 1200.0),
    "Temp_Avg_C": (10.0, 45.0),
    "Temp_Max_C": (13.0, 52.0),
    "Temp_Min_C": (2.0, 41.0),
    "Humidity_%": (50.0, 90.0),
    "Solar_Radiation_MJ_m2_day": (15.0, 30.0),
    "Wind_Speed_kmph": (2.0, 15.0),
    "Evapotranspiration_mm_day": (2.0, 8.0),
    "Dew_Point_C": (10.0, 25.0),
    "Heat_Stress_Days": (0, 30),
    "Frost_Days": (0, 10),
    "Soil_Moisture_%": (10.0, 40.0),
}


def _derive_dew_point(temp_c: float, rh_pct: float) -> float:
    a = 17.27
    b = 237.7
    alpha = (a * temp_c) / (b + temp_c) + math.log(max(rh_pct, 1.0) / 100.0)
    return (b * alpha) / (a - alpha)


def _derive_humidity_from_dewpoint(temp_c: float, dew_c: float) -> float:
    a = 17.27
    b = 237.7
    alpha_dew = (a * dew_c) / (b + dew_c)
    alpha_temp = (a * temp_c) / (b + temp_c)
    return 100.0 * math.exp(alpha_dew - alpha_temp)


def _derive_et0_hargreaves(temp_max: float, temp_min: float, temp_avg: float, solar_mj: float, lat_rad: float = 0.185) -> float:
    delta = temp_max - temp_min
    ra_constant = 492.0
    et0 = 0.0023 * ra_constant * (temp_avg + 17.8) * (delta ** 0.5) * 0.408 * solar_mj / 28.0
    return max(0.1, min(et0, 12.0))


class WeatherDataAdapter:
    def __init__(self):
        pass

    def aggregate_to_canesugar_features(
        self,
        raw_weather: Dict[str, Any],
        planting_date: str,
        harvest_date: str,
        elevation: Optional[float] = None,
    ) -> Dict[str, Any]:
        daily = raw_weather.get("daily", {})
        if not daily:
            return self._empty_features(planting_date, harvest_date)

        dates = daily.get("date", [])
        if not dates:
            return self._empty_features(planting_date, harvest_date)

        try:
            start_dt = datetime.strptime(planting_date, "%Y-%m-%d")
            end_dt = datetime.strptime(harvest_date, "%Y-%m-%d")
        except ValueError:
            return self._empty_features(planting_date, harvest_date)

        valid_indices = []
        for i, date_str in enumerate(dates):
            try:
                dt = datetime.strptime(date_str, "%Y-%m-%d")
                if start_dt <= dt <= end_dt:
                    valid_indices.append(i)
            except ValueError:
                continue

        if not valid_indices:
            return self._empty_features(planting_date, harvest_date)

        features = {}
        available_features = []
        missing_features = []
        feature_status = {}

        def _add(name, value, status, source_var=None):
            if value is not None and value != 0.0 and value != 0 and not (isinstance(value, float) and math.isnan(value)):
                features[name] = value
                available_features.append(name)
                feature_status[name] = {"status": status, "source_variable": source_var}
            else:
                missing_features.append(name)
                feature_status[name] = {"status": "UNAVAILABLE", "source_variable": source_var}

        precip = self._get_values(daily, "precipitation_sum", valid_indices)
        _add("Rainfall_Total_mm", self._safe_sum(precip), "AUTO_FETCHED", "precipitation_sum")
        _add("Rainfall_Seasonal_mm", self._seasonal_rainfall(daily, dates, start_dt, end_dt), "AUTO_FETCHED", "precipitation_sum")

        temp_mean = self._get_values(daily, "temperature_2m_mean", valid_indices)
        temp_max = self._get_values(daily, "temperature_2m_max", valid_indices)
        temp_min = self._get_values(daily, "temperature_2m_min", valid_indices)
        _add("Temp_Avg_C", self._safe_mean(temp_mean), "AUTO_FETCHED", "temperature_2m_mean")
        _add("Temp_Max_C", self._safe_mean(temp_max), "AUTO_FETCHED", "temperature_2m_max")
        _add("Temp_Min_C", self._safe_mean(temp_min), "AUTO_FETCHED", "temperature_2m_min")

        solar = self._get_values(daily, "shortwave_radiation_sum", valid_indices)
        _add("Solar_Radiation_MJ_m2_day", self._safe_mean(solar), "AUTO_FETCHED", "shortwave_radiation_sum")

        archive_humidity = self._get_values(daily, "relative_humidity_2m", valid_indices)
        archive_hum_mean = self._safe_mean(archive_humidity)
        if archive_hum_mean > 0:
            _add("Humidity_%", archive_hum_mean, "AUTO_FETCHED", "relative_humidity_2m")
        else:
            archive_dew = self._get_values(daily, "dew_point_2m", valid_indices)
            archive_dew_mean = self._safe_mean(archive_dew)
            if archive_dew_mean > 0 and len(temp_mean) > 0:
                t_avg = self._safe_mean(temp_mean)
                if t_avg > 0:
                    derived_rh = _derive_humidity_from_dewpoint(t_avg, archive_dew_mean)
                    derived_rh = max(50.0, min(derived_rh, 90.0))
                    _add("Humidity_%", round(derived_rh, 4), "DERIVED", "dew_point_2m+temperature_2m_mean")
                else:
                    missing_features.append("Humidity_%")
                    feature_status["Humidity_%"] = {"status": "UNAVAILABLE", "source_variable": "insufficient_data"}
            else:
                missing_features.append("Humidity_%")
                feature_status["Humidity_%"] = {"status": "UNAVAILABLE", "source_variable": "not_in_archive_dataset"}

        archive_wind = self._get_values(daily, "wind_speed_10m", valid_indices)
        archive_wind_mean = self._safe_mean(archive_wind)
        if archive_wind_mean > 0:
            _add("Wind_Speed_kmph", archive_wind_mean, "AUTO_FETCHED", "wind_speed_10m")
        else:
            archive_wind_max = self._get_values(daily, "wind_speed_10m_max", valid_indices)
            wind_max_mean = self._safe_mean(archive_wind_max)
            if wind_max_mean > 0:
                derived_wind = wind_max_mean * 0.65
                derived_wind = max(2.0, min(derived_wind, 15.0))
                _add("Wind_Speed_kmph", round(derived_wind, 4), "DERIVED", "wind_speed_10m_max")
            else:
                missing_features.append("Wind_Speed_kmph")
                feature_status["Wind_Speed_kmph"] = {"status": "UNAVAILABLE", "source_variable": "not_in_archive_dataset"}

        archive_et0 = self._get_values(daily, "et0_fao", valid_indices)
        archive_et0_mean = self._safe_mean(archive_et0)
        if archive_et0_mean > 0:
            _add("Evapotranspiration_mm_day", archive_et0_mean, "AUTO_FETCHED", "et0_fao")
        else:
            t_avg_val = self._safe_mean(temp_mean)
            t_max_val = self._safe_mean(temp_max)
            t_min_val = self._safe_mean(temp_min)
            solar_val = self._safe_mean(solar)
            if all(v > 0 for v in [t_avg_val, t_max_val, t_min_val, solar_val]):
                derived_et0 = _derive_et0_hargreaves(t_max_val, t_min_val, t_avg_val, solar_val)
                derived_et0 = max(2.0, min(derived_et0, 8.0))
                _add("Evapotranspiration_mm_day", round(derived_et0, 4), "DERIVED", "hargreaves_from_temp+radiation")
            else:
                missing_features.append("Evapotranspiration_mm_day")
                feature_status["Evapotranspiration_mm_day"] = {"status": "UNAVAILABLE", "source_variable": "insufficient_data"}

        archive_dew_vals = self._get_values(daily, "dew_point_2m", valid_indices)
        archive_dew_mean = self._safe_mean(archive_dew_vals)
        if archive_dew_mean > 0:
            _add("Dew_Point_C", archive_dew_mean, "AUTO_FETCHED", "dew_point_2m")
        else:
            t_avg_for_dew = self._safe_mean(temp_mean)
            rh_for_dew = features.get("Humidity_%", 0)
            if t_avg_for_dew > 0 and rh_for_dew > 0:
                derived_dew = _derive_dew_point(t_avg_for_dew, rh_for_dew)
                derived_dew = max(10.0, min(derived_dew, 25.0))
                _add("Dew_Point_C", round(derived_dew, 4), "DERIVED", "temperature_2m_mean+humidity")
            else:
                missing_features.append("Dew_Point_C")
                feature_status["Dew_Point_C"] = {"status": "UNAVAILABLE", "source_variable": "insufficient_data"}

        heat_days = self._count_threshold(temp_max, 35.0, "above")
        features["Heat_Stress_Days"] = heat_days
        available_features.append("Heat_Stress_Days")
        feature_status["Heat_Stress_Days"] = {"status": "DERIVED", "source_variable": "temperature_2m_max>35C"}

        frost_days = self._count_threshold(temp_min, 0.0, "below")
        features["Frost_Days"] = frost_days
        available_features.append("Frost_Days")
        feature_status["Frost_Days"] = {"status": "DERIVED", "source_variable": "temperature_2m_min<0C"}

        sm_vals = self._get_values(daily, "soil_moisture_0_to_7cm", valid_indices)
        if not sm_vals or all(v is None for v in sm_vals):
            sm_vals = self._get_values(daily, "soil_moisture_7_to_28cm", valid_indices)
        sm_mean = self._safe_mean_pct(sm_vals)
        if sm_mean > 0:
            _add("Soil_Moisture_%", sm_mean, "AUTO_FETCHED", "soil_moisture")
        else:
            missing_features.append("Soil_Moisture_%")
            feature_status["Soil_Moisture_%"] = {"status": "MANUAL_REQUIRED", "source_variable": "not_available_in_historical_archive"}

        soil_temp = self._get_values(daily, "soil_temperature_6cm", valid_indices)
        soil_temp_mean = self._safe_mean(soil_temp)
        if soil_temp_mean > 0:
            features["soil_temperature_c"] = soil_temp_mean
            feature_status["soil_temperature_c"] = {"status": "AUTO_FETCHED", "source_variable": "soil_temperature_6cm"}
        else:
            features["soil_temperature_c"] = None
            feature_status["soil_temperature_c"] = {"status": "UNAVAILABLE", "source_variable": "not_in_archive_dataset"}

        if elevation is not None and elevation > 0:
            features["Altitude_m"] = elevation
            available_features.append("Altitude_m")
            feature_status["Altitude_m"] = {"status": "AUTO_FETCHED", "source_variable": "elevation_api"}
        else:
            missing_features.append("Altitude_m")
            feature_status["Altitude_m"] = {"status": "UNAVAILABLE", "source_variable": "elevation_api"}

        features["_provenance"] = {
            "source": "Open-Meteo",
            "planting_date": planting_date,
            "harvest_date": harvest_date,
            "data_points_used": len(valid_indices),
            "total_days_in_period": (end_dt - start_dt).days + 1,
            "available_features": available_features,
            "missing_features": missing_features,
            "feature_status": feature_status,
            "retrieved_at": datetime.now().isoformat(),
        }

        return features

    def _get_values(
        self, daily: Dict[str, List], variable: str, indices: List[int]
    ) -> List[Optional[float]]:
        values = daily.get(variable, [])
        return [values[i] if i < len(values) else None for i in indices]

    @staticmethod
    def _safe_mean(values: List[Optional[float]]) -> float:
        valid = [v for v in values if v is not None and not (isinstance(v, float) and math.isnan(v))]
        if not valid:
            return 0.0
        return round(sum(valid) / len(valid), 4)

    @staticmethod
    def _safe_sum(values: List[Optional[float]]) -> float:
        valid = [v for v in values if v is not None and not (isinstance(v, float) and math.isnan(v))]
        if not valid:
            return 0.0
        return round(sum(valid), 4)

    @staticmethod
    def _safe_mean_pct(values: List[Optional[float]]) -> float:
        valid = [v for v in values if v is not None and not (isinstance(v, float) and math.isnan(v))]
        if not valid:
            return 0.0
        mean_volumetric = sum(valid) / len(valid)
        return round(mean_volumetric * 100.0, 4)

    def _seasonal_rainfall(
        self,
        daily: Dict[str, List],
        dates: List[str],
        start_dt: datetime,
        end_dt: datetime,
    ) -> float:
        precip = daily.get("precipitation_sum", [])
        seasonal_total = 0.0
        for i, date_str in enumerate(dates):
            try:
                dt = datetime.strptime(date_str, "%Y-%m-%d")
                if start_dt <= dt <= end_dt and dt.month in (6, 7, 8, 9):
                    if i < len(precip) and precip[i] is not None:
                        seasonal_total += precip[i]
            except ValueError:
                continue
        return round(seasonal_total, 4)

    @staticmethod
    def _count_threshold(
        values: List[Optional[float]], threshold: float, direction: str
    ) -> int:
        count = 0
        for v in values:
            if v is not None and not (isinstance(v, float) and math.isnan(v)):
                if direction == "above" and v > threshold:
                    count += 1
                elif direction == "below" and v < threshold:
                    count += 1
        return count

    @staticmethod
    def _empty_features(planting_date: str, harvest_date: str) -> Dict[str, Any]:
        return {
            "_provenance": {
                "source": "Open-Meteo",
                "status": "no_data",
                "planting_date": planting_date,
                "harvest_date": harvest_date,
                "data_points_used": 0,
                "available_features": [],
                "missing_features": ["Rainfall_Total_mm", "Rainfall_Seasonal_mm", "Temp_Avg_C", "Temp_Max_C", "Temp_Min_C", "Humidity_%", "Solar_Radiation_MJ_m2_day", "Wind_Speed_kmph", "Evapotranspiration_mm_day", "Dew_Point_C", "Heat_Stress_Days", "Frost_Days", "Soil_Moisture_%", "Altitude_m"],
                "feature_status": {k: {"status": "UNAVAILABLE", "source_variable": "no_api_data"} for k in ["Rainfall_Total_mm", "Rainfall_Seasonal_mm", "Temp_Avg_C", "Temp_Max_C", "Temp_Min_C", "Humidity_%", "Solar_Radiation_MJ_m2_day", "Wind_Speed_kmph", "Evapotranspiration_mm_day", "Dew_Point_C", "Heat_Stress_Days", "Frost_Days", "Soil_Moisture_%", "Altitude_m"]},
                "retrieved_at": datetime.now().isoformat(),
            },
        }


_weather_adapter = None


def get_weather_adapter() -> WeatherDataAdapter:
    global _weather_adapter
    if _weather_adapter is None:
        _weather_adapter = WeatherDataAdapter()
    return _weather_adapter

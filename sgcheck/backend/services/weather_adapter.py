import logging
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

OM_TO_INTERNAL = {
    "precipitation_sum": "precipitation",
    "temperature_2m_max": "temp_max",
    "temperature_2m_min": "temp_min",
    "temperature_2m_mean": "temp_mean",
    "relative_humidity_2m": "humidity",
    "shortwave_radiation_sum": "solar_radiation",
    "wind_speed_10m": "wind_speed",
    "wind_speed_10m_max": "wind_speed_max",
    "et0_fao": "et0",
    "dew_point_2m": "dew_point",
    "soil_moisture_0_to_7cm": "soil_moisture_0_7",
    "soil_moisture_7_to_28cm": "soil_moisture_7_28",
    "soil_moisture_28_to_100cm": "soil_moisture_28_100",
    "soil_temperature_6cm": "soil_temp_6cm",
}


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
            logger.warning("No daily data available for aggregation")
            return self._empty_features(planting_date, harvest_date)

        dates = daily.get("date", [])
        if not dates:
            return self._empty_features(planting_date, harvest_date)

        try:
            start_dt = datetime.strptime(planting_date, "%Y-%m-%d")
            end_dt = datetime.strptime(harvest_date, "%Y-%m-%d")
        except ValueError:
            logger.error(f"Invalid date format: planting={planting_date}, harvest={harvest_date}")
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
            logger.warning(f"No data points found for period {planting_date} to {harvest_date}")
            return self._empty_features(planting_date, harvest_date)

        features = {}
        available_features = []
        missing_features = []

        def _add_feature(name, value, om_var=None):
            if value is not None and value != 0.0 and value != 0:
                features[name] = value
                available_features.append(name)
            else:
                missing_features.append(name)

        precip = self._get_values(daily, "precipitation_sum", valid_indices)
        _add_feature("Rainfall_Total_mm", self._safe_sum(precip), "precipitation_sum")
        _add_feature("Rainfall_Seasonal_mm", self._seasonal_rainfall(daily, dates, start_dt, end_dt), "precipitation_sum")

        temp_mean = self._get_values(daily, "temperature_2m_mean", valid_indices)
        temp_max = self._get_values(daily, "temperature_2m_max", valid_indices)
        temp_min = self._get_values(daily, "temperature_2m_min", valid_indices)
        _add_feature("Temp_Avg_C", self._safe_mean(temp_mean), "temperature_2m_mean")
        _add_feature("Temp_Max_C", self._safe_mean(temp_max), "temperature_2m_max")
        _add_feature("Temp_Min_C", self._safe_mean(temp_min), "temperature_2m_min")

        humidity = self._get_values(daily, "relative_humidity_2m", valid_indices)
        humidity_mean = self._safe_mean(humidity)
        if humidity_mean > 0:
            _add_feature("Humidity_%", humidity_mean, "relative_humidity_2m")
        else:
            missing_features.append("Humidity_%")

        solar = self._get_values(daily, "shortwave_radiation_sum", valid_indices)
        _add_feature("Solar_Radiation_MJ_m2_day", self._safe_mean(solar), "shortwave_radiation_sum")

        wind = self._get_values(daily, "wind_speed_10m", valid_indices)
        wind_mean = self._safe_mean(wind)
        if wind_mean > 0:
            _add_feature("Wind_Speed_kmph", wind_mean, "wind_speed_10m")
        else:
            missing_features.append("Wind_Speed_kmph")

        et0 = self._get_values(daily, "et0_fao", valid_indices)
        et0_mean = self._safe_mean(et0)
        if et0_mean > 0:
            _add_feature("Evapotranspiration_mm_day", et0_mean, "et0_fao")
        else:
            missing_features.append("Evapotranspiration_mm_day")

        dew = self._get_values(daily, "dew_point_2m", valid_indices)
        dew_mean = self._safe_mean(dew)
        if dew_mean > 0:
            _add_feature("Dew_Point_C", dew_mean, "dew_point_2m")
        else:
            missing_features.append("Dew_Point_C")

        heat_days = self._count_threshold(temp_max, 35.0, "above")
        features["Heat_Stress_Days"] = heat_days
        available_features.append("Heat_Stress_Days")

        frost_days = self._count_threshold(temp_min, 0.0, "below")
        features["Frost_Days"] = frost_days
        available_features.append("Frost_Days")

        sm = self._get_values(daily, "soil_moisture_0_to_7cm", valid_indices)
        if not sm or all(v is None for v in sm):
            sm = self._get_values(daily, "soil_moisture_7_to_28cm", valid_indices)
        sm_mean = self._safe_mean_pct(sm)
        if sm_mean > 0:
            _add_feature("Soil_Moisture_%", sm_mean, "soil_moisture")
        else:
            missing_features.append("Soil_Moisture_%")

        soil_temp = self._get_values(daily, "soil_temperature_6cm", valid_indices)
        soil_temp_mean = self._safe_mean(soil_temp)
        if soil_temp_mean > 0:
            features["soil_temperature_c"] = soil_temp_mean
        else:
            features["soil_temperature_c"] = None

        if elevation is not None and elevation > 0:
            features["Altitude_m"] = elevation
            available_features.append("Altitude_m")
        else:
            missing_features.append("Altitude_m")

        features["_provenance"] = {
            "source": "Open-Meteo",
            "planting_date": planting_date,
            "harvest_date": harvest_date,
            "data_points_used": len(valid_indices),
            "total_days_in_period": (end_dt - start_dt).days + 1,
            "available_features": available_features,
            "missing_features": missing_features,
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
        valid = [v for v in values if v is not None and not (isinstance(v, float) and (v != v))]
        if not valid:
            return 0.0
        return round(sum(valid) / len(valid), 4)

    @staticmethod
    def _safe_sum(values: List[Optional[float]]) -> float:
        valid = [v for v in values if v is not None and not (isinstance(v, float) and (v != v))]
        if not valid:
            return 0.0
        return round(sum(valid), 4)

    @staticmethod
    def _safe_mean_pct(values: List[Optional[float]]) -> float:
        valid = [v for v in values if v is not None and not (isinstance(v, float) and (v != v))]
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
            if v is not None and not (isinstance(v, float) and (v != v)):
                if direction == "above" and v > threshold:
                    count += 1
                elif direction == "below" and v < threshold:
                    count += 1
        return count

    @staticmethod
    def _empty_features(planting_date: str, harvest_date: str) -> Dict[str, Any]:
        return {
            "Rainfall_Total_mm": 0.0,
            "Rainfall_Seasonal_mm": 0.0,
            "Temp_Avg_C": 0.0,
            "Temp_Max_C": 0.0,
            "Temp_Min_C": 0.0,
            "Humidity_%": 0.0,
            "Solar_Radiation_MJ_m2_day": 0.0,
            "Wind_Speed_kmph": 0.0,
            "Evapotranspiration_mm_day": 0.0,
            "Dew_Point_C": 0.0,
            "Heat_Stress_Days": 0,
            "Frost_Days": 0,
            "Soil_Moisture_%": 0.0,
            "soil_temperature_c": 0.0,
            "Altitude_m": 0.0,
            "_provenance": {
                "source": "Open-Meteo",
                "status": "no_data",
                "planting_date": planting_date,
                "harvest_date": harvest_date,
                "data_points_used": 0,
                "retrieved_at": datetime.now().isoformat(),
            },
        }


_weather_adapter = None


def get_weather_adapter() -> WeatherDataAdapter:
    global _weather_adapter
    if _weather_adapter is None:
        _weather_adapter = WeatherDataAdapter()
    return _weather_adapter

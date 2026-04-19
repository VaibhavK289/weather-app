use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct WeatherReport {
    pub city: String,
    pub country: Option<String>,
    pub timezone: String,
    pub latitude: f64,
    pub longitude: f64,
    pub current: CurrentWeather,
    pub hourly: Vec<HourlyForecast>,
    pub daily: Vec<DailyForecast>,
    pub air_quality: Option<AirQuality>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct CurrentWeather {
    pub temperature_c: f32,
    pub apparent_temperature_c: f32,
    pub humidity: u8,
    pub description: String,
    pub weather_code: i32,
    pub is_day: bool,
    pub precipitation_mm: f32,
    pub pressure_hpa: f32,
    pub wind_kmh: f32,
    pub wind_direction_deg: i32,
    pub visibility_km: f32,
    pub uv_index: f32,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct HourlyForecast {
    pub time: String,
    pub temperature_c: f32,
    pub weather_code: i32,
    pub precipitation_probability: u8,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct DailyForecast {
    pub date: String,
    pub weather_code: i32,
    pub description: String,
    pub temperature_max_c: f32,
    pub temperature_min_c: f32,
    pub sunrise: String,
    pub sunset: String,
    pub precipitation_probability_max: u8,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct AirQuality {
    pub us_aqi: Option<u16>,
    pub pm2_5: Option<f32>,
    pub pm10: Option<f32>,
}

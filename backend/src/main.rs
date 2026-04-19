use axum::{
    http::StatusCode,
    extract::Path,
    routing::get,
    Json, Router,
};
use reqwest::Client;
use serde::Deserialize;
use shared::{AirQuality, CurrentWeather, DailyForecast, HourlyForecast, WeatherReport};
use std::net::SocketAddr;
use std::env;
use tower_http::cors::CorsLayer;

async fn health() -> &'static str {
    "ok"
}

#[derive(Deserialize)]
struct GeoSearchResponse {
    results: Option<Vec<GeoResult>>,
}

#[derive(Deserialize)]
struct GeoResult {
    name: String,
    country: Option<String>,
    latitude: f64,
    longitude: f64,
}

#[derive(Deserialize)]
struct ForecastResponse {
    timezone: String,
    current: ForecastCurrent,
    hourly: ForecastHourly,
    daily: ForecastDaily,
}

#[derive(Deserialize)]
struct ForecastCurrent {
    temperature_2m: f32,
    relative_humidity_2m: u8,
    apparent_temperature: f32,
    weather_code: i32,
    is_day: u8,
    precipitation: f32,
    pressure_msl: f32,
    wind_speed_10m: f32,
    wind_direction_10m: i32,
    visibility: f32,
    uv_index: f32,
}

#[derive(Deserialize)]
struct ForecastHourly {
    time: Vec<String>,
    temperature_2m: Vec<f32>,
    precipitation_probability: Vec<u8>,
    weather_code: Vec<i32>,
}

#[derive(Deserialize)]
struct ForecastDaily {
    time: Vec<String>,
    weather_code: Vec<i32>,
    temperature_2m_max: Vec<f32>,
    temperature_2m_min: Vec<f32>,
    sunrise: Vec<String>,
    sunset: Vec<String>,
    precipitation_probability_max: Vec<u8>,
}

#[derive(Deserialize)]
struct AirResponse {
    current: Option<AirCurrent>,
}

#[derive(Deserialize)]
struct AirCurrent {
    us_aqi: Option<u16>,
    pm2_5: Option<f32>,
    pm10: Option<f32>,
}

async fn get_weather(Path(city): Path<String>) -> Result<Json<WeatherReport>, (StatusCode, String)> {
    let client = Client::new();

    let geo = client
        .get("https://geocoding-api.open-meteo.com/v1/search")
        .query(&[
            ("name", city.as_str()),
            ("count", "1"),
            ("language", "en"),
            ("format", "json"),
        ])
        .send()
        .await
        .map_err(|e| (StatusCode::BAD_GATEWAY, format!("geocoding request failed: {e}")))?
        .error_for_status()
        .map_err(|e| (StatusCode::BAD_GATEWAY, format!("geocoding error: {e}")))?
        .json::<GeoSearchResponse>()
        .await
        .map_err(|e| (StatusCode::BAD_GATEWAY, format!("geocoding decode failed: {e}")))?;

    let location = geo
        .results
        .and_then(|mut list| list.drain(..).next())
        .ok_or((StatusCode::NOT_FOUND, "city not found".to_string()))?;

    let latitude = location.latitude;
    let longitude = location.longitude;

    let forecast = client
        .get("https://api.open-meteo.com/v1/forecast")
        .query(&[
            ("latitude", latitude.to_string()),
            ("longitude", longitude.to_string()),
            (
                "current",
                "temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,is_day,precipitation,pressure_msl,wind_speed_10m,wind_direction_10m,visibility,uv_index".to_string(),
            ),
            (
                "hourly",
                "temperature_2m,precipitation_probability,weather_code".to_string(),
            ),
            (
                "daily",
                "weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,precipitation_probability_max".to_string(),
            ),
            ("timezone", "auto".to_string()),
            ("forecast_days", "7".to_string()),
        ])
        .send()
        .await
        .map_err(|e| (StatusCode::BAD_GATEWAY, format!("forecast request failed: {e}")))?
        .error_for_status()
        .map_err(|e| (StatusCode::BAD_GATEWAY, format!("forecast error: {e}")))?
        .json::<ForecastResponse>()
        .await
        .map_err(|e| (StatusCode::BAD_GATEWAY, format!("forecast decode failed: {e}")))?;

    let air_quality = match client
        .get("https://air-quality-api.open-meteo.com/v1/air-quality")
        .query(&[
            ("latitude", latitude.to_string()),
            ("longitude", longitude.to_string()),
            ("current", "us_aqi,pm2_5,pm10".to_string()),
            ("timezone", "auto".to_string()),
        ])
        .send()
        .await
    {
        Ok(resp) => match resp.error_for_status() {
            Ok(ok_resp) => ok_resp
                .json::<AirResponse>()
                .await
                .ok()
                .and_then(|decoded| decoded.current)
                .map(|current| AirQuality {
                    us_aqi: current.us_aqi,
                    pm2_5: current.pm2_5,
                    pm10: current.pm10,
                }),
            Err(_) => None,
        },
        Err(_) => None,
    };

    let hourly = forecast
        .hourly
        .time
        .iter()
        .zip(forecast.hourly.temperature_2m.iter())
        .zip(forecast.hourly.precipitation_probability.iter())
        .zip(forecast.hourly.weather_code.iter())
        .take(12)
        .map(|(((time, temperature), precipitation_probability), weather_code)| HourlyForecast {
            time: time.clone(),
            temperature_c: *temperature,
            weather_code: *weather_code,
            precipitation_probability: *precipitation_probability,
        })
        .collect::<Vec<_>>();

    let daily = forecast
        .daily
        .time
        .iter()
        .zip(forecast.daily.weather_code.iter())
        .zip(forecast.daily.temperature_2m_max.iter())
        .zip(forecast.daily.temperature_2m_min.iter())
        .zip(forecast.daily.sunrise.iter())
        .zip(forecast.daily.sunset.iter())
        .zip(forecast.daily.precipitation_probability_max.iter())
        .map(
            |((((((date, weather_code), temp_max), temp_min), sunrise), sunset), precipitation_prob)| {
                DailyForecast {
                    date: date.clone(),
                    weather_code: *weather_code,
                    description: weather_code_to_description(*weather_code).to_string(),
                    temperature_max_c: *temp_max,
                    temperature_min_c: *temp_min,
                    sunrise: sunrise.clone(),
                    sunset: sunset.clone(),
                    precipitation_probability_max: *precipitation_prob,
                }
            },
        )
        .collect::<Vec<_>>();

    let current = CurrentWeather {
        temperature_c: forecast.current.temperature_2m,
        apparent_temperature_c: forecast.current.apparent_temperature,
        humidity: forecast.current.relative_humidity_2m,
        description: weather_code_to_description(forecast.current.weather_code).to_string(),
        weather_code: forecast.current.weather_code,
        is_day: forecast.current.is_day == 1,
        precipitation_mm: forecast.current.precipitation,
        pressure_hpa: forecast.current.pressure_msl,
        wind_kmh: forecast.current.wind_speed_10m,
        wind_direction_deg: forecast.current.wind_direction_10m,
        visibility_km: forecast.current.visibility / 1000.0,
        uv_index: forecast.current.uv_index,
    };

    let report = WeatherReport {
        city: location.name,
        country: location.country,
        timezone: forecast.timezone,
        latitude,
        longitude,
        current,
        hourly,
        daily,
        air_quality,
    };

    Ok(Json(report))
}

fn weather_code_to_description(code: i32) -> &'static str {
    match code {
        0 => "Clear sky",
        1 => "Mainly clear",
        2 => "Partly cloudy",
        3 => "Overcast",
        45 | 48 => "Fog",
        51 | 53 | 55 => "Drizzle",
        56 | 57 => "Freezing drizzle",
        61 | 63 | 65 => "Rain",
        66 | 67 => "Freezing rain",
        71 | 73 | 75 => "Snow fall",
        77 => "Snow grains",
        80 | 81 | 82 => "Rain showers",
        85 | 86 => "Snow showers",
        95 => "Thunderstorm",
        96 | 99 => "Thunderstorm with hail",
        _ => "Unknown conditions",
    }
}

#[tokio::main]
async fn main() {
    // Build the Axum application
    let app = Router::new()
        .route("/", get(health))
        .route("/health", get(health))
        .route("/weather/:city", get(get_weather))
        // Open CORS so the browser (Trunk) or Tauri can access this API
        .layer(CorsLayer::permissive());

    let port = env::var("PORT")
        .ok()
        .and_then(|value| value.parse::<u16>().ok())
        .unwrap_or(8000);

    let addr = SocketAddr::from(([0, 0, 0, 0], port));
    println!("Backend API listening on {}", addr);
    
    let listener = tokio::net::TcpListener::bind(addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}

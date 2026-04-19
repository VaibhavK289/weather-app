use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct WeatherReport {
    pub city: String,
    pub temperature: f32, // e.g., 22.5
    pub description: String, // e.g., "Partly Cloudy"
    pub humidity: u8,
}

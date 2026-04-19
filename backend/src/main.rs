use axum::{
    extract::Path,
    routing::get,
    Json, Router,
};
use shared::WeatherReport;
use std::net::SocketAddr;
use tower_http::cors::CorsLayer;

async fn get_weather(Path(city): Path<String>) -> Json<WeatherReport> {
    // For now, return mock data. 
    // Later, you would query a real weather API (like OpenWeatherMap) here.
    let mock_report = WeatherReport {
        city,
        temperature: 22.5,
        description: "Partly Cloudy".to_string(),
        humidity: 60,
    };
    Json(mock_report)
}

#[tokio::main]
async fn main() {
    // Build the Axum application
    let app = Router::new()
        .route("/weather/:city", get(get_weather))
        // Open CORS so the browser (Trunk) or Tauri can access this API
        .layer(CorsLayer::permissive());

    let addr = SocketAddr::from(([127, 0, 0, 1], 3000));
    println!("Backend API listening on {}", addr);
    
    let listener = tokio::net::TcpListener::bind(addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}

use axum::{
    routing::{get, post},
    Json, Router,
};
use shared::CalendarEvent;
use std::net::SocketAddr;
use tower_http::cors::CorsLayer;

async fn get_events() -> Json<Vec<CalendarEvent>> {
    // For now, return an empty array of events
    // Later, you would query SQLx here
    Json(vec![])
}

#[tokio::main]
async fn main() {
    // Build the Axum application
    let app = Router::new()
        .route("/events", get(get_events))
        // Open CORS so the browser (Trunk) or Tauri can access this API
        .layer(CorsLayer::permissive());

    let addr = SocketAddr::from(([127, 0, 0, 1], 3000));
    println!("Backend API listening on {}", addr);
    
    let listener = tokio::net::TcpListener::bind(addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}

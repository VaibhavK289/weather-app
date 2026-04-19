use leptos::*;
use shared::WeatherReport;

#[component]
fn App() -> impl IntoView {
    // A signal to hold what the user types in the input box
    let (city, set_city) = create_signal(String::new());
    
    // A signal to trigger fetching when the search button is clicked
    let (search_query, set_search_query) = create_signal("London".to_string());

    // Fetch data from backend whenever `search_query` changes
    let weather = create_resource(
        move || search_query.get(), 
        |query| async move {
            let url = format!("http://127.0.0.1:3000/weather/{}", query);
            let res = reqwasm::http::Request::get(&url)
                .send()
                .await
                .ok()?;
            
            res.json::<WeatherReport>().await.ok()
        }
    );

    view! {
        <style>"
            body { margin: 0; padding: 0; background: linear-gradient(135deg, #8172b0 0%, #4a2176 100%); font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: white; display: flex; justify-content: center; align-items: center; min-height: 100vh; }
            .app-container { width: 360px; height: 750px; background: linear-gradient(180deg, #2a1656 0%, #5a1e67 100%); border-radius: 40px; box-shadow: 0 20px 50px rgba(0,0,0,0.5), inset 0 0 0 1px rgba(255,255,255,0.1); padding: 40px 20px; position: relative; overflow: hidden; display: flex; flex-direction: column; align-items: center; box-sizing: border-box; }
            .search-container { display: flex; width: 100%; gap: 10px; margin-bottom: 40px; }
            .search-input { flex: 1; background: rgba(255, 255, 255, 0.1); border: 2px solid rgba(255, 255, 255, 0.05); border-radius: 20px; padding: 12px 20px; color: white; font-size: 16px; outline: none; transition: 0.3s; }
            .search-input:focus { border-color: rgba(255, 255, 255, 0.3); }
            .search-input::placeholder { color: rgba(255, 255, 255, 0.5); }
            .search-btn { background: #eab308; border: none; border-radius: 20px; padding: 0 20px; color: #1e1b4b; font-weight: 700; font-size: 16px; cursor: pointer; transition: transform 0.1s, background 0.3s; }
            .search-btn:active { transform: scale(0.95); }
            .search-btn:hover { background: #facc15; }
            .weather-main { display: flex; flex-direction: column; align-items: center; width: 100%; height: 100%; }
            .weather-icon { font-size: 150px; margin: 10px 0; line-height: 1.1; text-shadow: 0 15px 30px rgba(0,0,0,0.4); filter: drop-shadow(0px 10px 10px rgba(0,0,0,0.3)); }
            .temperature { font-size: 84px; font-weight: 600; margin: 0; line-height: 1; letter-spacing: -3px; text-shadow: 0 5px 15px rgba(0,0,0,0.2); }
            .city-name { font-size: 28px; font-weight: 500; margin: 10px 0 5px 0; letter-spacing: 1px; }
            .description { font-size: 18px; color: rgba(255, 255, 255, 0.7); margin: 0; text-transform: capitalize; }
            .details-card { background: rgba(255, 255, 255, 0.08); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 28px; width: 100%; padding: 25px 0; margin-top: auto; display: flex; justify-content: space-around; box-shadow: 0 15px 35px rgba(0,0,0,0.2); }
            .detail-item { display: flex; flex-direction: column; align-items: center; gap: 8px; }
            .detail-label { font-size: 13px; color: rgba(255, 255, 255, 0.5); text-transform: uppercase; letter-spacing: 1px; font-weight: 600; }
            .detail-value { font-size: 24px; font-weight: 600; }
            .loading-text { font-size: 18px; color: rgba(255, 255, 255, 0.7); margin-top: 50px; }
            .error-text { text-align: center; color: #ff8a8a; background: rgba(255, 0, 0, 0.1); padding: 15px; border-radius: 15px; margin-top: 20px; border: 1px solid rgba(255,0,0,0.2); }
        "</style>
        
        <div class="app-container">
            <div class="search-container">
                <input 
                    class="search-input"
                    type="text" 
                    placeholder="Enter city..."
                    on:input=move |ev| set_city.set(event_target_value(&ev))
                    prop:value=city
                />
                <button class="search-btn" on:click=move |_| set_search_query.set(city.get())>
                    "Search"
                </button>
            </div>

            <Suspense fallback=move || view! { <div class="loading-text">"Loading weather..."</div> }>
                {move || {
                    weather.get().map(|data| {
                        if let Some(weather) = data {
                            // Assign a cool dynamic emoji icon based on description
                            let icon = if weather.description.to_lowercase().contains("cloud") { "☁️" } 
                                       else if weather.description.to_lowercase().contains("rain") { "🌧️" }
                                       else { "☀️" };

                            view! {
                                <div class="weather-main">
                                    <div class="weather-icon">{icon}</div>
                                    <h1 class="temperature">{weather.temperature.to_string()} "°"</h1>
                                    <h2 class="city-name">{weather.city}</h2>
                                    <p class="description">{weather.description}</p>
                                    
                                    <div class="details-card">
                                        <div class="detail-item">
                                            <span class="detail-label">"Humidity"</span>
                                            <span class="detail-value">{weather.humidity.to_string()} "%"</span>
                                        </div>
                                        <div class="detail-item">
                                            <span class="detail-label">"Wind"</span>
                                            <span class="detail-value">"12 km/h"</span>
                                        </div>
                                    </div>
                                </div>
                            }.into_any()
                        } else {
                            view! {
                                <div class="error-text">
                                    <p>"City not found or server error."</p>
                                </div>
                            }.into_any()
                        }
                    })
                }}
            </Suspense>
        </div>
    }
}

fn main() {
    console_error_panic_hook::set_once();
    mount_to_body(|| view! { <App/> })
}

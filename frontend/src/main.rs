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
        <div style="padding: 20px; font-family: sans-serif;">
            <h1>"Rust Weather App"</h1>
            
            <div style="margin-bottom: 20px;">
                <input 
                    type="text" 
                    placeholder="Enter city..."
                    on:input=move |ev| set_city.set(event_target_value(&ev))
                    prop:value=city
                />
                <button on:click=move |_| set_search_query.set(city.get())>
                    "Search"
                </button>
            </div>

            <Suspense fallback=move || view! { <p>"Loading weather..."</p> }>
                {move || {
                    weather.get().map(|data| {
                        if let Some(weather) = data {
                            view! {
                                <div style="border: 1px solid #ccc; padding: 15px; border-radius: 8px; max-width: 300px;">
                                    <h2>{weather.city}</h2>
                                    <h1>{weather.temperature.to_string()} "°C"</h1>
                                    <p><strong>"Conditions: "</strong> {weather.description}</p>
                                    <p><strong>"Humidity: "</strong> {weather.humidity.to_string()} "%"</p>
                                </div>
                            }.into_any()
                        } else {
                            view! {
                                <p>"City not found or error loading data."</p>
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

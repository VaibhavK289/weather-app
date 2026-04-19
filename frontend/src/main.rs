use leptos::*;
use shared::CalendarEvent;

#[component]
fn App() -> impl IntoView {
    // 1. Fetch data from backend when initially loaded
    let events = create_resource(
        || (), 
        |_| async move {
            let res = reqwasm::http::Request::get("http://127.0.0.1:3000/events")
                .send()
                .await
                .ok()?; // In production use proper error handling
            
            res.json::<Vec<CalendarEvent>>().await.ok()
        }
    );

    view! {
        <div>
            <h1>"Rust Tauri/Leptos Calendar"</h1>
            <p>"Welcome to your full-stack Rust app."</p>

            <Suspense fallback=move || view! { <p>"Loading events..."</p> }>
                {move || {
                    events.get().map(|mut data| {
                        // Empty state handling
                        if data.is_empty() {
                            return view! { <p>"No calendar events scheduled!"</p> }.into_any();
                        }
                        
                        view! {
                            <ul>
                                {data.into_iter().map(|e| view! { <li>{e.title}</li> }).collect_view()}
                            </ul>
                        }.into_any()
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

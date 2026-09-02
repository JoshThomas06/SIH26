use std::sync::Arc;
use std::time::{Duration, Instant};

use axum::{
    http::Method,
    routing::{get, post},
    Router,
};
use tokio::sync::RwLock;
use tower_http::cors::{Any, CorsLayer};
use tower_http::trace::TraceLayer;
use tracing::{info, warn};
use tracing_subscriber::EnvFilter;

use aegis_backend::api::routes;
use aegis_backend::api::websocket;
use aegis_backend::config::Settings;
use aegis_backend::core::runtime::SimulationRuntime;
use aegis_backend::AppState;

#[tokio::main]
async fn main() {
    let filter = EnvFilter::try_from_default_env()
        .unwrap_or_else(|_| "aegis_backend=info,tower_http=debug".into());
    tracing_subscriber::fmt()
        .with_env_filter(filter)
        .with_target(true)
        .init();

    let settings = Settings::from_env();
    let settings = Arc::new(settings);

    info!(
        app = %settings.app_name,
        bands = settings.num_bands,
        sweep_ms = settings.sweep_ms,
        telemetry_hz = settings.telemetry_hz,
        sim_speed = settings.sim_speed,
        "initializing simulation runtime"
    );

    let runtime = Arc::new(RwLock::new(SimulationRuntime::new(settings.as_ref().clone())));
    let auth = Arc::new(RwLock::new(aegis_backend::api::auth::AuthState::new(
        settings.as_ref().clone(),
    )));

    let state = AppState {
        runtime: runtime.clone(),
        auth: auth.clone(),
        settings: settings.clone(),
    };

    let runtime_clone = runtime.clone();
    let settings_clone = settings.clone();
    tokio::spawn(async move {
        let mut last_heartbeat = Instant::now();
        loop {
            {
                let mut rt = runtime_clone.write().await;
                if rt.running {
                    rt.tick();
                    if last_heartbeat.elapsed().as_secs() >= 5 {
                        let m = &rt.latest.metrics;
                        info!(
                            hits = m.hits,
                            misses = m.misses,
                            pd = m.probability_of_detection,
                            pfa = m.probability_of_false_alarm,
                            reward = m.current_reward_score,
                            tuned_band = rt.latest.active_tuned_band + 1,
                            mode = %rt.latest.scheduler_mode,
                            "simulation heartbeat"
                        );
                        last_heartbeat = Instant::now();
                    }
                } else {
                    rt.latest.running = false;
                    rt.latest.timestamp_us =
                        std::time::SystemTime::now()
                            .duration_since(std::time::UNIX_EPOCH)
                            .unwrap()
                            .as_micros() as u64;
                }
            }
            let period = (settings_clone.sweep_ms / 1000.0
                / settings_clone.sim_speed.max(0.25))
                .clamp(0.01, 0.8);
            tokio::time::sleep(Duration::from_secs_f64(period)).await;
        }
    });

    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods([Method::GET, Method::POST, Method::PUT, Method::DELETE])
        .allow_headers(Any);

    let app = Router::new()
        .route("/", get(root))
        .route("/api/v1/auth/register", post(routes::register))
        .route("/api/v1/auth/login", post(routes::login))
        .route("/api/v1/scheduler/config", post(routes::update_config))
        .route(
            "/api/v1/simulation/:action",
            post(routes::simulation_command),
        )
        .route("/api/v1/sessions", get(routes::list_sessions))
        .route(
            "/api/v1/sessions/:session_id",
            get(routes::get_session),
        )
        .route("/api/v1/health", get(routes::health))
        .route("/api/v1/telemetry", get(routes::telemetry))
        .route("/ws/telemetry", get(websocket::telemetry_socket))
        .layer(TraceLayer::new_for_http())
        .layer(cors)
        .with_state(state);

    let bind = "0.0.0.0:8010";
    match tokio::net::TcpListener::bind(bind).await {
        Ok(listener) => {
            info!(bind, "server listening");
            if let Err(e) = axum::serve(listener, app).await {
                warn!(error = %e, "server error");
                std::process::exit(1);
            }
        }
        Err(e) => {
            warn!(error = %e, bind, "failed to bind listener");
            std::process::exit(1);
        }
    }
}

async fn root() -> axum::Json<serde_json::Value> {
    let settings = Settings::from_env();
    axum::Json(serde_json::json!({
        "name": settings.app_name,
        "problem": "SIH 26055"
    }))
}

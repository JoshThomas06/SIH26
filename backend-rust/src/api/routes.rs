use std::sync::Arc;

use axum::{
    extract::{Path, State},
    http::HeaderMap,
    response::IntoResponse,
    Json,
};
use serde::{Deserialize, Serialize};
use tokio::sync::RwLock;
use tracing::{info, warn};

use crate::api::auth::AuthResponse;
use crate::core::scheduler::SchedulerMode;

#[derive(Debug, Deserialize)]
pub struct SchedulerConfig {
    pub mode: Option<SchedulerMode>,
    pub eager_agent_weight: Option<f64>,
    pub revisit_agent_weight: Option<f64>,
    pub aoi_decay_factor: Option<f64>,
    pub dwell_time_override_ms: Option<f64>,
    pub manual_band: Option<usize>,
    pub ignore_band: Option<usize>,
    pub unignore_band: Option<usize>,
    pub sweep_ms: Option<f64>,
    pub hostile_spawn: Option<f64>,
    pub noise_floor: Option<f64>,
    pub sim_speed: Option<f64>,
    pub epsilon: Option<f64>,
}

#[derive(Debug, Deserialize)]
pub struct AuthRequest {
    pub email: String,
    pub password: String,
    pub name: Option<String>,
}

#[derive(Debug, Default, Serialize)]
pub struct ApiResponse {
    pub ok: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub message: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub running: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub mode: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub sweep_ms: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub hostile_spawn: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub noise_floor: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub sim_speed: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub ignored: Option<Vec<usize>>,
}

pub async fn require_auth(
    headers: &HeaderMap,
    state: &Arc<RwLock<crate::api::auth::AuthState>>,
) -> Result<(), impl IntoResponse> {
    let auth_header = headers
        .get("authorization")
        .and_then(|v| v.to_str().ok());

    match auth_header {
        Some(auth) if auth.to_lowercase().starts_with("bearer ") => {
            let token = auth.splitn(2, ' ').nth(1).unwrap_or("").trim();
            let auth_state = state.read().await;
            match auth_state.decode_token(token) {
                Ok(_) => Ok(()),
                Err(e) => {
                    warn!(reason = %e, "authentication rejected");
                    Err((
                        axum::http::StatusCode::UNAUTHORIZED,
                        Json(serde_json::json!({"detail": e})),
                    ))
                }
            }
        }
        _ => {
            warn!("authentication rejected: missing bearer token");
            Err((
                axum::http::StatusCode::UNAUTHORIZED,
                Json(serde_json::json!({"detail": "Missing bearer token"})),
            ))
        }
    }
}

pub async fn update_config(
    State(state): State<crate::AppState>,
    headers: HeaderMap,
    Json(body): Json<SchedulerConfig>,
) -> impl IntoResponse {
    if let Err(resp) = require_auth(&headers, &state.auth).await {
        return resp.into_response();
    }

    let mut runtime = state.runtime.write().await;
    runtime.configure(
        body.sweep_ms,
        body.hostile_spawn,
        body.noise_floor,
        body.sim_speed,
        body.mode,
        body.eager_agent_weight,
        body.revisit_agent_weight,
        body.aoi_decay_factor,
        body.dwell_time_override_ms,
        body.manual_band,
        body.ignore_band,
        body.unignore_band,
        body.epsilon,
    );

    let ignored = runtime.scheduler.ignored.iter().copied().collect();
    let response = ApiResponse {
        ok: true,
        mode: Some(runtime.scheduler.mode.as_str().to_string()),
        sweep_ms: Some(runtime.sweep_ms),
        hostile_spawn: Some(runtime.hostile_spawn),
        noise_floor: Some(runtime.noise_floor),
        sim_speed: Some(runtime.sim_speed),
        ignored: Some(ignored),
        ..Default::default()
    };

    Json(response).into_response()
}

pub async fn simulation_command(
    State(state): State<crate::AppState>,
    headers: HeaderMap,
    Path(action): Path<String>,
) -> impl IntoResponse {
    if let Err(resp) = require_auth(&headers, &state.auth).await {
        return resp.into_response();
    }

    let mut runtime = state.runtime.write().await;
    match action.as_str() {
        "start" => runtime.start(),
        "pause" => runtime.pause(),
        "reset" => runtime.reset(),
        _ => {
            warn!(action = %action, "invalid simulation command");
            return (
                axum::http::StatusCode::BAD_REQUEST,
                Json(serde_json::json!({"detail": "Invalid action"})),
            )
                .into_response();
        }
    }

    let response = ApiResponse {
        ok: true,
        running: Some(runtime.running),
        mode: Some(runtime.scheduler.mode.as_str().to_string()),
        ..Default::default()
    };

    Json(response).into_response()
}

pub async fn list_sessions(
    State(state): State<crate::AppState>,
    headers: HeaderMap,
) -> impl IntoResponse {
    if let Err(resp) = require_auth(&headers, &state.auth).await {
        return resp.into_response();
    }

    let runtime = state.runtime.read().await;
    let sessions = runtime.archive.list_sessions();
    Json(serde_json::json!({"sessions": sessions})).into_response()
}

pub async fn get_session(
    State(state): State<crate::AppState>,
    headers: HeaderMap,
    Path(session_id): Path<String>,
) -> impl IntoResponse {
    if session_id == "current" {
        return current_session_inner(state, headers).await;
    }

    if let Err(resp) = require_auth(&headers, &state.auth).await {
        return resp.into_response();
    }

    let runtime = state.runtime.read().await;
    match runtime.archive.get(&session_id) {
        Some(session) => Json(session.clone()).into_response(),
        None => (
            axum::http::StatusCode::NOT_FOUND,
            Json(serde_json::json!({"detail": "Session not found"})),
        )
            .into_response(),
    }
}

async fn current_session_inner(state: crate::AppState, headers: HeaderMap) -> axum::response::Response {
    if let Err(resp) = require_auth(&headers, &state.auth).await {
        return resp.into_response();
    }

    let runtime = state.runtime.read().await;
    if let Some(ref current) = runtime.archive.current {
        return Json(current.clone()).into_response();
    }

    if let Some(session) = runtime.archive.sessions.first() {
        return Json(session.clone()).into_response();
    }

    use crate::core::archive::{compose_summary, Session};
    let metrics_value = serde_json::to_value(&runtime.latest.metrics).unwrap();
    let metrics_map: std::collections::HashMap<String, serde_json::Value> = metrics_value
        .as_object()
        .unwrap()
        .iter()
        .map(|(k, v)| (k.clone(), v.clone()))
        .collect();
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_secs_f64();
    let summary_session = Session {
        id: "placeholder".to_string(),
        label: "NO-RUN".to_string(),
        started_at: now,
        ended_at: None,
        status: "IDLE".to_string(),
        mode: runtime.latest.scheduler_mode.clone(),
        samples: Vec::new(),
        flags: Vec::new(),
        logs: Vec::new(),
        summary: String::new(),
        metrics_end: metrics_map,
    };
    let summary = compose_summary(&summary_session, false);

    Json(serde_json::json!({
        "id": null,
        "label": "NO-RUN",
        "status": "IDLE",
        "mode": runtime.latest.scheduler_mode,
        "samples": [],
        "flags": [],
        "logs": [],
        "summary": summary,
        "metrics_end": runtime.latest.metrics,
    }))
    .into_response()
}

pub async fn health() -> Json<serde_json::Value> {
    Json(serde_json::json!({
        "status": "ok",
        "service": "aegis-ew-scheduler"
    }))
}

pub async fn telemetry(
    State(state): State<crate::AppState>,
) -> Json<crate::core::runtime::TelemetryPayload> {
    let runtime = state.runtime.read().await;
    Json(runtime.latest.clone())
}

pub async fn register(
    State(state): State<crate::AppState>,
    Json(body): Json<AuthRequest>,
) -> Result<Json<AuthResponse>, (axum::http::StatusCode, Json<serde_json::Value>)> {
    let mut auth = state.auth.write().await;
    match auth.register(&body.email, &body.password, body.name.as_deref()) {
        Ok(response) => {
            info!(email = %body.email, "user registered");
            Ok(Json(response))
        }
        Err(e) => {
            warn!(email = %body.email, reason = %e, "registration failed");
            Err((
                axum::http::StatusCode::CONFLICT,
                Json(serde_json::json!({"detail": e})),
            ))
        }
    }
}

pub async fn login(
    State(state): State<crate::AppState>,
    Json(body): Json<AuthRequest>,
) -> Result<Json<AuthResponse>, (axum::http::StatusCode, Json<serde_json::Value>)> {
    let auth = state.auth.read().await;
    match auth.login(&body.email, &body.password) {
        Ok(response) => {
            info!(email = %body.email, "user logged in");
            Ok(Json(response))
        }
        Err(e) => {
            warn!(email = %body.email, reason = %e, "login failed");
            Err((
                axum::http::StatusCode::UNAUTHORIZED,
                Json(serde_json::json!({"detail": e})),
            ))
        }
    }
}

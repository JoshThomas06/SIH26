use axum::{
    extract::{State, WebSocketUpgrade},
    response::IntoResponse,
};
use futures::StreamExt;
use tracing::{info, warn};

pub async fn telemetry_socket(
    ws: WebSocketUpgrade,
    State(state): State<crate::AppState>,
) -> impl IntoResponse {
    info!("telemetry websocket upgrade requested");
    ws.on_upgrade(move |socket| handle_socket(socket, state))
}

async fn handle_socket(
    mut socket: axum::extract::ws::WebSocket,
    state: crate::AppState,
) {
    info!("telemetry client connected");
    {
        let runtime = state.runtime.read().await;
        let payload = runtime.latest.clone();
        if socket
            .send(axum::extract::ws::Message::Text(
                serde_json::to_string(&payload).unwrap().into(),
            ))
            .await
            .is_err()
        {
            warn!("telemetry client dropped before initial frame");
            return;
        }
    }

    let period = std::time::Duration::from_secs_f64(1.0 / state.settings.telemetry_hz);

    loop {
        tokio::select! {
            _ = tokio::time::sleep(period) => {
                let payload = {
                    let runtime = state.runtime.read().await;
                    runtime.latest.clone()
                };
                let msg = serde_json::to_string(&payload).unwrap();
                if socket
                    .send(axum::extract::ws::Message::Text(msg.into()))
                    .await
                    .is_err()
                {
                    break;
                }
            }
            msg = socket.next() => {
                match msg {
                    Some(Ok(_)) => {}
                    _ => break,
                }
            }
        }
    }
    info!("telemetry client disconnected");
}

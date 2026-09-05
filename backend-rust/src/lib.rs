pub mod api;
pub mod config;
pub mod core;
pub mod data;

use std::sync::Arc;
use tokio::sync::RwLock;

pub use config::Settings;

#[derive(Clone)]
pub struct AppState {
    pub runtime: Arc<RwLock<core::runtime::SimulationRuntime>>,
    pub auth: Arc<RwLock<api::auth::AuthState>>,
    pub settings: Arc<Settings>,
}

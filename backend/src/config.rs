use std::env;

#[derive(Debug, Clone)]
pub struct Settings {
    pub app_name: String,
    pub num_bands: usize,
    pub aoi_threshold_ms: f64,
    pub telemetry_hz: f64,
    pub sweep_ms: f64,
    pub hostile_spawn: f64,
    pub noise_floor: f64,
    pub sim_speed: f64,
    pub epsilon: f64,
    pub cors_origins: Vec<String>,
    pub token_ttl_seconds: u64,
    pub token_secret: String,
}

impl Default for Settings {
    fn default() -> Self {
        Self {
            app_name: "AEGIS EW-Scheduler".to_string(),
            num_bands: 16,
            aoi_threshold_ms: 850.0,
            telemetry_hz: 20.0,
            sweep_ms: 50.0,
            hostile_spawn: 0.55,
            noise_floor: 0.12,
            sim_speed: 1.0,
            epsilon: 0.10,
            cors_origins: vec![
                "http://localhost:5173".to_string(),
                "http://127.0.0.1:5173".to_string(),
            ],
            token_ttl_seconds: 12 * 60 * 60,
            token_secret: "aegis-sih26055-demo-secret".to_string(),
        }
    }
}

impl Settings {
    pub fn from_env() -> Self {
        dotenv::dotenv().ok();

        Self {
            aoi_threshold_ms: env::var("AEGIS_AOI_MS")
                .unwrap_or_else(|_| "850".to_string())
                .parse()
                .unwrap_or(850.0),
            telemetry_hz: env::var("AEGIS_TELEMETRY_HZ")
                .unwrap_or_else(|_| "20".to_string())
                .parse()
                .unwrap_or(20.0),
            sweep_ms: env::var("AEGIS_SWEEP_MS")
                .unwrap_or_else(|_| "50".to_string())
                .parse()
                .unwrap_or(50.0),
            hostile_spawn: env::var("AEGIS_HOSTILE_SPAWN")
                .unwrap_or_else(|_| "0.55".to_string())
                .parse()
                .unwrap_or(0.55),
            noise_floor: env::var("AEGIS_NOISE_FLOOR")
                .unwrap_or_else(|_| "0.12".to_string())
                .parse()
                .unwrap_or(0.12),
            sim_speed: env::var("AEGIS_SIM_SPEED")
                .unwrap_or_else(|_| "1".to_string())
                .parse()
                .unwrap_or(1.0),
            epsilon: env::var("AEGIS_EPSILON")
                .unwrap_or_else(|_| "0.10".to_string())
                .parse()
                .unwrap_or(0.10),
            token_secret: env::var("AEGIS_TOKEN_SECRET")
                .unwrap_or_else(|_| "aegis-sih26055-demo-secret".to_string()),
            ..Default::default()
        }
    }
}

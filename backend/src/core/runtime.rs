use std::collections::{HashMap, VecDeque};
use std::time::{SystemTime, UNIX_EPOCH};

use serde::{Deserialize, Serialize};
use tracing::{debug, info};

use crate::config::Settings;
use crate::core::archive::SessionArchive;
use crate::core::scheduler::{SchedulerMode, SmartScanMoEScheduler};
use crate::data::emulator::{RFEmulator, HIGH_THREAT_BANDS};

const COMPASS: &[&str] = &[
    "N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW",
    "NW", "NNW",
];

fn compass(deg: f64) -> &'static str {
    let idx = ((deg % 360.0) / 22.5 + 0.5) as usize % 16;
    COMPASS[idx]
}

fn range_km(amplitude_db: f64) -> f64 {
    let t = ((-amplitude_db - 28.0) / 42.0).clamp(0.0, 1.0);
    4.0 + t * 28.0
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BandState {
    pub band_id: usize,
    pub center_freq_mhz: f64,
    pub aoi_ms: f64,
    pub priority_score: f64,
    pub status: String,
    pub threat_level: String,
    pub ignored: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Metrics {
    pub probability_of_detection: f64,
    pub probability_of_false_alarm: f64,
    pub pd_window: f64,
    pub pfa_window: f64,
    pub avg_intercept_time_error_ms: f64,
    pub current_reward_score: f64,
    pub hits: i64,
    pub misses: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PdwIntercept {
    pub pdw_id: u64,
    pub toa_us: u64,
    pub center_freq_mhz: f64,
    pub pulse_width_us: f64,
    pub aoa_deg: f64,
    pub amplitude_db: f64,
    pub emitter_class_id: u32,
    pub compass: String,
    pub range_km: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExplainableAiLog {
    pub agent: String,
    pub action_taken: String,
    pub rationale: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Env {
    pub sweep_ms: f64,
    pub hostile_spawn: f64,
    pub noise_floor: f64,
    pub sim_speed: f64,
    pub epsilon: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TelemetryPayload {
    pub timestamp_us: u64,
    pub scheduler_mode: String,
    pub active_tuned_band: usize,
    pub running: bool,
    pub metrics: Metrics,
    pub band_states: Vec<BandState>,
    pub latest_pdw_intercepts: Vec<PdwIntercept>,
    pub explainable_ai_log: ExplainableAiLog,
    pub session_id: Option<String>,
    pub env: Env,
    pub ignored_bands: Vec<usize>,
}

pub struct SimulationRuntime {
    pub emulator: RFEmulator,
    pub scheduler: SmartScanMoEScheduler,
    pub running: bool,
    pub hits: i64,
    pub misses: i64,
    pub false_alarms: i64,
    pub total_dwells: i64,
    pub total_emissions: i64,
    pub intercept_errors_ms: Vec<f64>,
    pub reward: f64,
    _recent: VecDeque<HashMap<String, i64>>,
    pub sweep_ms: f64,
    pub hostile_spawn: f64,
    pub noise_floor: f64,
    pub sim_speed: f64,
    pub latest: TelemetryPayload,
    _pending_onsets: HashMap<usize, f64>,
    pub archive: SessionArchive,
    _last_xai_key: String,
    settings: Settings,
}

impl SimulationRuntime {
    pub fn new(settings: Settings) -> Self {
        let emulator = RFEmulator::new(&settings);
        let scheduler = SmartScanMoEScheduler::new(&settings);
        let latest = Self::empty_payload_static(&settings, &scheduler);
        Self {
            emulator,
            scheduler,
            running: false,
            hits: 0,
            misses: 0,
            false_alarms: 0,
            total_dwells: 0,
            total_emissions: 0,
            intercept_errors_ms: Vec::new(),
            reward: 0.0,
            _recent: VecDeque::with_capacity(32),
            sweep_ms: settings.sweep_ms,
            hostile_spawn: settings.hostile_spawn,
            noise_floor: settings.noise_floor,
            sim_speed: settings.sim_speed,
            latest,
            _pending_onsets: HashMap::new(),
            archive: SessionArchive::new(),
            _last_xai_key: String::new(),
            settings,
        }
    }

    fn empty_payload_static(settings: &Settings, scheduler: &SmartScanMoEScheduler) -> TelemetryPayload {
        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_millis() as u64;
        let band_states: Vec<BandState> = (0..settings.num_bands)
            .map(|i| BandState {
                band_id: i + 1,
                center_freq_mhz: 500.0 + i as f64 * 500.0,
                aoi_ms: 0.0,
                priority_score: 0.15,
                status: "IDLE".to_string(),
                threat_level: if HIGH_THREAT_BANDS.contains(&&i) {
                    "HIGH".to_string()
                } else {
                    "NONE".to_string()
                },
                ignored: false,
            })
            .collect();
        TelemetryPayload {
            timestamp_us: now,
            scheduler_mode: scheduler.mode.as_str().to_string(),
            active_tuned_band: 0,
            running: false,
            metrics: Metrics {
                probability_of_detection: 0.0,
                probability_of_false_alarm: 0.0,
                pd_window: 0.0,
                pfa_window: 0.0,
                avg_intercept_time_error_ms: 0.0,
                current_reward_score: 0.0,
                hits: 0,
                misses: 0,
            },
            band_states,
            latest_pdw_intercepts: Vec::new(),
            explainable_ai_log: ExplainableAiLog {
                agent: "IDLE".to_string(),
                action_taken: "HOLD".to_string(),
                rationale: "Simulation halted. Await operator START.".to_string(),
            },
            session_id: None,
            env: Env {
                sweep_ms: settings.sweep_ms,
                hostile_spawn: settings.hostile_spawn,
                noise_floor: settings.noise_floor,
                sim_speed: settings.sim_speed,
                epsilon: settings.epsilon,
            },
            ignored_bands: Vec::new(),
        }
    }

    pub fn reset(&mut self) {
        let prev_session = self.archive.current.as_ref().map(|c| c.id.clone());
        let was_running = self.running;
        self.archive.close();
        info!(
            session = prev_session.as_deref().unwrap_or("none"),
            was_running,
            "simulation reset"
        );
        let spawn = self.hostile_spawn;
        let noise = self.noise_floor;
        let sweep = self.sweep_ms;
        let speed = self.sim_speed;
        let epsilon = self.scheduler.epsilon;
        let mode = self.scheduler.mode.clone();
        let eager_weight = self.scheduler.eager_weight;
        let revisit_weight = self.scheduler.revisit_weight;
        let aoi_decay_factor = self.scheduler.aoi_decay_factor;

        self.emulator = RFEmulator::new(&self.settings);
        self.emulator.hostile_spawn = spawn;
        self.emulator.noise_floor = noise;
        self.hostile_spawn = spawn;
        self.noise_floor = noise;
        self.sweep_ms = sweep;
        self.sim_speed = speed;

        self.scheduler = SmartScanMoEScheduler::new(&self.settings);
        self.scheduler.mode = mode;
        self.scheduler.eager_weight = eager_weight;
        self.scheduler.revisit_weight = revisit_weight;
        self.scheduler.aoi_decay_factor = aoi_decay_factor;
        self.scheduler.epsilon = epsilon;
        self.scheduler.min_dwell_ticks = (280.0 / sweep.max(20.0)) as i32;

        self._reset_fom();
        self.latest = Self::empty_payload_static(&self.settings, &self.scheduler);
        self.latest.running = self.running;
        if self.running {
            self.archive.start(self.latest.scheduler_mode.as_str());
        }
    }

    fn _reset_fom(&mut self) {
        self.hits = 0;
        self.misses = 0;
        self.false_alarms = 0;
        self.total_dwells = 0;
        self.total_emissions = 0;
        self.intercept_errors_ms.clear();
        self.reward = 0.0;
        self._pending_onsets.clear();
        self._last_xai_key.clear();
        self._recent.clear();
    }

    pub fn start(&mut self) {
        if !self.running {
            self._reset_fom();
            self.emulator.scramble();
            self.scheduler.mark_fresh();
            self.archive.start(self.scheduler.mode.as_str());
        }
        self.running = true;
        info!(mode = self.scheduler.mode.as_str(), "simulation started");
    }

    pub fn pause(&mut self) {
        self.running = false;
        self.latest.running = false;
        let session = self.archive.current.as_ref().map(|c| c.id.clone());
        self.archive.close();
        info!(
            mode = self.scheduler.mode.as_str(),
            session = session.as_deref().unwrap_or("none"),
            "simulation paused"
        );
    }

    pub fn configure(
        &mut self,
        sweep_ms: Option<f64>,
        hostile_spawn: Option<f64>,
        noise_floor: Option<f64>,
        sim_speed: Option<f64>,
        mode: Option<SchedulerMode>,
        eager_agent_weight: Option<f64>,
        revisit_agent_weight: Option<f64>,
        aoi_decay_factor: Option<f64>,
        dwell_time_override_ms: Option<f64>,
        manual_band: Option<usize>,
        ignore_band: Option<usize>,
        unignore_band: Option<usize>,
        epsilon: Option<f64>,
    ) {
        let mut changed: Vec<&'static str> = Vec::new();
        if let Some(s) = sweep_ms {
            self.sweep_ms = s.clamp(20.0, 500.0);
            self.scheduler.min_dwell_ticks = (280.0 / self.sweep_ms) as i32;
            changed.push("sweep_ms");
        }
        if let Some(h) = hostile_spawn {
            self.hostile_spawn = h.clamp(0.0, 1.0);
            self.emulator.hostile_spawn = self.hostile_spawn;
            changed.push("hostile_spawn");
        }
        if let Some(n) = noise_floor {
            self.noise_floor = n.clamp(0.0, 0.8);
            self.emulator.noise_floor = self.noise_floor;
            changed.push("noise_floor");
        }
        if let Some(s) = sim_speed {
            self.sim_speed = s.clamp(0.25, 4.0);
            changed.push("sim_speed");
        }
        if mode.is_some() {
            changed.push("mode");
        }
        if eager_agent_weight.is_some() {
            changed.push("eager_agent_weight");
        }
        if revisit_agent_weight.is_some() {
            changed.push("revisit_agent_weight");
        }
        if aoi_decay_factor.is_some() {
            changed.push("aoi_decay_factor");
        }
        if dwell_time_override_ms.is_some() {
            changed.push("dwell_time_override_ms");
        }
        if manual_band.is_some() {
            changed.push("manual_band");
        }
        if ignore_band.is_some() {
            changed.push("ignore_band");
        }
        if unignore_band.is_some() {
            changed.push("unignore_band");
        }
        if epsilon.is_some() {
            changed.push("epsilon");
        }
        self.scheduler.configure(
            mode,
            eager_agent_weight,
            revisit_agent_weight,
            aoi_decay_factor,
            dwell_time_override_ms,
            manual_band,
            ignore_band,
            unignore_band,
            epsilon,
        );
        if changed.is_empty() {
            info!(mode = self.scheduler.mode.as_str(), "scheduler config request with no changes");
        } else {
            info!(
                mode = self.scheduler.mode.as_str(),
                sweep_ms = self.sweep_ms,
                sim_speed = self.sim_speed,
                fields = ?changed,
                "scheduler configuration updated"
            );
        }
    }

    fn _window_rates(&self) -> (f64, f64) {
        if self._recent.is_empty() {
            return (0.0, 0.0);
        }
        let hits: i64 = self._recent.iter().map(|r| r["hit"]).sum();
        let misses: i64 = self._recent.iter().map(|r| r["miss"]).sum();
        let fas: i64 = self._recent.iter().map(|r| r["fa"]).sum();
        let denom = hits + misses;
        let pd = if denom > 0 {
            hits as f64 / denom as f64
        } else {
            0.0
        };
        let pfa = fas as f64 / self._recent.len() as f64;
        (pd, pfa)
    }

    fn _metrics(&self) -> Metrics {
        let denom = self.hits + self.misses;
        let pd = if denom > 0 {
            self.hits as f64 / denom as f64
        } else {
            0.0
        };
        let pfa = if self.total_dwells > 0 {
            self.false_alarms as f64 / self.total_dwells as f64
        } else {
            0.0
        };
        let dt = if self.intercept_errors_ms.is_empty() {
            0.0
        } else {
            self.intercept_errors_ms.iter().sum::<f64>() / self.intercept_errors_ms.len() as f64
        };
        let (pd_w, pfa_w) = self._window_rates();
        Metrics {
            probability_of_detection: (pd * 10000.0).round() / 10000.0,
            probability_of_false_alarm: (pfa * 10000.0).round() / 10000.0,
            pd_window: (pd_w * 10000.0).round() / 10000.0,
            pfa_window: (pfa_w * 10000.0).round() / 10000.0,
            avg_intercept_time_error_ms: (dt * 100.0).round() / 100.0,
            current_reward_score: (self.reward * 10.0).round() / 10.0,
            hits: self.hits,
            misses: self.misses,
        }
    }

    pub fn tick(&mut self) -> TelemetryPayload {
        if !self.running {
            self.latest.running = false;
            self.latest.timestamp_us = SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .unwrap()
                .as_micros() as u64;
            return self.latest.clone();
        }

        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_secs_f64();

        let (truths, pdws, onsets) = self.emulator.step();
        let occupancy: Vec<bool> = truths.iter().map(|t| t.occupied).collect();
        let decision = self.scheduler.evaluate_step(&occupancy, Some(now));
        let tuned = decision.selected_band;

        debug!(
            tick_us = (now * 1_000_000.0) as u64,
            agent = %decision.agent,
            tuned_band = tuned + 1,
            active_bands = truths.iter().filter(|t| t.occupied).count(),
            aoi_ms = self.scheduler.band_aoi.get(tuned).copied().unwrap_or(0.0),
            "tick decision"
        );

        let active_count = truths.iter().filter(|t| t.occupied).count();
        self.total_emissions += active_count as i64;
        self.total_dwells += 1;

        let mut fa_tick = 0i64;
        let mut miss_tick = 0i64;
        let mut hit_tick = 0i64;
        let mut status_at_rx = "IDLE".to_string();

        if truths[tuned].occupied {
            self.hits += 1;
            hit_tick = 1;
            let onset = onsets.get(&tuned).copied().unwrap_or(now);
            let error_ms = ((now - onset) * 1000.0).max(0.0);
            self.intercept_errors_ms.push(error_ms);
            self.reward += 12.0 - (error_ms / 80.0).min(8.0) - decision.hop_penalty as f64 * 0.4;
            status_at_rx = "LOCKED".to_string();
        } else {
            if active_count > 0 {
                self.misses += 1;
                miss_tick = 1;
                self.reward -= 2.5;
            }
            let noise_threshold = 0.04 + 0.55 * self.noise_floor;
            if rand::random::<f64>() < noise_threshold {
                self.false_alarms += 1;
                fa_tick = 1;
                self.reward -= 0.4;
            }
        }

        self._recent.push_back(HashMap::from([
            ("hit".to_string(), hit_tick),
            ("miss".to_string(), miss_tick),
            ("fa".to_string(), fa_tick),
        ]));
        if self._recent.len() > 32 {
            self._recent.pop_front();
        }

        if hit_tick + miss_tick + fa_tick > 0 {
            let outcome = if hit_tick == 1 {
                "HIT"
            } else if miss_tick == 1 {
                "MISS"
            } else {
                "FALSE_ALARM"
            };
            debug!(
                outcome,
                tuned_band = tuned + 1,
                hits = self.hits,
                misses = self.misses,
                false_alarms = self.false_alarms,
                reward = (self.reward * 100.0).round() / 100.0,
                "intercept outcome"
            );
        }

        let xai_key = format!("{}:{}", decision.agent, tuned);
        let rationale = decision.rationale.clone();
        if xai_key != self._last_xai_key {
            self._last_xai_key = xai_key;
        }

        let tracks: Vec<_> = pdws.into_iter().take(8).collect();
        let band_states: Vec<BandState> = truths
            .iter()
            .enumerate()
            .map(|(i, truth)| {
                let status = if i == tuned {
                    if status_at_rx == "LOCKED" {
                        "LOCKED".to_string()
                    } else {
                        "IDLE".to_string()
                    }
                } else if truth.occupied {
                    "OCCUPIED".to_string()
                } else {
                    "IDLE".to_string()
                };
                let threat = if HIGH_THREAT_BANDS.contains(&i) {
                    if truth.occupied {
                        "HIGH".to_string()
                    } else {
                        "LOW".to_string()
                    }
                } else if truth.occupied {
                    truth.threat_level.clone()
                } else {
                    "NONE".to_string()
                };
                BandState {
                    band_id: i + 1,
                    center_freq_mhz: truth.center_freq_mhz,
                    aoi_ms: (decision.aoi_states[i] / 40.0).round() * 40.0,
                    priority_score: (decision.priority[i] * 1000.0).round() / 1000.0,
                    status,
                    threat_level: threat,
                    ignored: self.scheduler.ignored.contains(&i),
                }
            })
            .collect();

        let pdw_intercepts: Vec<PdwIntercept> = tracks
            .iter()
            .map(|p| PdwIntercept {
                pdw_id: p.pdw_id,
                toa_us: p.toa_us,
                center_freq_mhz: (p.center_freq_mhz * 100.0).round() / 100.0,
                pulse_width_us: (p.pulse_width_us * 100.0).round() / 100.0,
                aoa_deg: (p.aoa_deg * 10.0).round() / 10.0,
                amplitude_db: (p.amplitude_db * 10.0).round() / 10.0,
                emitter_class_id: p.emitter_class_id,
                compass: compass(p.aoa_deg).to_string(),
                range_km: (range_km(p.amplitude_db) * 10.0).round() / 10.0,
            })
            .collect();

        let payload = TelemetryPayload {
            timestamp_us: (now * 1_000_000.0) as u64,
            scheduler_mode: self.scheduler.mode.as_str().to_string(),
            active_tuned_band: tuned,
            running: true,
            metrics: self._metrics(),
            band_states,
            latest_pdw_intercepts: pdw_intercepts,
            explainable_ai_log: ExplainableAiLog {
                agent: decision.agent,
                action_taken: format!("SWEEP_BAND_{}", tuned + 1),
                rationale,
            },
            session_id: self.archive.current.as_ref().map(|c| c.id.clone()),
            env: Env {
                sweep_ms: self.sweep_ms,
                hostile_spawn: self.hostile_spawn,
                noise_floor: self.noise_floor,
                sim_speed: self.sim_speed,
                epsilon: self.scheduler.epsilon,
            },
            ignored_bands: self.scheduler.ignored.iter().copied().collect(),
        };
        self.latest = payload.clone();
        self.archive.record(
            &serde_json::to_value(&payload).unwrap(),
            &payload.explainable_ai_log.agent,
        );
        payload
    }
}

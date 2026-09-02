use std::time::{SystemTime, UNIX_EPOCH};

use rand::prelude::SliceRandom;
use rand::Rng;
use serde::{Deserialize, Serialize};

use crate::config::Settings;
use crate::data::emulator::HIGH_THREAT_BANDS;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum SchedulerMode {
    Manual,
    OpenLoop,
    SmartScanMarl,
}

impl SchedulerMode {
    pub fn as_str(&self) -> &'static str {
        match self {
            SchedulerMode::Manual => "MANUAL",
            SchedulerMode::OpenLoop => "OPEN_LOOP",
            SchedulerMode::SmartScanMarl => "SMART_SCAN_MARL",
        }
    }
}

impl Default for SchedulerMode {
    fn default() -> Self {
        SchedulerMode::SmartScanMarl
    }
}

#[derive(Debug, Clone)]
pub struct StepDecision {
    pub selected_band: usize,
    pub agent: String,
    pub rationale: String,
    pub aoi_states: Vec<f64>,
    pub priority: Vec<f64>,
    pub hop_penalty: i32,
    pub ignored: Vec<usize>,
}

pub struct SmartScanMoEScheduler {
    pub num_bands: usize,
    pub aoi_threshold_ms: f64,
    pub eager_weight: f64,
    pub revisit_weight: f64,
    pub aoi_decay_factor: f64,
    pub mode: SchedulerMode,
    pub manual_band: usize,
    pub current_band: usize,
    pub last_visit_time: Vec<f64>,
    pub band_aoi: Vec<f64>,
    pub priority: Vec<f64>,
    pub dwell_hold: i32,
    pub min_dwell_ticks: i32,
    pub ignored: Vec<usize>,
    pub epsilon: f64,
}

impl SmartScanMoEScheduler {
    pub fn new(settings: &Settings) -> Self {
        let num_bands = settings.num_bands;
        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_secs_f64();
        Self {
            num_bands,
            aoi_threshold_ms: settings.aoi_threshold_ms,
            eager_weight: 0.7,
            revisit_weight: 0.3,
            aoi_decay_factor: 1.5,
            mode: SchedulerMode::SmartScanMarl,
            manual_band: 0,
            current_band: 0,
            last_visit_time: vec![now; num_bands],
            band_aoi: vec![0.0; num_bands],
            priority: vec![0.15; num_bands],
            dwell_hold: 0,
            min_dwell_ticks: 6,
            ignored: Vec::new(),
            epsilon: settings.epsilon,
        }
    }

    pub fn configure(
        &mut self,
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
        if let Some(m) = mode {
            self.mode = m;
        }
        if let Some(w) = eager_agent_weight {
            self.eager_weight = w;
        }
        if let Some(w) = revisit_agent_weight {
            self.revisit_weight = w;
        }
        if let Some(f) = aoi_decay_factor {
            self.aoi_decay_factor = f;
        }
        if let Some(dt) = dwell_time_override_ms {
            self.aoi_threshold_ms = dt.max(200.0);
        }
        if let Some(b) = manual_band {
            self.manual_band = b.min(self.num_bands - 1);
        }
        if let Some(b) = ignore_band {
            let b = b.min(self.num_bands - 1);
            if !self.ignored.contains(&b) {
                self.ignored.push(b);
            }
        }
        if let Some(b) = unignore_band {
            let b = b.min(self.num_bands - 1);
            self.ignored.retain(|&x| x != b);
        }
        if let Some(e) = epsilon {
            self.epsilon = e.clamp(0.0, 0.4);
        }
    }

    pub fn mark_fresh(&mut self) {
        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_secs_f64();
        self.last_visit_time = vec![now; self.num_bands];
        self.band_aoi = vec![0.0; self.num_bands];
        self.dwell_hold = 0;
    }

    pub fn reset(&mut self) {
        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_secs_f64();
        self.current_band = 0;
        self.manual_band = 0;
        self.last_visit_time = vec![now; self.num_bands];
        self.band_aoi = vec![0.0; self.num_bands];
        self.priority = vec![0.15; self.num_bands];
        self.dwell_hold = 0;
        self.ignored.clear();
    }

    fn _eligible(&self, index: usize) -> bool {
        !self.ignored.contains(&index)
    }

    fn _next_linear(&self, start: usize) -> usize {
        for step in 1..=self.num_bands {
            let candidate = (start + step) % self.num_bands;
            if self._eligible(candidate) {
                return candidate;
            }
        }
        start
    }

    pub fn evaluate_step(&mut self, occupancy: &[bool], now: Option<f64>) -> StepDecision {
        let now = now.unwrap_or_else(|| {
            SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .unwrap()
                .as_secs_f64()
        });
        let prev = self.current_band;
        let mut rng = rand::thread_rng();

        for i in 0..self.num_bands {
            if i != self.current_band {
                let elapsed_ms = ((now - self.last_visit_time[i]) * 1000.0).min(4000.0);
                self.band_aoi[i] = elapsed_ms.powf(self.aoi_decay_factor / 1.5);
            }
        }

        let mut next_band;
        let mut agent;
        let mut rationale;

        if self.mode == SchedulerMode::Manual {
            next_band = self.manual_band;
            agent = "MANUAL".to_string();
            rationale = format!("Operator dwell lock on Sub-Band {}.", next_band + 1);
        } else if self.mode == SchedulerMode::OpenLoop {
            if self.dwell_hold > 0 {
                next_band = self.current_band;
                agent = "HOLD".to_string();
                rationale = format!("Minimum dwell on Sub-Band {}.", next_band + 1);
            } else {
                next_band = self._next_linear(self.current_band);
                agent = "OPEN_LOOP".to_string();
                rationale = format!(
                    "Uniform sequential sweep: Sub-Band {} → Sub-Band {}.",
                    self.current_band + 1,
                    next_band + 1
                );
            }
        } else {
            let candidates: Vec<usize> = (0..self.num_bands)
                .filter(|&i| self._eligible(i))
                .collect();
            let candidates = if candidates.is_empty() {
                (0..self.num_bands).collect()
            } else {
                candidates
            };

            let max_aoi_band = *candidates
                .iter()
                .max_by(|&&a, &&b| self.band_aoi[a].partial_cmp(&self.band_aoi[b]).unwrap())
                .unwrap();
            let max_aoi_val = self.band_aoi[max_aoi_band];

            let occupied: Vec<usize> = occupancy
                .iter()
                .enumerate()
                .filter(|&(i, &flag)| flag && self._eligible(i))
                .map(|(i, _)| i)
                .collect();

            if max_aoi_val >= self.aoi_threshold_ms {
                next_band = max_aoi_band;
                agent = "REVISIT_AGENT".to_string();
                rationale = format!(
                    "Age-of-Information breach on Sub-Band {} ({:.1}ms >= {:.0}ms). \
                     Overriding Eager Agent to prevent state staleness.",
                    next_band + 1,
                    max_aoi_val,
                    self.aoi_threshold_ms
                );
            } else if rng.gen::<f64>() < self.epsilon {
                next_band = *candidates.choose(&mut rng).unwrap_or(&0);
                agent = "EXPLORE".to_string();
                rationale = format!(
                    "Epsilon-greedy explore ({:.0}%) landed on Sub-Band {} \
                     to discover emitters outside known hot zones.",
                    self.epsilon * 100.0,
                    next_band + 1
                );
            } else if !occupied.is_empty() {
                let hot: Vec<usize> = occupied
                    .iter()
                    .filter(|&&i| HIGH_THREAT_BANDS.contains(&i))
                    .copied()
                    .collect();
                let hot = if hot.is_empty() {
                    occupied.clone()
                } else {
                    hot
                };

                next_band = *hot
                    .iter()
                    .max_by(|&&a, &&b| {
                        let score_a =
                            if occupancy[a] { 1.0 } else { 0.0 } + self.priority[a] * (self.band_aoi[a].powf(1.5) / 1000.0);
                        let score_b =
                            if occupancy[b] { 1.0 } else { 0.0 } + self.priority[b] * (self.band_aoi[b].powf(1.5) / 1000.0);
                        score_a.partial_cmp(&score_b).unwrap()
                    })
                    .unwrap();

                if next_band == self.current_band && self.dwell_hold > 0 {
                    agent = "HOLD".to_string();
                    rationale = format!("Holding Eager lock on Sub-Band {}.", next_band + 1);
                } else {
                    agent = "EAGER_AGENT".to_string();
                    let freq = 500 + next_band * 500;
                    rationale = format!(
                        "Tracking signal persistence on active Sub-Band {} ({} MHz). \
                         Score mixes occupancy, threat memory, and AoI^1.5.",
                        next_band + 1,
                        freq
                    );
                }
            } else {
                next_band = self._next_linear(self.current_band);
                agent = "EAGER_AGENT".to_string();
                rationale = format!("No occupancy — sequential hop to Sub-Band {}.", next_band + 1);
            }
        }

        let hop_penalty = (next_band as i32 - prev as i32).abs();

        if self.mode != SchedulerMode::Manual && next_band == prev && self.dwell_hold > 0 {
            self.dwell_hold -= 1;
        } else if next_band != prev {
            self.dwell_hold = self.min_dwell_ticks;
        } else if self.mode != SchedulerMode::Manual && self.dwell_hold > 0 {
            next_band = prev;
            self.dwell_hold -= 1;
            agent = "HOLD".to_string();
            rationale = format!(
                "Minimum dwell on Sub-Band {} so the operator can read the scope.",
                next_band + 1
            );
        }

        self.current_band = next_band;
        self.last_visit_time[next_band] = now;
        self.band_aoi[next_band] = 0.0;

        for (i, &flag) in occupancy.iter().enumerate() {
            if flag {
                self.priority[i] = (self.priority[i] + 0.08).min(1.0);
            } else {
                self.priority[i] = (self.priority[i] * 0.97).max(0.05);
            }
        }
        self.priority[next_band] = (self.priority[next_band] + 0.04).min(1.0);

        StepDecision {
            selected_band: next_band,
            agent,
            rationale,
            aoi_states: self.band_aoi.clone(),
            priority: self.priority.clone(),
            hop_penalty,
            ignored: self.ignored.iter().copied().collect(),
        }
    }
}

use std::collections::HashMap;
use std::time::{SystemTime, UNIX_EPOCH};

use rand::Rng;
use serde::{Deserialize, Serialize};

use crate::config::Settings;

pub const HIGH_THREAT_BANDS: &[usize] = &[3, 7, 12];

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PDW {
    pub pdw_id: u64,
    pub toa_us: u64,
    pub center_freq_mhz: f64,
    pub pulse_width_us: f64,
    pub aoa_deg: f64,
    pub amplitude_db: f64,
    pub emitter_class_id: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BandTruth {
    pub occupied: bool,
    pub threat_level: String,
    pub center_freq_mhz: f64,
}

#[derive(Debug, Clone)]
pub struct EmulatorState {
    pub tick: u64,
    pub pdw_seq: u64,
    pub occupancy: Vec<bool>,
    pub pdws: Vec<PDW>,
}

impl Default for EmulatorState {
    fn default() -> Self {
        Self {
            tick: 0,
            pdw_seq: 0,
            occupancy: vec![false; 16],
            pdws: Vec::new(),
        }
    }
}

pub struct RFEmulator {
    pub num_bands: usize,
    pub center_freqs: Vec<f64>,
    pub state: EmulatorState,
    _onset: HashMap<usize, f64>,
    _hold: Vec<i32>,
    _occ: Vec<bool>,
    _aoa: Vec<f64>,
    _amp: Vec<f64>,
    pub hostile_spawn: f64,
    pub noise_floor: f64,
}

impl RFEmulator {
    pub fn new(settings: &Settings) -> Self {
        let num_bands = settings.num_bands;
        let mut rng = rand::thread_rng();
        Self {
            num_bands,
            center_freqs: (0..num_bands).map(|i| 500.0 + i as f64 * 500.0).collect(),
            state: EmulatorState {
                occupancy: vec![false; num_bands],
                ..Default::default()
            },
            _onset: HashMap::new(),
            _hold: vec![0; num_bands],
            _occ: vec![false; num_bands],
            _aoa: (0..num_bands).map(|_| rng.gen_range(12.0..348.0)).collect(),
            _amp: (0..num_bands).map(|_| rng.gen_range(-62.0..-38.0)).collect(),
            hostile_spawn: settings.hostile_spawn,
            noise_floor: settings.noise_floor,
        }
    }

    pub fn scramble(&mut self) {
        let mut rng = rand::thread_rng();
        self._onset.clear();
        for i in 0..self.num_bands {
            self._occ[i] = false;
            self._hold[i] = rng.gen_range(0..=18);
            self._aoa[i] = rng.gen_range(12.0..348.0);
            self._amp[i] = rng.gen_range(-62.0..-38.0);
        }
        self.state.tick = 0;
    }

    pub fn band_freq(&self, index: usize) -> f64 {
        self.center_freqs[index]
    }

    fn _set_hold(&mut self, index: usize, occupied: bool, on_ticks: i32, off_ticks: i32) {
        let mut rng = rand::thread_rng();
        self._occ[index] = occupied;
        self._hold[index] = if occupied { on_ticks } else { off_ticks };
        if occupied {
            self._aoa[index] = (self._aoa[index] + rng.gen_range(-4.0..4.0)) % 360.0;
            self._amp[index] = if HIGH_THREAT_BANDS.contains(&index) {
                rng.gen_range(-52.0..-30.0)
            } else {
                rng.gen_range(-68.0..-42.0)
            };
        }
    }

    pub fn step(&mut self) -> (Vec<BandTruth>, Vec<PDW>, HashMap<usize, f64>) {
        let mut rng = rand::thread_rng();
        self.state.tick += 1;

        for i in 0..self.num_bands {
            if self._hold[i] > 0 {
                self._hold[i] -= 1;
                continue;
            }
            let spawn = self.hostile_spawn.clamp(0.0, 1.0);
            let noise = self.noise_floor.clamp(0.0, 0.8);
            if HIGH_THREAT_BANDS.contains(&i) {
                if self._occ[i] {
                    let stay = rng.gen::<f64>() < (0.25 + 0.65 * spawn);
                    let on_ticks = 10 + (12.0 * spawn) as i32;
                    let off_ticks = 8 + (28.0 * (1.0 - spawn)) as i32;
                    self._set_hold(i, stay, on_ticks, off_ticks);
                } else {
                    let start = rng.gen::<f64>() < (0.02 + 0.78 * spawn);
                    let on_ticks = 8 + (16.0 * spawn) as i32;
                    let off_ticks = 14 + (36.0 * (1.0 - spawn)) as i32;
                    self._set_hold(i, start, on_ticks, off_ticks);
                }
            } else if self._occ[i] {
                let stay = rng.gen::<f64>() < (0.15 + 0.55 * noise);
                let on_ticks = 6 + (10.0 * noise) as i32;
                self._set_hold(i, stay, on_ticks, 20);
            } else {
                let start = rng.gen::<f64>() < (0.01 + 0.72 * noise);
                let on_ticks = 5 + (14.0 * noise) as i32;
                self._set_hold(i, start, on_ticks, 24);
            }
        }

        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_secs_f64();

        for (i, active) in self._occ.iter().enumerate() {
            if *active && !self._onset.contains_key(&i) {
                self._onset.insert(i, now);
            }
            if !active {
                self._onset.remove(&i);
            }
        }

        let mut pdws = Vec::new();
        let now_us = (now * 1_000_000.0) as u64;
        for (i, active) in self._occ.iter().enumerate() {
            if !active {
                continue;
            }
            self.state.pdw_seq += 1;
            let threat = HIGH_THREAT_BANDS.contains(&i);
            pdws.push(PDW {
                pdw_id: self.state.pdw_seq,
                toa_us: now_us,
                center_freq_mhz: self.center_freqs[i],
                pulse_width_us: if threat { 12.5 } else { 8.0 },
                aoa_deg: self._aoa[i],
                amplitude_db: self._amp[i],
                emitter_class_id: if threat { 7 } else { 2 },
            });
        }

        self.state.occupancy = self._occ.clone();
        self.state.pdws = pdws.clone();
        let truths: Vec<BandTruth> = (0..self.num_bands)
            .map(|i| BandTruth {
                occupied: self._occ[i],
                threat_level: if HIGH_THREAT_BANDS.contains(&i) && self._occ[i] {
                    "HIGH".to_string()
                } else if self._occ[i] {
                    "MEDIUM".to_string()
                } else {
                    "NONE".to_string()
                },
                center_freq_mhz: self.center_freqs[i],
            })
            .collect();

        (truths, pdws, self._onset.clone())
    }
}

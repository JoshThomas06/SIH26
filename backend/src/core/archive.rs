use std::collections::HashMap;
use std::time::{SystemTime, UNIX_EPOCH};

use serde::{Deserialize, Serialize};
use tracing::info;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Sample {
    pub t: f64,
    pub pd: f64,
    pub pfa: f64,
    pub pd_window: f64,
    pub pfa_window: f64,
    pub dt: f64,
    pub reward: f64,
    pub hits: i64,
    pub misses: i64,
    pub tuned_band: usize,
    pub mode: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Flag {
    pub id: String,
    pub t: f64,
    pub kind: String,
    pub severity: String,
    pub band: usize,
    pub title: String,
    pub detail: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Session {
    pub id: String,
    pub label: String,
    pub started_at: f64,
    pub ended_at: Option<f64>,
    pub status: String,
    pub mode: String,
    pub samples: Vec<Sample>,
    pub flags: Vec<Flag>,
    pub logs: Vec<String>,
    pub summary: String,
    pub metrics_end: HashMap<String, serde_json::Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SessionCard {
    pub id: String,
    pub label: String,
    pub status: String,
    pub mode: String,
    pub started_at: f64,
    pub ended_at: Option<f64>,
    pub flag_count: usize,
    pub sample_count: usize,
    pub pd: f64,
    pub hits: i64,
    pub misses: i64,
    pub summary: String,
}

fn _mode_label(mode: &str) -> &str {
    match mode {
        "MANUAL" => "Manual dwell",
        "OPEN_LOOP" => "open-loop sequential sweep",
        "SMART_SCAN_MARL" => "Smart Scan dual-agent (Eager + Revisit)",
        _ => mode,
    }
}

pub fn compose_summary(session: &Session, live: bool) -> String {
    let metrics = &session.metrics_end;
    let pd = metrics
        .get("probability_of_detection")
        .and_then(|v| v.as_f64())
        .unwrap_or(0.0)
        * 100.0;
    let pfa = metrics
        .get("probability_of_false_alarm")
        .and_then(|v| v.as_f64())
        .unwrap_or(0.0)
        * 100.0;
    let dt = metrics
        .get("avg_intercept_time_error_ms")
        .and_then(|v| v.as_f64())
        .unwrap_or(0.0);
    let hits = metrics
        .get("hits")
        .and_then(|v| v.as_i64())
        .unwrap_or(0);
    let misses = metrics
        .get("misses")
        .and_then(|v| v.as_i64())
        .unwrap_or(0);
    let reward = metrics
        .get("current_reward_score")
        .and_then(|v| v.as_f64())
        .unwrap_or(0.0);

    let high_flags: Vec<&Flag> = session
        .flags
        .iter()
        .filter(|f| f.severity == "HIGH")
        .collect();

    let tense = if live {
        "This live run is"
    } else {
        "This closed run was"
    };

    let mode_str = session.mode.as_str();
    let outlook = if pd >= 28.0 && mode_str == "SMART_SCAN_MARL" {
        "Smart Scan is holding intercept quality; keep this mode for the remainder of the demo."
    } else if mode_str == "OPEN_LOOP" {
        "Open-loop is leaving agile emitters in the gaps — switch to Smart Scan MARL to lift Pd."
    } else if mode_str == "MANUAL" {
        "Manual stare will starve unwatched slices; return to Smart Scan unless you are locking a known emitter."
    } else {
        "Let the run accumulate another 20-30 seconds so Pd and dt separate from the baseline."
    };

    let peak = session
        .samples
        .iter()
        .map(|s| s.pd)
        .fold(0.0f64, f64::max)
        * 100.0;

    let flag_line = if !session.flags.is_empty() {
        format!(
            "{} high-priority events were flagged (HIGH-band locks, Revisit pre-emptions, or miss bursts).",
            high_flags.len()
        )
    } else {
        "No special flags yet — wait for a HIGH-band occupancy or a Revisit hop.".to_string()
    };

    format!(
        "{} executed as {}. Catch rate (Pd) sits at {:.1}% (peak {:.1}%), with {} hits against {} misses. False-alarm share is {:.1}% and mean intercept lag dt is {:.1} ms. Scheduler reward is {:.1}. {} {}",
        tense,
        _mode_label(mode_str),
        pd,
        peak,
        hits,
        misses,
        pfa,
        dt,
        reward,
        flag_line,
        outlook
    )
}

pub struct SessionArchive {
    pub sessions: Vec<Session>,
    pub current: Option<Session>,
    _seq: u32,
    _tick: u64,
    _last_agent: String,
    _miss_streak: i64,
}

impl SessionArchive {
    pub fn new() -> Self {
        Self {
            sessions: Vec::new(),
            current: None,
            _seq: 0,
            _tick: 0,
            _last_agent: String::new(),
            _miss_streak: 0,
        }
    }

    pub fn start(&mut self, mode: &str) -> &Session {
        self.close();
        self._seq += 1;
        self._tick = 0;
        self._miss_streak = 0;
        let id = Uuid::new_v4().to_string()[..8].to_string();
        let label = format!("RUN-{:03}", self._seq);
        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_secs_f64();
        self.current = Some(Session {
            id: id.clone(),
            label: label.clone(),
            started_at: now,
            ended_at: None,
            status: "LIVE".to_string(),
            mode: mode.to_string(),
            samples: Vec::new(),
            flags: Vec::new(),
            logs: Vec::new(),
            summary: String::new(),
            metrics_end: HashMap::new(),
        });
        info!(
            session = %id,
            label = %label,
            mode,
            "session started"
        );
        self.current.as_ref().unwrap()
    }

    pub fn close(&mut self) -> Option<Session> {
        if self.current.is_none() {
            return None;
        }
        let mut session = self.current.take().unwrap();
        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_secs_f64();
        session.ended_at = Some(now);
        session.status = "CLOSED".to_string();
        session.summary = compose_summary(&session, false);
        let duration_s = (now - session.started_at).round();
        let hits = session
            .metrics_end
            .get("hits")
            .and_then(|v| v.as_i64())
            .unwrap_or(0);
        let misses = session
            .metrics_end
            .get("misses")
            .and_then(|v| v.as_i64())
            .unwrap_or(0);
        let pd = session
            .metrics_end
            .get("probability_of_detection")
            .and_then(|v| v.as_f64())
            .unwrap_or(0.0);
        info!(
            session = %session.id,
            label = %session.label,
            duration_s = duration_s,
            samples = session.samples.len(),
            hits,
            misses,
            pd_pct = (pd * 10000.0).round() / 100.0,
            "session closed"
        );
        self.sessions.insert(0, session.clone());
        self.sessions.truncate(24);
        Some(session)
    }

    pub fn note_log(&mut self, line: &str) {
        if self.current.is_none() || line.is_empty() {
            return;
        }
        let logs = &mut self.current.as_mut().unwrap().logs;
        if logs.last().map(|s| s.as_str()) == Some(line) {
            return;
        }
        logs.push(line.to_string());
        if logs.len() > 240 {
            logs.drain(0..40);
        }
    }

    pub fn record(&mut self, payload: &serde_json::Value, agent: &str) {
        if self.current.is_none() {
            return;
        }
        self._tick += 1;
        let session = self.current.as_mut().unwrap();

        if let Some(mode) = payload.get("scheduler_mode").and_then(|v| v.as_str()) {
            session.mode = mode.to_string();
        }

        if let Some(metrics) = payload.get("metrics") {
            if let Some(obj) = metrics.as_object() {
            session.metrics_end = obj.iter().map(|(k, v)| (k.clone(), v.clone())).collect();
        }
        }

        let metrics = &session.metrics_end;
        let misses = metrics
            .get("misses")
            .and_then(|v| v.as_i64())
            .unwrap_or(0);
        let hits = metrics
            .get("hits")
            .and_then(|v| v.as_i64())
            .unwrap_or(0);

        if self._tick % 4 == 0 {
            let now = SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .unwrap()
                .as_secs_f64();
            let samples = &mut session.samples;
            samples.push(Sample {
                t: now - session.started_at,
                pd: metrics
                    .get("probability_of_detection")
                    .and_then(|v| v.as_f64())
                    .unwrap_or(0.0),
                pfa: metrics
                    .get("probability_of_false_alarm")
                    .and_then(|v| v.as_f64())
                    .unwrap_or(0.0),
                pd_window: metrics
                    .get("pd_window")
                    .or_else(|| metrics.get("probability_of_detection"))
                    .and_then(|v| v.as_f64())
                    .unwrap_or(0.0),
                pfa_window: metrics
                    .get("pfa_window")
                    .or_else(|| metrics.get("probability_of_false_alarm"))
                    .and_then(|v| v.as_f64())
                    .unwrap_or(0.0),
                dt: metrics
                    .get("avg_intercept_time_error_ms")
                    .and_then(|v| v.as_f64())
                    .unwrap_or(0.0),
                reward: metrics
                    .get("current_reward_score")
                    .and_then(|v| v.as_f64())
                    .unwrap_or(0.0),
                hits,
                misses,
                tuned_band: payload
                    .get("active_tuned_band")
                    .and_then(|v| v.as_u64())
                    .unwrap_or(0) as usize,
                mode: session.mode.clone(),
            });
            if samples.len() > 400 {
                let len = samples.len();
                samples.drain(0..len - 400);
            }
        }

        if let Some(log) = payload.get("explainable_ai_log") {
            if let Some(rationale) = log.get("rationale").and_then(|v| v.as_str()) {
                if let Some(action) = log.get("action_taken").and_then(|v| v.as_str()) {
                    if let Some(a) = log.get("agent").and_then(|v| v.as_str()) {
                        self.note_log(&format!("[{}] {} — {}", a, action, rationale));
                    }
                }
            }
        }

        let tuned = payload
            .get("active_tuned_band")
            .and_then(|v| v.as_u64())
            .unwrap_or(0) as usize;
        let bands = payload
            .get("band_states")
            .and_then(|v| v.as_array())
            .cloned()
            .unwrap_or_default();
        let tuned_row = bands.get(tuned).cloned().unwrap_or_default();
        let threat = tuned_row
            .get("threat_level")
            .and_then(|v| v.as_str())
            .unwrap_or("");
        let status = tuned_row
            .get("status")
            .and_then(|v| v.as_str())
            .unwrap_or("");

        if threat == "HIGH" && (status == "LOCKED" || status == "OCCUPIED") {
            self._flag(
                "HIGH_LOCK",
                "HIGH",
                tuned,
                &format!("High-threat lock on band {:02}", tuned + 1),
                "The receiver is dwelling on a HIGH-priority emitter (periodic / agile / short-pulse). This is the intercept you want to brief on the polar scope.",
            );
        }

        if agent.starts_with("REVISIT") && agent != self._last_agent {
            self._flag(
                "REVISIT",
                "MEDIUM",
                tuned,
                "Revisit agent pre-empted the tuner",
                "Age-of-Information crossed 850 ms on a stale slice, so the Revisit expert took the next hop instead of letting Eager starve that channel.",
            );
        }

        if misses > 0 && hits + misses > 0 {
            let session = self.current.as_ref().unwrap();
            let recent: Vec<&Sample> = session.samples.iter().rev().take(3).collect();
            if recent.len() >= 3
                && recent.iter().all(|s| s.misses >= misses - 2)
                && misses - recent.first().map(|s| s.misses).unwrap_or(0) >= 12
            {
                self._flag(
                    "MISS_BURST",
                    "MEDIUM",
                    tuned,
                    "Miss burst — emitters active off-tune",
                    "Several true emissions occurred while the tuner was on a quiet slice. Typical of open-loop; Smart Scan should shorten these bursts.",
                );
            }
        }

        self._last_agent = agent.to_string();
        let session = self.current.as_mut().unwrap();
        session.summary = compose_summary(session, true);
    }

    fn _flag(
        &mut self,
        kind: &str,
        severity: &str,
        band: usize,
        title: &str,
        detail: &str,
    ) {
        if self.current.is_none() {
            return;
        }
        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_secs_f64();
        let session = self.current.as_mut().unwrap();
        let already_flagged = session.flags.iter().any(|f| {
            f.kind == kind && f.band == band && now - f.t < 4.0
        });
        if already_flagged {
            return;
        }
        let id = Uuid::new_v4().to_string()[..8].to_string();
        session.flags.push(Flag {
            id,
            t: now - session.started_at,
            kind: kind.to_string(),
            severity: severity.to_string(),
            band,
            title: title.to_string(),
            detail: detail.to_string(),
        });
        if session.flags.len() > 80 {
            session.flags.drain(0..20);
        }
    }

    pub fn list_sessions(&self) -> Vec<SessionCard> {
        let mut items = Vec::new();
        if let Some(ref current) = self.current {
            items.push(self._card(current));
        }
        for session in &self.sessions {
            items.push(self._card(session));
        }
        items
    }

    pub fn get(&self, session_id: &str) -> Option<&Session> {
        if let Some(ref current) = self.current {
            if current.id == session_id {
                return Some(current);
            }
        }
        self.sessions.iter().find(|s| s.id == session_id)
    }

    fn _card(&self, session: &Session) -> SessionCard {
        let metrics = &session.metrics_end;
        SessionCard {
            id: session.id.clone(),
            label: session.label.clone(),
            status: session.status.clone(),
            mode: session.mode.clone(),
            started_at: session.started_at,
            ended_at: session.ended_at,
            flag_count: session.flags.len(),
            sample_count: session.samples.len(),
            pd: metrics
                .get("probability_of_detection")
                .and_then(|v| v.as_f64())
                .unwrap_or(0.0),
            hits: metrics
                .get("hits")
                .and_then(|v| v.as_i64())
                .unwrap_or(0),
            misses: metrics
                .get("misses")
                .and_then(|v| v.as_i64())
                .unwrap_or(0),
            summary: if session.summary.is_empty() {
                compose_summary(session, session.status == "LIVE")
            } else {
                session.summary.clone()
            },
        }
    }
}

import { create } from "zustand";

export type BandState = {
  band_id: number;
  center_freq_mhz: number;
  aoi_ms: number;
  priority_score: number;
  status: "IDLE" | "OCCUPIED" | "LOCKED";
  threat_level: "NONE" | "LOW" | "MEDIUM" | "HIGH";
  ignored?: boolean;
};

export type PDWIntercept = {
  pdw_id: number;
  toa_us: number;
  center_freq_mhz: number;
  pulse_width_us: number;
  aoa_deg: number;
  amplitude_db: number;
  emitter_class_id?: number;
  compass?: string;
  range_km?: number;
  born?: number;
  trackId?: number;
};

export type ExplainableLog = {
  agent: string;
  action_taken: string;
  rationale: string;
};

export type EnvKnobs = {
  sweep_ms: number;
  hostile_spawn: number;
  noise_floor: number;
  epsilon: number;
};

const DISPLAY_MS = 400;
const TRACK_MS = 5600;

function mergeTracks(previous: PDWIntercept[], incoming: PDWIntercept[], now: number): PDWIntercept[] {
  const byTrack = new Map<number, PDWIntercept>();
  for (const track of previous) {
    if (now - (track.born || now) < TRACK_MS) byTrack.set(track.trackId ?? 0, track);
  }
  for (const pdw of incoming) {
    const trackId = Math.round(pdw.center_freq_mhz / 500);
    const existing = byTrack.get(trackId);
    byTrack.set(trackId, {
      ...pdw,
      trackId,
      aoa_deg: existing?.aoa_deg ?? pdw.aoa_deg,
      compass: pdw.compass ?? existing?.compass,
      range_km: pdw.range_km ?? existing?.range_km,
      born: existing?.born ?? now,
    });
  }
  return [...byTrack.values()].filter((track) => now - (track.born || now) < TRACK_MS);
}

export type TacticalState = {
  isConnected: boolean;
  running: boolean;
  schedulerMode: "MANUAL" | "OPEN_LOOP" | "SMART_SCAN_MARL";
  activeTunedBand: number;
  sessionId: string | null;
  env: EnvKnobs;
  ignoredBands: number[];
  metrics: {
    pd: number;
    pfa: number;
    avgInterceptErrorMs: number;
    reward: number;
    hits: number;
    misses: number;
  };
  pdHistory: number[];
  pdInstantHistory: number[];
  bandStates: BandState[];
  latestPDWs: PDWIntercept[];
  aiLogs: string[];
  lastDisplayAt: number;
  setTelemetry: (data: Partial<TacticalState>) => void;
  ingestPayload: (raw: Record<string, unknown>) => void;
  setSchedulerMode: (mode: TacticalState["schedulerMode"]) => void;
};

export const useTacticalStore = create<TacticalState>((set) => ({
  isConnected: false,
  running: false,
  schedulerMode: "SMART_SCAN_MARL",
  activeTunedBand: 0,
  sessionId: null,
  env: { sweep_ms: 50, hostile_spawn: 0.55, noise_floor: 0.12, epsilon: 0.1 },
  ignoredBands: [],
  metrics: { pd: 0, pfa: 0, avgInterceptErrorMs: 0, reward: 0, hits: 0, misses: 0 },
  pdHistory: [],
  pdInstantHistory: [],
  bandStates: [],
  latestPDWs: [],
  aiLogs: [],
  lastDisplayAt: 0,
  setTelemetry: (data) => set((state) => ({ ...state, ...data })),
  setSchedulerMode: (mode) => set({ schedulerMode: mode }),
  ingestPayload: (raw) =>
    set((state) => {
      const now = Date.now();
      const metrics = (raw.metrics || {}) as Record<string, number>;
      const log = (raw.explainable_ai_log || {}) as ExplainableLog;
      const line = log.rationale ? `[${log.agent}] ${log.action_taken} — ${log.rationale}` : null;
      const pd = Number(metrics.probability_of_detection || 0);
      const hits = Number(metrics.hits || 0);
      const misses = Number(metrics.misses || 0);
      const dHits = Math.max(0, hits - state.metrics.hits);
      const dMiss = Math.max(0, misses - state.metrics.misses);
      const denom = dHits + dMiss;
      const instant = denom ? dHits / denom : (state.pdInstantHistory.at(-1) ?? 0);
      const envRaw = (raw.env || {}) as Partial<EnvKnobs>;
      const slow = now - state.lastDisplayAt < DISPLAY_MS;
      const incoming = (raw.latest_pdw_intercepts as PDWIntercept[]) || [];
      const nextLogs =
        line && line !== state.aiLogs[0] ? [line, ...state.aiLogs].slice(0, 240) : state.aiLogs;
      const pdHistory = [...state.pdHistory, pd * 100].slice(-72);
      const pdInstantHistory = [...state.pdInstantHistory, instant * 100].slice(-72);
      const base = {
        isConnected: true,
        running: Boolean(raw.running),
        schedulerMode: (raw.scheduler_mode as TacticalState["schedulerMode"]) || state.schedulerMode,
        sessionId: (raw.session_id as string) || state.sessionId,
        env: {
          sweep_ms: Number(envRaw.sweep_ms ?? state.env.sweep_ms),
          hostile_spawn: Number(envRaw.hostile_spawn ?? state.env.hostile_spawn),
          noise_floor: Number(envRaw.noise_floor ?? state.env.noise_floor),
          epsilon: Number(envRaw.epsilon ?? state.env.epsilon),
        },
        ignoredBands: (raw.ignored_bands as number[]) || state.ignoredBands,
        metrics: {
          pd,
          pfa: Number(metrics.probability_of_false_alarm || 0),
          avgInterceptErrorMs: Number(metrics.avg_intercept_time_error_ms || 0),
          reward: Number(metrics.current_reward_score || 0),
          hits,
          misses,
        },
        pdHistory,
        pdInstantHistory,
        aiLogs: nextLogs,
      };
      if (slow) {
        return {
          ...base,
          activeTunedBand: state.activeTunedBand,
          bandStates: state.bandStates,
          latestPDWs: mergeTracks(state.latestPDWs, incoming, now),
          lastDisplayAt: state.lastDisplayAt,
        };
      }
      return {
        ...base,
        activeTunedBand: Number(raw.active_tuned_band ?? state.activeTunedBand),
        bandStates: (raw.band_states as BandState[]) || state.bandStates,
        latestPDWs: mergeTracks(state.latestPDWs, incoming, now),
        lastDisplayAt: now,
      };
    }),
}));

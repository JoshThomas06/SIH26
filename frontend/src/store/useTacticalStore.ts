import { create } from "zustand";

export type BandState = {
  band_id: number;
  center_freq_mhz: number;
  aoi_ms: number;
  priority_score: number;
  status: "IDLE" | "OCCUPIED" | "LOCKED";
  threat_level: "NONE" | "LOW" | "MEDIUM" | "HIGH";
};

export type PDWIntercept = {
  pdw_id: number;
  toa_us: number;
  center_freq_mhz: number;
  pulse_width_us: number;
  aoa_deg: number;
  amplitude_db: number;
  emitter_class_id?: number;
};

export type ExplainableLog = {
  agent: string;
  action_taken: string;
  rationale: string;
};

export type TacticalState = {
  isConnected: boolean;
  running: boolean;
  schedulerMode: "MANUAL" | "OPEN_LOOP" | "SMART_SCAN_MARL";
  activeTunedBand: number;
  metrics: {
    pd: number;
    pfa: number;
    avgInterceptErrorMs: number;
    reward: number;
    hits: number;
    misses: number;
  };
  pdHistory: number[];
  bandStates: BandState[];
  latestPDWs: PDWIntercept[];
  aiLogs: string[];
  setTelemetry: (data: Partial<TacticalState>) => void;
  ingestPayload: (raw: Record<string, unknown>) => void;
  setSchedulerMode: (mode: TacticalState["schedulerMode"]) => void;
};

export const useTacticalStore = create<TacticalState>((set) => ({
  isConnected: false,
  running: false,
  schedulerMode: "SMART_SCAN_MARL",
  activeTunedBand: 0,
  metrics: { pd: 0, pfa: 0, avgInterceptErrorMs: 0, reward: 0, hits: 0, misses: 0 },
  pdHistory: [],
  bandStates: [],
  latestPDWs: [],
  aiLogs: [],
  setTelemetry: (data) => set((state) => ({ ...state, ...data })),
  setSchedulerMode: (mode) => set({ schedulerMode: mode }),
  ingestPayload: (raw) =>
    set((state) => {
      const metrics = (raw.metrics || {}) as Record<string, number>;
      const log = (raw.explainable_ai_log || {}) as ExplainableLog;
      const line = log.rationale
        ? `[${log.agent}] ${log.action_taken} — ${log.rationale}`
        : null;
      const pd = Number(metrics.probability_of_detection || 0);
      return {
        isConnected: true,
        running: Boolean(raw.running),
        schedulerMode: (raw.scheduler_mode as TacticalState["schedulerMode"]) || state.schedulerMode,
        activeTunedBand: Number(raw.active_tuned_band ?? state.activeTunedBand),
        metrics: {
          pd,
          pfa: Number(metrics.probability_of_false_alarm || 0),
          avgInterceptErrorMs: Number(metrics.avg_intercept_time_error_ms || 0),
          reward: Number(metrics.current_reward_score || 0),
          hits: Number(metrics.hits || 0),
          misses: Number(metrics.misses || 0),
        },
        pdHistory: [...state.pdHistory, pd].slice(-40),
        bandStates: (raw.band_states as BandState[]) || state.bandStates,
        latestPDWs: (raw.latest_pdw_intercepts as PDWIntercept[]) || state.latestPDWs,
        aiLogs: line ? [line, ...state.aiLogs].slice(0, 40) : state.aiLogs,
      };
    }),
}));

export type EmitterType = 'hostile' | 'friendly' | 'noise' | 'none';

export interface BandState {
  id: number;
  frequency: string;
  emitterType: EmitterType;
  signalStrength: number;
  isKnownThreat: boolean;
}

export interface SystemMetrics {
  totalScans: number;
  interceptions: number;
  hostileInterceptions: number;
  misses: number;
  interceptionRate: number;
  avgScanCycleTimeMs: number;
}

export type ScanStrategy = 'linear' | 'smart';

export interface LogEntry {
  id: string;
  timestamp: number;
  message: string;
  type: 'info' | 'warning' | 'critical' | 'success';
}

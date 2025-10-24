// Types for health monitoring use cases

export type UseCaseType = 'STROKE' | 'FRACT' | 'PARK' | 'ARTH' | 'GENERAL';

export interface FingerMetrics {
  mean: number;
  ROM: number;
  peak_vel?: number;
  jerk?: number;
  rehab_score?: number;
  tremor_power?: number;
  hysteresis?: number;
  stiff?: boolean;
}

export interface StrokeData {
  [fingerName: string]: FingerMetrics;
}

export interface FractureData {
  baseline: number;
  avg: number;
  deviation: number;
  ROM: number;
  alert: boolean;
}

export interface ParkinsonData {
  [fingerName: string]: FingerMetrics;
}

export interface ArthritisData {
  [fingerName: string]: FingerMetrics;
}

export interface HealthMonitoringMessage {
  use_case: UseCaseType;
  timestamp: number;
  data: StrokeData | FractureData | ParkinsonData | ArthritisData;
}

// Historical data for charting
export interface DataPoint {
  timestamp: number;
  value: number;
}

export interface FingerHistory {
  [fingerName: string]: DataPoint[];
}

// Types for health monitoring use cases

export type UseCaseType = 'STROKE' | 'FRACT' | 'PARK' | 'ARTH' | 'GENERAL' | 'VITALS';

export interface FingerMetrics {
  mean: number;
  ROM: number;
  peak_vel?: number;
  jerk?: number;
  rehab_score?: number;
  tremor_power?: number;
  hysteresis?: number;
  stiff?: boolean;
  alerts?: Array<{
    type: 'warning' | 'success' | 'info';
    message: string;
    finger?: string;
  }>;
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

export interface VitalsReading {
  timestamp?: number;
  gsr?: number;
  pulse?: number;
  st?: number;
  ecg?: number;
  user_id?: string;
}

export interface VitalsThreshold {
  label: string;
  unit: string;
  warnMin: number;
  warnMax: number;
  hardMin: number;
  hardMax: number;
  note?: string;
}

export interface VitalsAlert {
  sensor: string;
  level: 'warning' | 'danger';
  message: string;
  timestamp: number;
}

export interface HealthMonitoringMessage {
  use_case: UseCaseType;
  timestamp: number;
  data: StrokeData | FractureData | ParkinsonData | ArthritisData | VitalsReading;
}

// Historical data for charting
export interface DataPoint {
  timestamp: number;
  value: number;
}

export interface FingerHistory {
  [fingerName: string]: DataPoint[];
}

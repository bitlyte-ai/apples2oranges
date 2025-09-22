// Enhanced telemetry types for hybrid charting system
export interface TelemetrySession {
  id: string;
  name: string;
  timestamp: number;
  model_info: {
    model_a?: string;
    model_b?: string;
  };
  data: TelemetryDataPoint[];
  summary: SessionSummary;
  // Optional run configuration for analysis display
  config?: {
    telemetry_sampling_hz?: number;
    wait_for_cpu_baseline_between_models?: boolean;
    wait_for_cpu_baseline_margin_c?: number;
    run_without_telemetry?: boolean;
  };
  // Chat conversation data
  chat_history?: Message[];
  system_prompt?: string;
}

// Message interface for chat history
export interface Message {
  id: string;          // Unique identifier for each message
  role: string;
  content: string;
  model?: string;
  isEditing?: boolean; // Flag to track if message is in edit mode
  // Performance metrics (for assistant messages)
  ttft_ms?: number;    // Time to First Token
  avg_tps?: number;    // Average Tokens Per Second
  token_count?: number; // Total tokens in message
}

export interface TelemetryDataPoint {
  timestamp: number;
  cpu_power: number | null;
  gpu_power: number | null;
  ane_power: number | null;
  cpu_temp: number | null;
  gpu_temp: number | null;
  cpu_freq: number | null;
  gpu_freq: number | null;
  ram_usage: number | null;
  tps: number | null;
  instantaneous_tps: number | null;
  model: string | null;
  // Enhanced data
  cpu_temp_avg: number | null;
  cpu_temp_max: number | null;
  cpu_p_core_temps: number[] | null;
  cpu_e_core_temps: number[] | null;
  gpu_temp_avg: number | null;
  gpu_temp_max: number | null;
  gpu_cluster_temps: number[] | null;
  battery_temp_avg: number | null;
  cpu_p_core_utilization: number[] | null;
  cpu_e_core_utilization: number[] | null;
  cpu_overall_utilization: number | null;
  core_temperatures?: CoreTemperatureData;
  // NEW: Energy consumption fields
  total_energy_wh: number | null;
  cpu_energy_wh: number | null;
  gpu_energy_wh: number | null;
  ane_energy_wh: number | null;
  energy_rate_wh_per_token: number | null;
}

export interface TelemetryDataPointWithRelativeTime extends TelemetryDataPoint {
  relative_time_seconds: number; // Time from inference session start
}

export interface ModelTelemetrySession {
  model: 'A' | 'B';
  session_id: string;
  start_timestamp: number;
  end_timestamp?: number;
  data: TelemetryDataPointWithRelativeTime[];
  is_active: boolean;
  turn_number: number; // For multi-turn conversations
  session_offset_seconds: number; // Offset from global timeline start for continuity
}

// Container for managing overlay telemetry data
export interface OverlayTelemetryData {
  model_a_sessions: ModelTelemetrySession[];
  model_b_sessions: ModelTelemetrySession[];
  current_session_a?: ModelTelemetrySession;
  current_session_b?: ModelTelemetrySession;
}

export interface CoreTemperatureData {
  p_cores: number[];
  e_cores: number[];
  cpu_temp_avg: number;
  cpu_temp_max: number;
  cpu_temp_min: number;
  gpu_temps: number[];
  gpu_temp_avg?: number;
  gpu_temp_max?: number;
  battery_temp_avg?: number;
  thermal_trend: 'Cooling' | 'Heating' | 'Stable' | 'Rapid';
}

export interface SessionSummary {
  duration_ms: number;
  total_tokens: number;
  avg_tps: number;
  peak_cpu_temp: number;
  avg_power_consumption: number;
  model_performance: {
    [model: string]: {
      ttft_ms: number;
      avg_tps: number;
    }
  };
}

// Chart data transformation types
export interface ChartDataPoint {
  x: number;
  y: number;
  label?: string;
  model?: string;
}

export interface TimeSeriesPoint {
  timestamp: number;
  value: number;
  model?: string;
}

export interface ComparisonData {
  session1: TelemetrySession;
  session2: TelemetrySession;
  aligned_data: {
    time_points: number[];
    session1_data: number[][];
    session2_data: number[][];
  };
}
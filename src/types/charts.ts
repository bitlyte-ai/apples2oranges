// Chart.js and Plotly.js specific types
import type { ChartConfiguration, ChartData } from 'chart.js';

// Chart.js Live Chart Types
export interface LiveChartProps {
  data: ChartData;
  options?: ChartConfiguration['options'];
  height?: number;
}

export interface ChartColors {
  primary: string;
  secondary: string;
  accent: string;
  modelA: string;
  modelB: string;
  cpu: string;
  gpu: string;
  ane: string;
}

// Plotly.js Types
export interface PlotlyConfig {
  displayModeBar: boolean;
  responsive: boolean;
}

export interface PlotlyLayout {
  title?: string;
  xaxis?: any;
  yaxis?: any;
  scene?: any;
}

export interface PlotlyTrace {
  x?: any[];
  y?: any[];
  z?: any[];
  type: string;
  mode?: string;
  name?: string;
  marker?: any;
}

// Analysis Chart Props
export interface AnalysisChartProps {
  sessionData: any[];
  width?: number;
  height?: number;
  selectedVariables?: string[];
}

// Variable Selection Types
export type TelemetryVariable = 
  | 'cpu_power'
  | 'gpu_power'
  | 'ane_power'
  | 'cpu_temp_avg'
  | 'gpu_temp_avg'
  | 'ram_usage'
  | 'tps'
  | 'cpu_overall_utilization'
  | 'cpu_freq'
  | 'gpu_freq';

export interface VariableConfig {
  key: TelemetryVariable;
  label: string;
  unit: string;
  color: string;
}
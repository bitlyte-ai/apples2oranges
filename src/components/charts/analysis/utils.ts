import type { TelemetrySession, TelemetryDataPoint, ComparisonData } from '../../../types/telemetry';
import type { TelemetryVariable, VariableConfig } from '../../../types/charts';
import { MULTI_SESSION_COLORS } from './base/PlotlyThemes';

// Define available telemetry variables for analysis
export const TELEMETRY_VARIABLES: VariableConfig[] = [
  { key: 'cpu_power', label: 'CPU Power', unit: 'W', color: '#8884d8' },
  { key: 'gpu_power', label: 'GPU Power', unit: 'W', color: '#ff7300' },
  { key: 'ane_power', label: 'ANE Power', unit: 'W', color: '#10b981' },
  { key: 'cpu_temp_avg', label: 'CPU Temperature', unit: '°C', color: '#f56565' },
  { key: 'gpu_temp_avg', label: 'GPU Temperature', unit: '°C', color: '#ed8936' },
  { key: 'ram_usage', label: 'RAM Usage', unit: 'GB', color: '#9f7aea' },
  { key: 'tps', label: 'Tokens per Second', unit: 'TPS', color: '#38b2ac' },
  { key: 'cpu_overall_utilization', label: 'CPU Utilization', unit: '%', color: '#4299e1' },
  { key: 'cpu_freq', label: 'CPU Frequency', unit: 'MHz', color: '#48bb78' },
  { key: 'gpu_freq', label: 'GPU Frequency', unit: 'MHz', color: '#ed64a6' },
];

// Get variable configuration by key
export const getVariableConfig = (key: TelemetryVariable): VariableConfig | undefined => {
  return TELEMETRY_VARIABLES.find(v => v.key === key);
};

// Extract values for a specific variable from telemetry data
export const extractVariableValues = (
  data: TelemetryDataPoint[], 
  variable: TelemetryVariable
): (number | null)[] => {
  return data.map(point => {
    switch (variable) {
      case 'cpu_power': return point.cpu_power;
      case 'gpu_power': return point.gpu_power;
      case 'ane_power': return point.ane_power;
      case 'cpu_temp_avg': return point.cpu_temp_avg;
      case 'gpu_temp_avg': return point.gpu_temp_avg;
      case 'ram_usage': return point.ram_usage;
      case 'tps': return point.tps;
      case 'cpu_overall_utilization': return point.cpu_overall_utilization;
      case 'cpu_freq': return point.cpu_freq;
      case 'gpu_freq': return point.gpu_freq;
      default: return null;
    }
  });
};

// Filter out null values and return valid data points with indices
export const getValidDataPoints = (
  data: TelemetryDataPoint[],
  variables: TelemetryVariable[]
): { indices: number[]; values: { [key: string]: number[] } } => {
  const validIndices: number[] = [];
  const values: { [key: string]: number[] } = {};
  
  variables.forEach(variable => {
    values[variable] = [];
  });
  
  data.forEach((point, index) => {
    const allValuesPresent = variables.every(variable => {
      const value = extractVariableValues([point], variable)[0];
      return value !== null && value !== undefined && !isNaN(value);
    });
    
    if (allValuesPresent) {
      validIndices.push(index);
      variables.forEach(variable => {
        const value = extractVariableValues([point], variable)[0];
        values[variable].push(value!);
      });
    }
  });
  
  return { indices: validIndices, values };
};

// Generate comparison data for two sessions
export const generateComparisonData = (
  session1: TelemetrySession,
  session2: TelemetrySession
): ComparisonData => {
  // Find the maximum duration to align time series
  const maxDuration = Math.max(
    session1.summary.duration_ms,
    session2.summary.duration_ms
  );
  
  // Create time points array (every second)
  const timePoints = Array.from(
    { length: Math.ceil(maxDuration / 1000) }, 
    (_, i) => i * 1000
  );
  
  // Interpolate session data to common time points
  const session1Data: number[][] = [];
  const session2Data: number[][] = [];
  
  TELEMETRY_VARIABLES.forEach(variable => {
    const values1 = extractVariableValues(session1.data, variable.key);
    const values2 = extractVariableValues(session2.data, variable.key);
    
    session1Data.push(interpolateToTimePoints(
      session1.data.map(d => d.timestamp),
      values1,
      timePoints
    ));
    
    session2Data.push(interpolateToTimePoints(
      session2.data.map(d => d.timestamp),
      values2,
      timePoints
    ));
  });
  
  return {
    session1,
    session2,
    aligned_data: {
      time_points: timePoints,
      session1_data: session1Data,
      session2_data: session2Data
    }
  };
};

// Simple linear interpolation for time series data
const interpolateToTimePoints = (
  originalTimes: number[],
  originalValues: (number | null)[],
  targetTimes: number[]
): number[] => {
  return targetTimes.map(targetTime => {
    // Find the closest valid data points
    let beforeIndex = -1;
    let afterIndex = -1;
    
    for (let i = 0; i < originalTimes.length; i++) {
      if (originalValues[i] !== null) {
        if (originalTimes[i] <= targetTime) {
          beforeIndex = i;
        } else if (afterIndex === -1) {
          afterIndex = i;
          break;
        }
      }
    }
    
    // Handle edge cases
    if (beforeIndex === -1 && afterIndex === -1) return 0;
    if (beforeIndex === -1) return originalValues[afterIndex]!;
    if (afterIndex === -1) return originalValues[beforeIndex]!;
    if (beforeIndex === afterIndex) return originalValues[beforeIndex]!;
    
    // Linear interpolation
    const timeDiff = originalTimes[afterIndex] - originalTimes[beforeIndex];
    const valueDiff = originalValues[afterIndex]! - originalValues[beforeIndex]!;
    const ratio = (targetTime - originalTimes[beforeIndex]) / timeDiff;
    
    return originalValues[beforeIndex]! + (ratio * valueDiff);
  });
};

// Generate distinct colors for different datasets
// Use the consolidated palette so all analysis charts are consistent
export const generateColors = (count: number): string[] => {
  const colors: string[] = [];
  for (let i = 0; i < count; i++) {
    colors.push(MULTI_SESSION_COLORS[i % MULTI_SESSION_COLORS.length]);
  }
  return colors;
};

// Normalize data for radar charts (0-1 scale)
export const normalizeData = (values: number[]): number[] => {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min;
  
  if (range === 0) return values.map(() => 0.5);
  
  return values.map(value => (value - min) / range);
};
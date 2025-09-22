import { create } from 'zustand';
import type { TelemetryDataPoint, TelemetrySession } from '../types/telemetry';

// Import types from App.tsx - these will be moved to a shared types file later
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

export interface TelemetryData {
  timestamp: number;
  cpu_power: number | null;
  gpu_power: number | null;
  ane_power: number | null;
  cpu_temp: number | null;
  gpu_temp: number | null;
  cpu_freq: number | null;
  gpu_freq: number | null;
  ram_usage: number | null;
  thermal_pressure: string | null;
  tps: number | null;
  instantaneous_tps: number | null;
  model: string | null;
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

interface SummaryStats {
  ttft_ms?: number;
  avg_tps?: number;
  model?: string;
  energy_per_token_wh?: number;
}

export interface TelemetryState {
  // Telemetry data
  telemetryData: TelemetryData[];
  summaryStats: { A?: SummaryStats; B?: SummaryStats };

  // Cooldown (ephemeral, not persisted)
  cooldownActive: boolean;
  cooldownStatus: 'started' | 'progress' | 'complete' | 'timeout' | 'canceled' | null;
  cooldownBaselineC: number | null;
  cooldownThresholdC: number | null;
  cooldownMarginC: number; // default 2.0
  cooldownPoints: { timestamp: number; value: number }[];

  // Session management
  telemetrySessions: TelemetrySession[];
  sessionSaveDialogOpen: boolean;
  unsavedChangesDialogOpen: boolean;
  pendingCloseAction: (() => void) | null;
  dialogContext: 'close' | 'clear' | 'switch-mode' | 'new-chat';

  // Actions
  setTelemetryData: (data: TelemetryData[]) => void;
  setSummaryStats: (stats: { A?: SummaryStats; B?: SummaryStats }) => void;
  setTelemetrySessions: (sessions: TelemetrySession[]) => void;
  setSessionSaveDialogOpen: (open: boolean) => void;
  setUnsavedChangesDialogOpen: (open: boolean) => void;
  setPendingCloseAction: (action: (() => void) | null) => void;
  setDialogContext: (context: 'close' | 'clear' | 'switch-mode' | 'new-chat') => void;

  // Helper actions
  addTelemetryData: (data: TelemetryData) => void;
  clearTelemetryData: () => void;
  clearSummaryStats: () => void;
  getLatestTelemetry: () => TelemetryData | null;
  transformTelemetryData: () => TelemetryDataPoint[];
  updateSummaryStats: (model: 'A' | 'B', stats: Partial<SummaryStats>) => void;

  // Cooldown actions
  setCooldownActive: (active: boolean) => void;
  setCooldownStatus: (status: 'started' | 'progress' | 'complete' | 'timeout' | 'canceled' | null) => void;
  setCooldownMeta: (baseline: number | null, threshold: number | null, margin: number) => void;
  addCooldownPoint: (timestamp: number, value: number) => void;
  clearCooldownPoints: () => void;
}

export const useTelemetryStore = create<TelemetryState>((set, get) => ({
  // Initial state
  telemetryData: [],
  summaryStats: {},

  // Cooldown initial state
  cooldownActive: false,
  cooldownStatus: null,
  cooldownBaselineC: null,
  cooldownThresholdC: null,
  cooldownMarginC: 2.0,
  cooldownPoints: [],

  // Sessions UI state
  telemetrySessions: [],
  sessionSaveDialogOpen: false,
  unsavedChangesDialogOpen: false,
  pendingCloseAction: null,
  dialogContext: 'close',

  // Basic setters
  setTelemetryData: (data) => set({ telemetryData: data }),
  setSummaryStats: (stats) => set({ summaryStats: stats }),
  setTelemetrySessions: (sessions) => set({ telemetrySessions: sessions }),
  setSessionSaveDialogOpen: (open) => set({ sessionSaveDialogOpen: open }),
  setUnsavedChangesDialogOpen: (open) => set({ unsavedChangesDialogOpen: open }),
  setPendingCloseAction: (action) => set({ pendingCloseAction: action }),
  setDialogContext: (context) => set({ dialogContext: context }),

  // Helper actions
  addTelemetryData: (data) => {
    const { telemetryData } = get();
    const newData = [...telemetryData, data];
    // Keep only last 10000 data points for performance
    const result = newData.length > 10000 ? newData.slice(-10000) : newData;
    set({ telemetryData: result });
  },

  clearTelemetryData: () => {
    set({ telemetryData: [], summaryStats: {} });
  },

  clearSummaryStats: () => {
    set({ summaryStats: {} });
  },

  getLatestTelemetry: () => {
    const { telemetryData } = get();
    return telemetryData.length > 0 ? telemetryData[telemetryData.length - 1] : null;
  },

  transformTelemetryData: () => {
    const { telemetryData } = get();
    return telemetryData.map(d => ({
      timestamp: d.timestamp,
      cpu_power: d.cpu_power,
      gpu_power: d.gpu_power,
      ane_power: d.ane_power,
      cpu_temp: d.cpu_temp,
      gpu_temp: d.gpu_temp,
      cpu_freq: d.cpu_freq,
      gpu_freq: d.gpu_freq,
      ram_usage: d.ram_usage,
      tps: d.tps,
      instantaneous_tps: d.instantaneous_tps,
      model: d.model,
      cpu_temp_avg: d.cpu_temp_avg,
      cpu_temp_max: d.cpu_temp_max,
      cpu_p_core_temps: d.cpu_p_core_temps,
      cpu_e_core_temps: d.cpu_e_core_temps,
      gpu_temp_avg: d.gpu_temp_avg,
      gpu_temp_max: d.gpu_temp_max,
      gpu_cluster_temps: d.gpu_cluster_temps,
      battery_temp_avg: d.battery_temp_avg,
      cpu_p_core_utilization: d.cpu_p_core_utilization,
      cpu_e_core_utilization: d.cpu_e_core_utilization,
      cpu_overall_utilization: d.cpu_overall_utilization,
      core_temperatures: d.core_temperatures,
      // NEW: Energy field mappings
      total_energy_wh: d.total_energy_wh,
      cpu_energy_wh: d.cpu_energy_wh,
      gpu_energy_wh: d.gpu_energy_wh,
      ane_energy_wh: d.ane_energy_wh,
      energy_rate_wh_per_token: d.energy_rate_wh_per_token,
    } as TelemetryDataPoint));
  },

  updateSummaryStats: (model, stats) => {
    const { summaryStats } = get();
    set({ 
      summaryStats: {
        ...summaryStats,
        [model]: { ...summaryStats[model], ...stats }
      }
    });
  },

  // Cooldown actions
  setCooldownActive: (active) => set({ cooldownActive: active }),
  setCooldownStatus: (status) => set({ cooldownStatus: status }),
  setCooldownMeta: (baseline, threshold, margin) => set({ cooldownBaselineC: baseline, cooldownThresholdC: threshold, cooldownMarginC: margin }),
  addCooldownPoint: (timestamp, value) => {
    const { cooldownPoints } = get();
    const updated = [...cooldownPoints, { timestamp, value }];
    // Limit to last 600 points (~10 min at 1s) to prevent unbounded growth
    set({ cooldownPoints: updated.length > 600 ? updated.slice(-600) : updated });
  },
  clearCooldownPoints: () => set({ cooldownPoints: [] }),
}));

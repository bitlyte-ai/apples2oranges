import { useEffect } from 'react';
import { DEBUG_LOGS } from '../utils/debug';
import type React from 'react';
import { listen } from '@tauri-apps/api/event';
import type { TelemetryDataPoint } from '../types/telemetry';
import type { Message } from '../components/chat/MessageItem';
import type { CoreTemperatureData } from '../stores/telemetryStore';
import type { useOverlayTelemetry } from './useOverlayTelemetry';
import { useTelemetryStore } from '../stores/telemetryStore';

// Event interfaces matching App.tsx
interface TokenEvent {
  token: string;
  model: string;
  finished: boolean;
}

interface InputTokenEvent {
  count: number;
  model: string;
  timestamp_ms: number;
}

interface OutputTokenEvent {
  count: number;
  model: string;
  timestamp_ms: number;
}

interface SystemPromptTokenEvent {
  count: number;
  timestamp_ms: number;
}

interface GenerationTimeEvent {
  generation_time_ms: number;
  model: string;
  timestamp_ms: number;
}

interface PowerConsumptionSummaryEvent {
  total_energy_wh: number;
  cpu_energy_wh: number;
  gpu_energy_wh: number;
  ane_energy_wh: number;
  energy_per_token_wh?: number;
  model: string;
  timestamp_ms: number;
}

interface CooldownUpdateEvent {
  state: 'started' | 'progress' | 'complete' | 'timeout' | 'canceled';
  baseline_c?: number | null;
  margin_c: number;
  threshold_c?: number | null;
  current_c?: number | null;
  elapsed_s?: number | null;
  timestamp_ms: number;
}

interface TelemetryUpdate {
  timestamp_ms: number;
  cpu_power_watts?: number;
  gpu_power_watts?: number;
  ane_power_watts?: number;
  cpu_temp_celsius?: number;
  gpu_temp_celsius?: number;
  cpu_freq_mhz?: number;
  gpu_freq_mhz?: number;
  ram_usage_gb?: number;
  thermal_pressure?: string;
  ttft_ms?: number;
  current_tps?: number;
  instantaneous_tps?: number;
  model?: string;
  // Enhanced temperature data
  cpu_temp_avg?: number;
  cpu_temp_max?: number;
  cpu_p_core_temps?: number[];
  cpu_e_core_temps?: number[];
  gpu_temp_avg?: number;
  gpu_temp_max?: number;
  gpu_cluster_temps?: number[];
  battery_temp_avg?: number;
  // CPU utilization data
  cpu_p_core_utilization?: number[];
  cpu_e_core_utilization?: number[];
  cpu_overall_utilization?: number;
  core_temperatures?: CoreTemperatureData;
  // NEW: Energy consumption fields
  total_energy_wh?: number;
  cpu_energy_wh?: number;
  gpu_energy_wh?: number;
  ane_energy_wh?: number;
  energy_rate_wh_per_token?: number;
}

interface UseTauriEventListenersOptions {
  // Store action methods (not state) - follows existing pattern
  addTokenToStreaming: (model: 'A' | 'B', token: string) => void;
  finishStreamingForModel: (model: 'A' | 'B', summaryStats: any, generateId: () => string) => void;
  clearStreamingForModel: (model: 'A' | 'B') => void;
  updateMessageTokenCount: (role: 'user' | 'assistant', model: string | undefined, count: number) => void;
  updateMessageGenerationTime: (model: string, generationTimeMs: number) => void;
  updateInputTokenCount: (model: 'A' | 'B', count: number) => void;
  updateOutputTokenCount: (model: 'A' | 'B', count: number) => void;
  setSystemPromptTokenCount: (count: number) => void;
  addTelemetryData: (data: any) => void;
  updateSummaryStats: (model: 'A' | 'B', stats: any) => void;
  overlayTelemetryRef: React.MutableRefObject<ReturnType<typeof useOverlayTelemetry>>;
  // Additional dependencies
  streamingResponses: { A?: string; B?: string };
  chatHistory: Message[];
  setChatHistory: (history: Message[]) => void;
  setIsLoading: (loading: boolean) => void;
  setIsStopping: (stopping: boolean) => void;
  summaryStats: any;
  telemetryData: any[];
  generateMessageId: () => string;
}

/**
 * Utility hook for setting up Tauri event listeners
 * 
 * This hook handles all Tauri event integration for token streaming,
 * telemetry updates, and generation control. It follows the established
 * pattern of pure utility hooks that delegate to store methods.
 */
export const useTauriEventListeners = (options: UseTauriEventListenersOptions) => {
  const {
    addTokenToStreaming,
    finishStreamingForModel,
    clearStreamingForModel: _clearStreamingForModel, // Unused in current implementation but kept for interface compatibility
    updateMessageTokenCount,
    updateMessageGenerationTime,
    updateInputTokenCount,
    updateOutputTokenCount,
    setSystemPromptTokenCount,
    addTelemetryData,
    updateSummaryStats,
    overlayTelemetryRef,
    streamingResponses,
    chatHistory: _chatHistory, // Unused in stopped handler but kept for other event handlers
    setChatHistory: _setChatHistory, // Unused in stopped handler but kept for other event handlers 
    setIsLoading,
    setIsStopping,
    summaryStats,
    telemetryData,
    generateMessageId,
  } = options;

  const {
    setCooldownActive,
    setCooldownMeta,
    setCooldownStatus,
    addCooldownPoint,
    clearCooldownPoints,
  } = useTelemetryStore();

  useEffect(() => {
    const setupListener = async () => {
      const listenerId = Math.random().toString(36).slice(2, 11);
      DEBUG_LOGS && console.log(`🔧 FRONTEND: Setting up event listeners with ID: ${listenerId}`);
      DEBUG_LOGS && console.log(`🔧 FRONTEND: Current telemetryData length at setup: ${telemetryData.length}`);

      const unlistenTokens = await listen<TokenEvent>("new_token", (event) => {
        const { token, model, finished } = event.payload;
        DEBUG_LOGS && console.log(`[${listenerId}] Frontend received - Model: ${model}, Token: '${token}', Finished: ${finished}`);
        
        // Start telemetry session on first token (if not already started)
        if (!finished && token && (model === 'A' || model === 'B')) {
          const currentSession = model === 'A' 
            ? overlayTelemetryRef.current.overlayData.current_session_a
            : overlayTelemetryRef.current.overlayData.current_session_b;
          
          if (!currentSession?.is_active) {
            overlayTelemetryRef.current.startModelSession(model as 'A' | 'B');
          }
        }
        
        if (finished) {
          // End telemetry session for this model
          if (model === 'A' || model === 'B') {
            overlayTelemetryRef.current.endModelSession(model as 'A' | 'B');
          }
          
          // Token stream finished for this model, add to chat history
          finishStreamingForModel(model as 'A' | 'B', summaryStats, generateMessageId);
          
          // Reset stopping state when generation naturally finishes
          setIsStopping(false);
        } else {
          // Add token to streaming response
          const currentResponse = streamingResponses[model as "A" | "B"] || "";
          const newResponse = currentResponse + token;
          DEBUG_LOGS && console.log(`[${listenerId}] Accumulating - Model: ${model}, Current: '${currentResponse}', Token: '${token}', New: '${newResponse}'`);
          addTokenToStreaming(model as 'A' | 'B', token);
        }
      });

      // Set up hybrid tokenization event listeners
      const unlistenInputTokens = await listen<InputTokenEvent>("input_tokens", (event) => {
        const { count, model } = event.payload;
        DEBUG_LOGS && console.log(`[${listenerId}] 📊 INPUT TOKENS: Model ${model} input token count: ${count}`);
        updateInputTokenCount(model as 'A' | 'B', count);
        // Note: Do NOT update per-message token count here; this is total conversation tokens.
      });
      
      // New: per-message user input token counts (last message only)
      const unlistenUserInputTokens = await listen<InputTokenEvent>("user_input_tokens", (event) => {
        const { count, model } = event.payload;
        DEBUG_LOGS && console.log(`[${listenerId}] 📝 USER INPUT TOKENS: Model ${model} last message token count: ${count}`);
        updateMessageTokenCount('user', undefined, count);
      });

      const unlistenOutputTokens = await listen<OutputTokenEvent>("output_tokens", (event) => {
        const { count, model } = event.payload;
        DEBUG_LOGS && console.log(`[${listenerId}] 📊 OUTPUT TOKENS: Model ${model} output token count: ${count}`);
        updateOutputTokenCount(model as 'A' | 'B', count);
        
        // Update the most recent assistant message from this model with token count
        // Use setTimeout to ensure this runs after the assistant message is added to history
        setTimeout(() => {
          updateMessageTokenCount('assistant', model, count);
        }, 10);
      });
      
      const unlistenSystemPromptTokens = await listen<SystemPromptTokenEvent>("system_prompt_tokens", (event) => {
        const { count } = event.payload;
        DEBUG_LOGS && console.log(`[${listenerId}] 📊 SYSTEM PROMPT TOKENS: ${count}`);
        setSystemPromptTokenCount(count);
      });
      
      const unlistenGenerationTime = await listen<GenerationTimeEvent>("generation_time", (event) => {
        const { generation_time_ms, model } = event.payload;
        DEBUG_LOGS && console.log(`[${listenerId}] ⏱️ GENERATION TIME: Model ${model} took ${generation_time_ms}ms`);
        
        // Update the most recent assistant message from this model with generation time
        // Use setTimeout to ensure this runs after the assistant message is added to history
        setTimeout(() => {
          updateMessageGenerationTime(model, generation_time_ms);
        }, 50); // Slightly longer delay to ensure message is in history
      });
      
      const unlistenPowerSummary = await listen<PowerConsumptionSummaryEvent>("power_consumption_summary", (event) => {
        const { energy_per_token_wh, model } = event.payload;
        DEBUG_LOGS && console.log(`[${listenerId}] ⚡ POWER SUMMARY: Model ${model} energy per token: ${energy_per_token_wh}Wh`);
        
        // Update summary stats with energy per token data
        if (energy_per_token_wh !== undefined) {
          updateSummaryStats(model as 'A' | 'B', {
            energy_per_token_wh: energy_per_token_wh
          });
        }
      });

      // Cooldown progress listener
      const unlistenCooldown = await listen<CooldownUpdateEvent>("cooldown_update", (event) => {
        const payload = event.payload;
        DEBUG_LOGS && console.log(`[${listenerId}] ❄️ COOLDOWN UPDATE:`, payload);
        if (payload.state === 'started') {
          setCooldownActive(true);
          setCooldownStatus('started');
          setCooldownMeta(payload.baseline_c ?? null, payload.threshold_c ?? null, payload.margin_c);
          // reset points only
          clearCooldownPoints();
          setCooldownActive(true);
          setCooldownStatus('started');
          setCooldownMeta(payload.baseline_c ?? null, payload.threshold_c ?? null, payload.margin_c);
        } else if (payload.state === 'progress') {
          if (payload.current_c !== undefined && payload.current_c !== null) {
            addCooldownPoint(payload.timestamp_ms, payload.current_c);
          }
          setCooldownStatus('progress');
        } else if (payload.state === 'complete') {
          if (payload.current_c !== undefined && payload.current_c !== null) {
            addCooldownPoint(payload.timestamp_ms, payload.current_c);
          }
          setCooldownStatus('complete');
          setCooldownActive(false);
        } else if (payload.state === 'timeout' || payload.state === 'canceled') {
          setCooldownStatus(payload.state);
          setCooldownActive(false);
        }
      });

      DEBUG_LOGS && console.log(`🔧 FRONTEND: Setting up telemetry_update listener...`);
      const unlistenTelemetry = await listen<TelemetryUpdate>("telemetry_update", (event) => {
        const telemetry = event.payload;
        DEBUG_LOGS && console.log(`[${listenerId}] 🎉 FRONTEND: *** TELEMETRY EVENT RECEIVED ***`);
        DEBUG_LOGS && console.log(`[${listenerId}] 📊 FRONTEND: Raw telemetry payload:`, telemetry);
        DEBUG_LOGS && console.log(`[${listenerId}] 📊 FRONTEND: Telemetry timestamp:`, new Date(telemetry.timestamp_ms).toLocaleTimeString());
        DEBUG_LOGS && console.log(`[${listenerId}] 📊 FRONTEND: Has CPU power:`, !!telemetry.cpu_power_watts);
        DEBUG_LOGS && console.log(`[${listenerId}] 📊 FRONTEND: Has model:`, !!telemetry.model);
        
        // Create TelemetryDataPoint for overlay system
        const telemetryDataPoint: TelemetryDataPoint = {
          timestamp: telemetry.timestamp_ms,
          cpu_power: telemetry.cpu_power_watts || null,
          gpu_power: telemetry.gpu_power_watts || null,
          ane_power: telemetry.ane_power_watts || null,
          cpu_temp: telemetry.core_temperatures?.cpu_temp_avg || telemetry.cpu_temp_celsius || null,
          gpu_temp: telemetry.core_temperatures?.gpu_temp_avg || telemetry.gpu_temp_celsius || null,
          cpu_freq: telemetry.cpu_freq_mhz || null,
          gpu_freq: telemetry.gpu_freq_mhz || null,
          ram_usage: telemetry.ram_usage_gb || null,
          tps: telemetry.current_tps || null,
          instantaneous_tps: telemetry.instantaneous_tps || null,
          model: telemetry.model || null,
          // Enhanced temperature data
          cpu_temp_avg: telemetry.cpu_temp_avg || null,
          cpu_temp_max: telemetry.cpu_temp_max || null,
          cpu_p_core_temps: telemetry.cpu_p_core_temps || null,
          cpu_e_core_temps: telemetry.cpu_e_core_temps || null,
          gpu_temp_avg: telemetry.gpu_temp_avg || null,
          gpu_temp_max: telemetry.gpu_temp_max || null,
          gpu_cluster_temps: telemetry.gpu_cluster_temps || null,
          battery_temp_avg: telemetry.battery_temp_avg || null,
          // CPU utilization data
          cpu_p_core_utilization: telemetry.cpu_p_core_utilization || null,
          cpu_e_core_utilization: telemetry.cpu_e_core_utilization || null,
          cpu_overall_utilization: telemetry.cpu_overall_utilization || null,
          core_temperatures: telemetry.core_temperatures,
          // NEW: Energy field mappings
          total_energy_wh: telemetry.total_energy_wh || null,
          cpu_energy_wh: telemetry.cpu_energy_wh || null,
          gpu_energy_wh: telemetry.gpu_energy_wh || null,
          ane_energy_wh: telemetry.ane_energy_wh || null,
          energy_rate_wh_per_token: telemetry.energy_rate_wh_per_token || null,
        };

        // Add to overlay telemetry system
        overlayTelemetryRef.current.addTelemetryPoint(telemetryDataPoint);

        // Add to telemetry data store (with 500-item limit)
        const newData = {
          timestamp: telemetry.timestamp_ms,
          cpu_power: telemetry.cpu_power_watts || null,
          gpu_power: telemetry.gpu_power_watts || null,
          ane_power: telemetry.ane_power_watts || null,
          cpu_temp: telemetry.core_temperatures?.cpu_temp_avg || telemetry.cpu_temp_celsius || null,
          gpu_temp: telemetry.core_temperatures?.gpu_temp_avg || telemetry.gpu_temp_celsius || null,
          cpu_freq: telemetry.cpu_freq_mhz || null,
          gpu_freq: telemetry.gpu_freq_mhz || null,
          ram_usage: telemetry.ram_usage_gb || null,
          thermal_pressure: telemetry.thermal_pressure || null,
          tps: telemetry.current_tps || null,
          instantaneous_tps: telemetry.instantaneous_tps || null,
          model: telemetry.model || null,
          // Enhanced temperature data
          cpu_temp_avg: telemetry.cpu_temp_avg || null,
          cpu_temp_max: telemetry.cpu_temp_max || null,
          cpu_p_core_temps: telemetry.cpu_p_core_temps || null,
          cpu_e_core_temps: telemetry.cpu_e_core_temps || null,
          gpu_temp_avg: telemetry.gpu_temp_avg || null,
          gpu_temp_max: telemetry.gpu_temp_max || null,
          gpu_cluster_temps: telemetry.gpu_cluster_temps || null,
          battery_temp_avg: telemetry.battery_temp_avg || null,
          // CPU utilization data
          cpu_p_core_utilization: telemetry.cpu_p_core_utilization || null,
          cpu_e_core_utilization: telemetry.cpu_e_core_utilization || null,
          cpu_overall_utilization: telemetry.cpu_overall_utilization || null,
          core_temperatures: telemetry.core_temperatures,
          // NEW: Energy field mappings
          total_energy_wh: telemetry.total_energy_wh || null,
          cpu_energy_wh: telemetry.cpu_energy_wh || null,
          gpu_energy_wh: telemetry.gpu_energy_wh || null,
          ane_energy_wh: telemetry.ane_energy_wh || null,
          energy_rate_wh_per_token: telemetry.energy_rate_wh_per_token || null,
        };

        DEBUG_LOGS && console.log(`[${listenerId}] 📈 FRONTEND: Creating TelemetryData object:`, {
          timestamp: new Date(telemetry.timestamp_ms).toLocaleTimeString(),
          cpu_power: telemetry.cpu_power_watts,
          cpu_temp_avg: telemetry.cpu_temp_avg,
          model: telemetry.model,
          hasValidData: !!(telemetry.cpu_power_watts || telemetry.cpu_temp_avg || telemetry.current_tps)
        });

        DEBUG_LOGS && console.log(`[${listenerId}] 📈 FRONTEND: Previous telemetry array length: ${telemetryData.length}`);
        addTelemetryData(newData);
        DEBUG_LOGS && console.log(`[${listenerId}] 📈 FRONTEND: *** TELEMETRY ADDED TO STORE *** - New data added`);
        DEBUG_LOGS && console.log(`[${listenerId}] 📈 FRONTEND: Latest data point:`, newData);

        DEBUG_LOGS && console.log(`[${listenerId}] ⚡ FRONTEND: setTelemetryData called, state should update now`);

        // Update summary stats for TTFT
        if (telemetry.ttft_ms && telemetry.model) {
          updateSummaryStats(telemetry.model as 'A' | 'B', {
            ttft_ms: telemetry.ttft_ms
          });
        }

        // Update summary stats for average TPS
        if (telemetry.current_tps && telemetry.model) {
          updateSummaryStats(telemetry.model as 'A' | 'B', {
            avg_tps: telemetry.current_tps
          });
        }
      });
      
      // Set up generation stopped event listener
      const unlistenStopped = await listen<TokenEvent>("generation_stopped", (event) => {
        const { model } = event.payload;
        DEBUG_LOGS && console.log(`[🛑 ${listenerId}] Generation stopped for Model: ${model}`);
        
        // End telemetry session for stopped model
        if (model === 'A' || model === 'B') {
          overlayTelemetryRef.current.endModelSession(model as 'A' | 'B');
        }
        
        // DO NOT clear streaming response or move to chat history when stopped
        // Keep the partial response visible in the streaming UI so user can see the incomplete output
        // The user can manually clear it later using the clear button
        DEBUG_LOGS && console.log(`[🛑 ${listenerId}] Preserving partial response for Model: ${model}`);
        const partialResponse = streamingResponses[model as "A" | "B"] || "";
        if (partialResponse) {
          DEBUG_LOGS && console.log(`[🛑 ${listenerId}] Partial response preserved: "${partialResponse.substring(0, 100)}..."`);
        }
        
        // Reset loading states but keep streaming content visible
        setIsLoading(false);
        setIsStopping(false);
      });
      
      DEBUG_LOGS && console.log(`🔧 FRONTEND: Event listeners successfully set up with ID: ${listenerId}`);
      return () => {
        console.log(`🔧 FRONTEND: Cleaning up listeners for ID: ${listenerId}`);
        unlistenTokens();
        unlistenTelemetry();
        unlistenInputTokens();
        unlistenOutputTokens();
        unlistenSystemPromptTokens();
        unlistenGenerationTime();
        unlistenPowerSummary();
        unlistenCooldown();
        unlistenUserInputTokens();
        unlistenStopped();
      };
    };

    let unlistenPromise: Promise<() => void> | undefined;

    DEBUG_LOGS && console.log(`🔧 FRONTEND: Starting listener setup...`);
    unlistenPromise = setupListener();

    return () => {
      DEBUG_LOGS && console.log("🔧 FRONTEND: Component cleanup - removing listeners");
      if (unlistenPromise) {
        unlistenPromise.then(cleanup => cleanup());
      }
    };
  }, []); // Empty dependency array to prevent infinite re-renders
};
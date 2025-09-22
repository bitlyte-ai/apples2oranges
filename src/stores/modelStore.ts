import { create } from 'zustand';

export interface ModelConfig {
  model_path: string;
  temperature?: number;      
  top_k?: number;           
  top_p?: number;           
  min_p?: number;           
  repeat_penalty?: number;   
  repeat_last_n?: number;   
  frequency_penalty?: number; 
  presence_penalty?: number; 
  n_ctx?: number;
  wait_for_cpu_baseline_between_models?: boolean;
  wait_for_cpu_baseline_margin_c?: number; // degrees Celsius tolerance (default 2.0)
}

// Parameter metadata for UI generation and validation
export interface SamplingParameterInfo {
  key: keyof ModelConfig;    // Type-safe reference to ModelConfig field
  label: string;             // Human-readable name for UI
  description: string;       // Brief explanation for users
  min: number;              // Minimum valid value
  max: number;              // Maximum valid value
  step: number;             // Increment step for sliders
  defaultValue: number;     // Fallback value when undefined
  recommendedRanges: {      // Preset values for different use cases
    code: number;           // Conservative values for code generation
    creative: number;       // Higher randomness for creative writing
    factual: number;        // Low randomness for factual responses
  };
  tooltip: string;          // Detailed explanation with examples
}

export const SAMPLING_PARAMETERS: SamplingParameterInfo[] = [
  {
    key: 'temperature',
    label: 'Temperature',
    description: 'Controls randomness and creativity in responses',
    min: 0.0,
    max: 2.0,
    step: 0.1,
    defaultValue: 0.7,
    recommendedRanges: { code: 0.2, creative: 1.0, factual: 0.3 },
    tooltip: 'Lower values (0.1-0.3) produce more deterministic, factual responses. Higher values (0.8-1.5) increase creativity and randomness. Set to 0.0 for completely deterministic output.'
  },
  {
    key: 'top_k',
    label: 'Top-K',
    description: 'Limits sampling to top K most probable tokens',
    min: 0,
    max: 100,
    step: 1,
    defaultValue: 40,
    recommendedRanges: { code: 10, creative: 40, factual: 20 },
    tooltip: 'Restricts token selection to the K most likely options. Set to 0 to disable. Lower values (10-20) for focused output, higher values (40-80) for diversity.'
  },
  {
    key: 'top_p',
    label: 'Top-P (Nucleus)',
    description: 'Selects tokens within cumulative probability threshold',
    min: 0.0,
    max: 1.0,
    step: 0.05,
    defaultValue: 0.95,
    recommendedRanges: { code: 0.7, creative: 0.9, factual: 0.8 },
    tooltip: 'Dynamically adjusts vocabulary size based on probability distribution. 0.9 means consider tokens that make up 90% of probability mass. More adaptive than top-k.'
  },
  {
    key: 'min_p',
    label: 'Min-P',
    description: 'Minimum probability threshold relative to best token',
    min: 0.0,
    max: 0.5,
    step: 0.01,
    defaultValue: 0.05,
    recommendedRanges: { code: 0.1, creative: 0.05, factual: 0.1 },
    tooltip: 'Filters out tokens below this probability relative to the most likely token. 0.05 means tokens must be at least 5% as likely as the best option.'
  },
  {
    key: 'repeat_penalty',
    label: 'Repeat Penalty',
    description: 'Penalizes recently used tokens to reduce repetition',
    min: 1.0,
    max: 1.5,
    step: 0.01,
    defaultValue: 1.0,
    recommendedRanges: { code: 1.05, creative: 1.1, factual: 1.05 },
    tooltip: 'Values > 1.0 reduce probability of recently used tokens. 1.0 = disabled, 1.1 = moderate penalty, 1.3+ = strong penalty. Too high can hurt coherence.'
  },
  {
    key: 'repeat_last_n',
    label: 'Repeat Window',
    description: 'Number of recent tokens to consider for repetition penalty',
    min: 0,
    max: 512,
    step: 16,
    defaultValue: 64,
    recommendedRanges: { code: 128, creative: 64, factual: 64 },
    tooltip: 'How many recent tokens to check for repetition. Larger values (128-256) for code to avoid repeating variable names. Smaller values (32-64) for shorter contexts.'
  },
  {
    key: 'frequency_penalty',
    label: 'Frequency Penalty',
    description: 'Penalizes tokens based on how often they appear globally',
    min: 0.0,
    max: 2.0,
    step: 0.1,
    defaultValue: 0.0,
    recommendedRanges: { code: 0.0, creative: 0.1, factual: 0.0 },
    tooltip: 'Reduces probability of tokens proportional to their frequency in the entire context. Useful for reducing overused words. 0.0 = disabled, 0.5+ = noticeable effect.'
  },
  {
    key: 'presence_penalty',
    label: 'Presence Penalty',
    description: 'Penalizes any token that has appeared before',
    min: 0.0,
    max: 2.0,
    step: 0.1,
    defaultValue: 0.0,
    recommendedRanges: { code: 0.0, creative: 0.2, factual: 0.0 },
    tooltip: 'Applies same penalty to any repeated token regardless of frequency. Encourages new topics and vocabulary. 0.0 = disabled, 0.5+ = strong effect.'
  }
];

export interface ModelState {
  // Live chart refresh configuration (ms). 0 = render only after completion
  chart_refresh_ms: number,
  // Model configurations
  modelA: ModelConfig;
  modelB: ModelConfig;
  systemPrompt: string;
  appMode: 'chat' | 'analysis';
  
  // Global telemetry configuration
  telemetry_sampling_hz: number;  // Global telemetry sampling frequency in Hz
  run_without_telemetry: boolean; // When true, skip telemetry during inference

  // Model UI state
  modelAPathFocused: boolean;
  modelBPathFocused: boolean;

  // Token management state
  inputTokenCounts: { A?: number; B?: number };
  outputTokenCounts: { A?: number; B?: number };
  systemPromptTokenCount: number | null;

  // Actions
  setModelA: (config: ModelConfig) => void;
  setModelB: (config: ModelConfig) => void;
  setSystemPrompt: (prompt: string) => void;
  setAppMode: (mode: 'chat' | 'analysis') => void;
  setModelAPathFocused: (focused: boolean) => void;
  setModelBPathFocused: (focused: boolean) => void;
  setInputTokenCounts: (counts: { A?: number; B?: number }) => void;
  setOutputTokenCounts: (counts: { A?: number; B?: number }) => void;
  setSystemPromptTokenCount: (count: number | null) => void;
  setTelemetrySamplingHz: (hz: number) => void;
  setChartRefreshMs: (ms: number) => void;
  setRunWithoutTelemetry: (disable: boolean) => void;

  // Helper actions
  updateModelAConfig: (updates: Partial<ModelConfig>) => void;
  updateModelBConfig: (updates: Partial<ModelConfig>) => void;
  resetTokenCounts: () => void;
  updateInputTokenCount: (model: 'A' | 'B', count: number) => void;
  updateOutputTokenCount: (model: 'A' | 'B', count: number) => void;
  getAvailableTargets: () => ('A' | 'B' | 'Both')[];
  getFilenameFromPath: (path: string) => string;

  // New sync actions (Phase 5.1)
  syncModelBToA: () => void;
  syncModelAToB: () => void;

  // Preset configuration actions
  applyPresetToModel: (model: 'A' | 'B', preset: 'code' | 'creative' | 'factual') => void;
  resetModelSamplingToDefaults: (model: 'A' | 'B') => void;

  // Advanced configuration helpers
  validateModelConfig: (model: 'A' | 'B') => string[];
  getConfigurationSummary: (model: 'A' | 'B') => string;
  hasCustomSamplingConfig: (model: 'A' | 'B') => boolean;
}

export const useModelStore = create<ModelState>((set, get) => ({
  // Initial state
  modelA: {
    model_path: "",
    n_ctx: 4096,
  },
  modelB: {
    model_path: "",
    n_ctx: 4096,
  },
  systemPrompt: '',
  appMode: 'chat',
  telemetry_sampling_hz: 1.0,  // Default to 1Hz (1 sample per second)
  chart_refresh_ms: 2000,       // Default live chart refresh cadence 2s
  run_without_telemetry: false,
  modelAPathFocused: false,
  modelBPathFocused: false,
  inputTokenCounts: {},
  outputTokenCounts: {},
  systemPromptTokenCount: null,

  // Basic setters
  setModelA: (config) => set({ modelA: config }),
  setModelB: (config) => set({ modelB: config }),
  setSystemPrompt: (prompt) => set({ systemPrompt: prompt }),
  setAppMode: (mode) => set({ appMode: mode }),
  setModelAPathFocused: (focused) => set({ modelAPathFocused: focused }),
  setModelBPathFocused: (focused) => set({ modelBPathFocused: focused }),
  setInputTokenCounts: (counts) => set({ inputTokenCounts: counts }),
  setOutputTokenCounts: (counts) => set({ outputTokenCounts: counts }),
  setSystemPromptTokenCount: (count) => set({ systemPromptTokenCount: count }),
  setTelemetrySamplingHz: (hz) => set({ telemetry_sampling_hz: Math.max(0.1, Math.min(hz, 50.0)) }), // Clamp between 0.1-50 Hz
  setChartRefreshMs: (ms) => set({ chart_refresh_ms: Math.max(0, Math.min(ms, 3000)) }), // Clamp between 0-3000 ms (0 = on complete)
  setRunWithoutTelemetry: (disable) => set({ run_without_telemetry: !!disable }),

  // Helper actions
  updateModelAConfig: (updates) => {
    const { modelA } = get();
    set({ modelA: { ...modelA, ...updates } });
  },

  updateModelBConfig: (updates) => {
    const { modelB } = get();
    set({ modelB: { ...modelB, ...updates } });
  },

  resetTokenCounts: () => {
    set({ 
      inputTokenCounts: {},
      outputTokenCounts: {},
      systemPromptTokenCount: null
    });
  },

  updateInputTokenCount: (model, count) => {
    const { inputTokenCounts } = get();
    set({ 
      inputTokenCounts: {
        ...inputTokenCounts,
        [model]: count
      }
    });
  },

  updateOutputTokenCount: (model, count) => {
    const { outputTokenCounts } = get();
    set({ 
      outputTokenCounts: {
        ...outputTokenCounts,
        [model]: count
      }
    });
  },

  getAvailableTargets: () => {
    const { modelA, modelB } = get();
    const targets: ('A' | 'B' | 'Both')[] = [];
    
    if (modelA.model_path) targets.push('A');
    if (modelB.model_path) targets.push('B');
    if (modelA.model_path && modelB.model_path) targets.push('Both');
    
    return targets;
  },

  getFilenameFromPath: (path: string): string => {
    if (!path) return '';
    // Handle both forward slashes and backslashes
    const parts = path.split(/[\\\/]/);
    return parts[parts.length - 1] || path;
  },


  syncModelBToA: () => {
    const { modelB } = get();
    console.log('🔄 Syncing Model A to match Model B configuration (B → A)');
    set({ 
      modelA: { 
        ...modelB,
        model_path: get().modelA.model_path // Preserve Model A's path
      } 
    });
  },


  syncModelAToB: () => {
    const { modelA } = get();
    console.log('🔄 Syncing Model B to match Model A configuration (A → B)');
    set({ 
      modelB: { 
        ...modelA,
        model_path: get().modelB.model_path // Preserve Model B's path
      } 
    });
  },


  applyPresetToModel: (model, preset) => {
    const presetConfig = SAMPLING_PARAMETERS.reduce((config, param) => {
      (config as any)[param.key] = param.recommendedRanges[preset];
      return config;
    }, {} as Partial<ModelConfig>);

    console.log(`🎛️ Applying ${preset} preset to Model ${model}:`, presetConfig);

    if (model === 'A') {
      const { modelA } = get();
      set({ modelA: { ...modelA, ...presetConfig } });
    } else {
      const { modelB } = get();
      set({ modelB: { ...modelB, ...presetConfig } });
    }
  },


  resetModelSamplingToDefaults: (model) => {
    const defaultConfig = SAMPLING_PARAMETERS.reduce((config, param) => {
      (config as any)[param.key] = undefined;  // undefined = use system default
      return config;
    }, {} as Partial<ModelConfig>);

    console.log(`🔄 Resetting Model ${model} sampling parameters to defaults`);

    if (model === 'A') {
      const { modelA } = get();
      set({ modelA: { ...modelA, ...defaultConfig } });
    } else {
      const { modelB } = get();
      set({ modelB: { ...modelB, ...defaultConfig } });
    }
  },


  validateModelConfig: (model) => {
    const config = model === 'A' ? get().modelA : get().modelB;
    const warnings: string[] = [];

    // Basic model validation
    if (!config.model_path.trim()) {
      warnings.push('Model path is required');
    }

    // Sampling parameter validation (matches backend validation)
    if (config.temperature !== undefined) {
      if (config.temperature < 0) {
        warnings.push('Temperature cannot be negative');
      } else if (config.temperature > 2.0) {
        warnings.push('Temperature > 2.0 may produce incoherent output');
      }
    }

    if (config.top_p !== undefined && (config.top_p <= 0 || config.top_p > 1.0)) {
      warnings.push('Top-p must be between 0.0 and 1.0');
    }

    if (config.min_p !== undefined && (config.min_p < 0 || config.min_p > 1.0)) {
      warnings.push('Min-p must be between 0.0 and 1.0');
    }

    if (config.top_k !== undefined && config.top_k < 0) {
      warnings.push('Top-k cannot be negative');
    }

    if (config.repeat_penalty !== undefined && config.repeat_penalty < 1.0) {
      warnings.push('Repeat penalty < 1.0 will increase repetition');
    }

    // Cross-parameter validation
    if (config.top_p !== undefined && config.min_p !== undefined && config.min_p > config.top_p) {
      warnings.push('Min-p should typically be smaller than top-p');
    }

    return warnings;
  },


  getConfigurationSummary: (model) => {
    const config = model === 'A' ? get().modelA : get().modelB;
    const parts: string[] = [];

    // Sampling configuration summary
    if (config.temperature !== undefined) {
      const creativity = config.temperature < 0.3 ? 'low' :
                        config.temperature < 0.7 ? 'moderate' : 'high';
      parts.push(`${creativity} creativity (${config.temperature})`);
    }

    if (config.top_k !== undefined && config.top_k > 0) {
      parts.push(`top-${config.top_k} tokens`);
    }

    if (config.top_p !== undefined && config.top_p < 1.0) {
      parts.push(`${(config.top_p * 100).toFixed(0)}% nucleus`);
    }

    if (config.repeat_penalty !== undefined && config.repeat_penalty > 1.0) {
      const strength = config.repeat_penalty < 1.1 ? 'light' :
                      config.repeat_penalty < 1.2 ? 'moderate' : 'strong';
      parts.push(`${strength} repetition control`);
    }

    return parts.length > 0 ? parts.join(', ') : 'default configuration';
  },

 
  hasCustomSamplingConfig: (model) => {
    const config = model === 'A' ? get().modelA : get().modelB;

    return SAMPLING_PARAMETERS.some(param => {
      const value = config[param.key] as number | undefined;
      return value !== undefined && value !== param.defaultValue;
    });
  },
}));

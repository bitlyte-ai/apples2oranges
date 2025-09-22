import React from 'react';
import { open } from '@tauri-apps/plugin-dialog';
import { CustomDropdown } from '../ui/CustomDropdown';
import { CONTEXT_LENGTH_OPTIONS, getContextLengthOption } from '../../utils/contextLengthOptions';
import { type ModelConfig, SAMPLING_PARAMETERS } from '../../stores/modelStore';
import { SamplingParameterControl } from './SamplingParameterControl';


interface ModelConfigPanelProps {
  // ... existing props remain unchanged
  modelId: 'A' | 'B';
  modelConfig: ModelConfig;
  isPathFocused: boolean;
  isLoading: boolean;
  hasContextValidationWarning?: boolean;
  onModelChange: (config: ModelConfig) => void;
  onPathFocus: (focused: boolean) => void;
  getFilenameFromPath: (path: string) => string;
  className?: string;

  // New props for enhanced functionality
  onSyncFromOther?: () => void;        // Sync configuration from other model
  showSyncButton?: boolean;            // Whether to show sync button
  otherModelId?: 'A' | 'B';           // The other model's ID for labeling
}

/**
 * Enhanced ModelConfigPanel Component
 * 
 * Maintains all existing functionality while adding:
 * - Complete sampling parameter configuration
 * - Educational tooltips and presets for each parameter
 * - Sync functionality between models
 * - Collapsible sections for better organization
 * - Real-time validation and feedback
 * 
 * Integration strategy:
 * - Preserve existing model path and context configuration
 * - Add sampling parameters as new section
 * - Maintain consistent styling and behavior
 * - Ensure backward compatibility
 */
export const ModelConfigPanel: React.FC<ModelConfigPanelProps> = ({
  modelId,
  modelConfig,
  isPathFocused,
  isLoading,
  hasContextValidationWarning = false,
  onModelChange,
  onPathFocus,
  getFilenameFromPath,
  className = "",
  onSyncFromOther,
  showSyncButton = false,
  otherModelId
}) => {
  // State for collapsible sections
  const [samplingExpanded, setSamplingExpanded] = React.useState(false);

  // Existing handlers remain unchanged
  const handlePathChange = (path: string) => {
    onModelChange({ ...modelConfig, model_path: path });
  };

  const handleContextSizeSelect = (option: any) => {
    if (option?.data !== undefined) {
      onModelChange({ ...modelConfig, n_ctx: option.data });
    } else if (option === null) {
      onModelChange({ ...modelConfig, n_ctx: undefined });
    }
  };

  const handleCustomContextInput = (value: string) => {
    const numValue = parseInt(value, 10);
    if (!isNaN(numValue) && numValue > 0) {
      onModelChange({ ...modelConfig, n_ctx: numValue });
    } else if (value === '') {
      onModelChange({ ...modelConfig, n_ctx: undefined });
    }
  };

  // File picker for model path via Tauri (macOS Finder)
  const handleBrowseClick = async () => {
    try {
      const selected = await open({
        title: `Select model file for Model ${modelId}`,
        multiple: false,
        directory: false,
        filters: [
          { name: 'GGUF Models', extensions: ['gguf'] },
        ],
        defaultPath: modelConfig.model_path || undefined,
      });
      if (typeof selected === 'string') {
        handlePathChange(selected);
      }
    } catch (err) {
      console.error('File picker error:', err);
    }
  };

  // New handler for sampling parameter changes
  const handleSamplingParameterChange = (parameterKey: string, value: number | undefined) => {
    onModelChange({
      ...modelConfig,
      [parameterKey]: value
    });
  };

  // Helper to apply preset configuration to all sampling parameters
  const applyPresetConfiguration = (preset: 'code' | 'creative' | 'factual') => {
    const presetConfig = SAMPLING_PARAMETERS.reduce((config, param) => {
      (config as any)[param.key] = param.recommendedRanges[preset];
      return config;
    }, {} as Partial<ModelConfig>);

    onModelChange({
      ...modelConfig,
      ...presetConfig
    });
  };

  // Helper to reset all sampling parameters to defaults
  const resetSamplingToDefaults = () => {
    const defaultConfig = SAMPLING_PARAMETERS.reduce((config, param) => {
      (config as any)[param.key] = undefined;  // undefined = use default
      return config;
    }, {} as Partial<ModelConfig>);

    onModelChange({
      ...modelConfig,
      ...defaultConfig
    });
  };

  // Check if current config matches a specific preset
  const matchesPreset = (preset: 'code' | 'creative' | 'factual'): boolean => {
    return SAMPLING_PARAMETERS.every(param => {
      const currentValue = modelConfig[param.key] as number | undefined;
      const presetValue = param.recommendedRanges[preset];
      return currentValue === presetValue;
    });
  };

  // Get the currently active preset (if any)
  const getActivePreset = (): 'code' | 'creative' | 'factual' | null => {
    for (const preset of ['code', 'creative', 'factual'] as const) {
      if (matchesPreset(preset)) {
        return preset;
      }
    }
    return null;
  };

  // Check if config is custom (doesn't match any preset)
  const isCustomConfig = (): boolean => {
    return !getActivePreset() && SAMPLING_PARAMETERS.some(param => {
      const value = modelConfig[param.key] as number | undefined;
      return value !== undefined;
    });
  };

  return (
    <div className={`border rounded-lg p-4 space-y-4 ${className}`}>
      {/* Existing model header - enhanced with sync button */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <h4 className="font-medium text-gray-800">
            Model {modelId}
          </h4>
          {/* Model color indicator - only show when model path is configured */}
          {modelConfig.model_path && (
            <div className={`w-2 h-2 rounded-full ${
              modelId === 'A' ? 'bg-green-500' : 'bg-purple-500'
            }`}></div>
          )}
        </div>

        {/* Sync button if enabled - uses the OTHER model's theme color */}
        {showSyncButton && onSyncFromOther && otherModelId && (
          <button
            onClick={onSyncFromOther}
            disabled={isLoading}
            className={`px-3 py-2 text-sm text-white rounded-lg disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center gap-2 font-medium ${
              otherModelId === 'A' 
                ? 'bg-green-500 hover:bg-green-600'   // Model A's green theme
                : 'bg-purple-500 hover:bg-purple-600' // Model B's purple theme
            }`}
            title={`Sync configuration with Model ${otherModelId} (excluding model path)`}
          >
            <span>↻</span>
            <span>Sync with {otherModelId}</span>
          </button>
        )}
      </div>

      {/* Model path configuration with file picker */}
      <div>
        <label 
          className="block text-xs font-medium text-gray-600 mb-1"
          htmlFor={`model-${modelId.toLowerCase()}-path`}
        >
          Model Path
        </label>
        <div className="flex items-center gap-2">
          <input
            id={`model-${modelId.toLowerCase()}-path`}
            type="text"
            value={isPathFocused ? modelConfig.model_path : getFilenameFromPath(modelConfig.model_path)}
            onChange={(e) => handlePathChange(e.target.value)}
            onFocus={async () => {
              onPathFocus(true);
              if (!modelConfig.model_path) {
                await handleBrowseClick();
              }
            }}
            onBlur={() => onPathFocus(false)}
            onDoubleClick={handleBrowseClick}
            disabled={isLoading}
            className="flex-1 p-2 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-500 transition-colors"
            placeholder={`models/model-${modelId.toLowerCase()}.gguf`}
            title={modelConfig.model_path}
            aria-describedby={`model-${modelId.toLowerCase()}-path-help`}
          />
          <button
            type="button"
            onClick={handleBrowseClick}
            disabled={isLoading}
            className="inline-flex items-center justify-center w-7 h-7 rounded bg-gray-100 hover:bg-gray-200 text-gray-600 disabled:bg-gray-200 disabled:text-gray-400 border border-gray-200"
            title="Browse for model file"
            aria-label="Browse for model file"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
              <path d="M2 6a2 2 0 012-2h3l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
            </svg>
          </button>
        </div>
        <div 
          id={`model-${modelId.toLowerCase()}-path-help`}
          className="text-xs text-gray-500 mt-1"
        >
          {isPathFocused 
            ? "Full path to the model file (double-click or use Browse to pick)"
            : "Click to edit full path (double-click or use Browse to pick)"
          }
        </div>
      </div>

      {/* Existing context size configuration - unchanged */}
      <div>
        <CustomDropdown
          label="Context Size"
          placeholder="Select context length"
          options={CONTEXT_LENGTH_OPTIONS}
          selectedOption={getContextLengthOption(modelConfig.n_ctx)}
          onSelect={handleContextSizeSelect}
          disabled={isLoading}
          className=""
          allowCustomInput={true}
          customInputPlaceholder="e.g., 4096"
          customInputType="number"
          onCustomInput={handleCustomContextInput}
        />
        <div className="text-xs text-gray-500 mt-1">
          Context size determines maximum conversation length
        </div>
        {hasContextValidationWarning && (
          <div className="text-xs text-red-600 mt-1 font-medium">
            Context not set
          </div>
        )}
      </div>

      {/* NEW: Sampling Parameters Section */}
      <div className="border-t pt-4">
        {/* Header with collapsible toggle */}
        <div className="flex items-center justify-between mb-2">
          <button
            onClick={() => setSamplingExpanded(!samplingExpanded)}
            className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
          >
            <span className={`transform transition-transform ${samplingExpanded ? 'rotate-90' : ''}`}>
              ▶
            </span>
            <span>Sampling Parameters</span>
            {/* Show indicator if config is custom (doesn't match any preset) */}
            {isCustomConfig() && (
              <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full font-medium">
                Custom
              </span>
            )}
          </button>
        </div>

        {/* Preset and reset controls - separate row to prevent overflow */}
        <div className="flex flex-wrap items-center justify-end gap-1 sm:gap-2 mb-3">
          <div className="flex flex-wrap gap-1">
            {(['code', 'creative', 'factual'] as const).map((preset) => {
              const isActive = getActivePreset() === preset;
              return (
                <button
                  key={preset}
                  onClick={() => applyPresetConfiguration(preset)}
                  disabled={isLoading}
                  className={`px-2 py-1 text-xs rounded-lg disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium ${
                    isActive
                      ? 'bg-blue-500 text-white hover:bg-blue-600'
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                  }`}
                  title={`Apply ${preset} configuration to all sampling parameters`}
                >
                  {preset}
                </button>
              );
            })}
          </div>
          <button
            onClick={resetSamplingToDefaults}
            disabled={isLoading}
            className="px-2 py-1 text-xs text-blue-600 hover:text-blue-800 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
            title="Reset all sampling parameters to defaults"
          >
            reset all
          </button>
        </div>

        {/* Collapsible sampling parameters */}
        {samplingExpanded && (
          <div className="space-y-4">
            {SAMPLING_PARAMETERS.map((param) => (
              <SamplingParameterControl
                key={param.key}
                parameter={param}
                value={modelConfig[param.key] as number | undefined}
                onChange={(value) => handleSamplingParameterChange(param.key, value)}
                disabled={isLoading}
                showPresets={false}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ModelConfigPanel;
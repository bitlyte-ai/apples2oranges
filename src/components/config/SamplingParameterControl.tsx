import React from 'react';
import { InfoIcon } from '../ui/InfoIcon';
import { type SamplingParameterInfo } from '../../stores/modelStore';

interface SamplingParameterControlProps {
  parameter: SamplingParameterInfo;  // Configuration metadata
  value: number | undefined;         // Current value (undefined = use default)
  onChange: (value: number | undefined) => void;  // Value change handler
  disabled?: boolean;                // Loading/disabled state
  showPresets?: boolean;            // Show preset buttons
  className?: string;               // Additional CSS classes
}

/**
 * SamplingParameterControl Component
 * 
 * Provides a complete UI for configuring a single sampling parameter with:
 * - Slider for intuitive adjustment
 * - Number input for precise values
 * - Preset buttons for common use cases
 * - Educational tooltip with detailed explanations
 * - Real-time value display and validation
 * 
 * Design principles:
 * - Immediate feedback: Value updates in real-time
 * - Multiple input methods: Slider for exploration, input for precision
 * - Educational: Tooltips explain impact and provide examples
 * - Accessible: Proper labels, keyboard navigation, disabled states
 */
export const SamplingParameterControl: React.FC<SamplingParameterControlProps> = ({
  parameter,
  value,
  onChange,
  disabled = false,
  showPresets = true,
  className = ''
}) => {
  // Use current value or fall back to default for display
  const displayValue = value ?? parameter.defaultValue;

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseFloat(e.target.value);
    onChange(newValue);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;

    if (inputValue === '') {
      // Empty input means "use default"
      onChange(undefined);
      return;
    }

    const newValue = parseFloat(inputValue);

    // Validate range before applying
    if (!isNaN(newValue) && newValue >= parameter.min && newValue <= parameter.max) {
      onChange(newValue);
    }
    // If invalid, don't update (keep current value)
  };

  const applyPreset = (preset: 'code' | 'creative' | 'factual') => {
    const presetValue = parameter.recommendedRanges[preset];
    onChange(presetValue);
  };

  const resetToDefault = () => {
    onChange(undefined);  // undefined triggers default value usage
  };

  // Format display value based on parameter precision
  const formatValue = (val: number): string => {
    if (parameter.step < 1) {
      return val.toFixed(2);  // Decimal parameters show 2 places
    } else {
      return val.toFixed(0);  // Integer parameters show no decimals
    }
  };

  // Determine if current value differs from default
  const isCustomValue = value !== undefined && value !== parameter.defaultValue;

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Header row with label, info icon, and current value */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <label className="text-sm font-medium text-gray-700">
            {parameter.label}
          </label>
          <InfoIcon
            title={parameter.description}
            description={parameter.tooltip}
            position="top"
          />
        </div>

        {/* Current value display with default indicator */}
        <div className="flex items-center space-x-2">
          <span className={`text-xs ${isCustomValue ? 'text-gray-700 font-medium' : 'text-gray-500'}`}>
            {formatValue(displayValue)}
          </span>
          {!isCustomValue && (
            <span className="text-xs text-gray-400">(default)</span>
          )}
        </div>
      </div>

      {/* Slider and number input row */}
      <div className="flex items-center space-x-3">
        {/* Range slider for intuitive adjustment */}
        <input
          type="range"
          min={parameter.min}
          max={parameter.max}
          step={parameter.step}
          value={displayValue}
          onChange={handleSliderChange}
          disabled={disabled}
          className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label={`${parameter.label} slider`}
        />

        {/* Number input for precise values */}
        <input
          type="number"
          min={parameter.min}
          max={parameter.max}
          step={parameter.step}
          value={value ?? ''}  // Show empty when using default
          onChange={handleInputChange}
          disabled={disabled}
          placeholder={parameter.defaultValue.toString()}
          className="w-20 px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-50 disabled:cursor-not-allowed"
          aria-label={`${parameter.label} precise input`}
        />
      </div>

      {/* Preset buttons and reset functionality */}
      {showPresets && (
        <div className="flex items-center justify-between">
          {/* Preset buttons for common configurations */}
          <div className="flex space-x-1">
            {(['code', 'creative', 'factual'] as const).map((preset) => (
              <button
                key={preset}
                onClick={() => applyPreset(preset)}
                disabled={disabled}
                className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 rounded border disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                title={`Set to ${formatValue(parameter.recommendedRanges[preset])} (optimized for ${preset})`}
              >
                {preset}
              </button>
            ))}
          </div>

          {/* Reset to default button (only show if value is customized) */}
          {isCustomValue && (
            <button
              onClick={resetToDefault}
              disabled={disabled}
              className="px-2 py-1 text-xs text-blue-600 hover:text-blue-800 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Reset to default value"
            >
              reset
            </button>
          )}
        </div>
      )}

      {/* Range indicator for context */}
      <div className="flex justify-between text-xs text-gray-400">
        <span>{formatValue(parameter.min)}</span>
        <span className="text-gray-500">Range</span>
        <span>{formatValue(parameter.max)}</span>
      </div>
    </div>
  );
};
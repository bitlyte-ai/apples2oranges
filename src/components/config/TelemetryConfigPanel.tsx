import React, { useEffect, useState } from 'react';
import { CustomDropdown } from '../ui/CustomDropdown';
import { SmartTooltip } from '../ui/SmartTooltip';


const SAMPLING_FREQUENCY_OPTIONS = [
  { id: 'freq-0.5', label: '0.5 Hz (2s)', data: 0.5 },
  { id: 'freq-1.0', label: '1.0 Hz (1s) - Default', data: 1.0 },
  { id: 'freq-2.0', label: '2.0 Hz (500ms)', data: 2.0 },
  { id: 'freq-5.0', label: '5.0 Hz (200ms)', data: 5.0 },
  { id: 'freq-10.0', label: '10.0 Hz (100ms)', data: 10.0 },
  { id: 'custom', label: 'Custom...', data: null, isCustomInput: true },
];

const getSamplingFrequencyOption = (frequency?: number) => {
  if (frequency === undefined) return null;
  
  const predefinedOption = SAMPLING_FREQUENCY_OPTIONS.find(option => 
    option.data !== null && Math.abs(option.data - frequency) < 0.01
  );
  
  if (predefinedOption) {
    return predefinedOption;
  }
  
  // Create a custom option for non-standard values
  return {
    id: `freq-custom-${frequency}`,
    label: `${frequency} Hz (${Math.round(1000/frequency)}ms)`,
    data: frequency,
    isCustomInput: false
  };
};

interface TelemetryConfigPanelProps {
  chartRefreshMs: number;
  onChartRefreshMsChange: (ms: number) => void;
  telemetrySamplingHz: number;
  onTelemetrySamplingHzChange: (hz: number) => void;
  isLoading?: boolean;
  className?: string;
  // New: allow running inference without telemetry
  runWithoutTelemetry: boolean;
  onRunWithoutTelemetryChange: (checked: boolean) => void;
  // Option: automatically wait for CPU to cool back to baseline between model A and B
  waitForCpuBaselineBetweenModels: boolean;
  onWaitForCpuBaselineBetweenModelsChange: (checked: boolean) => void;
  // Tolerance config (°C)
  cpuBaselineToleranceC: number;
  onCpuBaselineToleranceCChange: (value: number) => void;
}

/**
 * TelemetryConfigPanel Component
 * 
 * Unified telemetry configuration panel with:
 * - Global telemetry sampling frequency configuration
 * - Dropdown with common presets (0.5-10 Hz)
 * - Custom input capability for any frequency (0.1-50 Hz)
 * - Real-time feedback showing both Hz and interval
 * - Proper validation and user guidance
 */
export const TelemetryConfigPanel: React.FC<TelemetryConfigPanelProps> = ({
  telemetrySamplingHz,
  onTelemetrySamplingHzChange,
  isLoading = false,
  className = "",
  runWithoutTelemetry,
  onRunWithoutTelemetryChange,
  chartRefreshMs,
  onChartRefreshMsChange,
  waitForCpuBaselineBetweenModels,
  onWaitForCpuBaselineBetweenModelsChange,
  cpuBaselineToleranceC,
  onCpuBaselineToleranceCChange,
}) => {
  const [collapsed, setCollapsed] = useState<boolean>(true);
  const [toleranceRaw, setToleranceRaw] = useState<string>(
    Number.isFinite(cpuBaselineToleranceC) ? String(cpuBaselineToleranceC) : ''
  );
  const [toleranceError, setToleranceError] = useState<string>('');

  // Keep local input in sync when external value changes
  useEffect(() => {
    if (Number.isFinite(cpuBaselineToleranceC)) {
      setToleranceRaw(String(cpuBaselineToleranceC));
    }
  }, [cpuBaselineToleranceC]);
  const handleSamplingFrequencySelect = (option: any) => {
    if (option?.data !== undefined) {
      onTelemetrySamplingHzChange(option.data);
    }
  };

  const handleCustomSamplingFrequencyInput = (value: string) => {
    const numValue = parseFloat(value);
    if (!isNaN(numValue) && numValue >= 0.1 && numValue <= 50.0) {
      onTelemetrySamplingHzChange(numValue);
    } else if (value === '') {
      onTelemetrySamplingHzChange(1.0); // Reset to default
    }
  };

  return (
    <div className={`border rounded-lg p-4 space-y-3 ${className}`}>
      {/* Panel header with collapse toggle */}
      <div className="flex items-center justify-between mb-1">
        <h4 className="font-medium text-gray-800">Telemetry Configuration</h4>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="text-sm text-blue-600 hover:text-blue-700"
          aria-expanded={!collapsed}
        >
          {collapsed ? 'Show' : 'Hide'}
        </button>
      </div>

      {!collapsed && (
        <div className="space-y-3">
          {/* Telemetry sampling frequency configuration */}
          <div>
            <div className="flex items-center gap-2 mb-1">
              <label className="text-sm font-medium text-gray-800">Hardware Telemetry Sampling Frequency</label>
              <SmartTooltip
                title="Telemetry sampling"
                description={`How often hardware data is polled (CPU power, temps, etc.). Lower=less load, less detail. Higher=more detail, higher load.`}
                preferredPosition="top"
              >
                <svg className="w-4 h-4 text-gray-400 cursor-help" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                </svg>
              </SmartTooltip>
            </div>
            <CustomDropdown
          label=""
          placeholder="Select sampling rate"
          options={SAMPLING_FREQUENCY_OPTIONS}
          selectedOption={getSamplingFrequencyOption(telemetrySamplingHz)}
          onSelect={handleSamplingFrequencySelect}
          disabled={isLoading}
          className=""
          allowCustomInput={true}
          customInputPlaceholder="0.1-50 Hz (e.g., 2.5)"
          customInputType="number"
          onCustomInput={handleCustomSamplingFrequencyInput}
        />
          </div>

          {/* Chart refresh rate configuration */}
          <div>
            <div className="flex items-center gap-2 mb-1">
              <label className="text-sm font-medium text-gray-800">Chart Refresh Rate</label>
              <SmartTooltip
                title="Chart refresh"
                description={`How often charts re-render. Does not change telemetry collection. Lower=more visual updates (smoother), higher=less CPU usage.`}
                preferredPosition="top"
              >
                <svg className="w-4 h-4 text-gray-400 cursor-help" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                </svg>
              </SmartTooltip>
            </div>
            <CustomDropdown
              label=""
              placeholder="Select chart refresh"
              options={[
                { id: 'cr-100', label: '0.1 s', data: 100 },
                { id: 'cr-200', label: '0.2 s', data: 200 },
                { id: 'cr-500', label: '0.5 s', data: 500 },
                { id: 'cr-1000', label: '1.0 s', data: 1000 },
                { id: 'cr-2000', label: '2.0 s', data: 2000 },
                { id: 'cr-3000', label: '3.0 s', data: 3000 },
                { id: 'cr-complete', label: 'After completion', data: 0 },
              ]}
              selectedOption={(function() {
                const map = new Map<number, any>([
                  [100,{ id:'cr-100', label:'0.1 s', data:100 }],
                  [200,{ id:'cr-200', label:'0.2 s', data:200 }],
                  [500,{ id:'cr-500', label:'0.5 s', data:500 }],
                  [1000,{ id:'cr-1000', label:'1.0 s', data:1000 }],
                  [2000,{ id:'cr-2000', label:'2.0 s', data:2000 }],
                  [3000,{ id:'cr-3000', label:'3.0 s', data:3000 }],
                  [0,{ id:'cr-complete', label:'After completion', data:0 }],
                ]);
                return map.get(chartRefreshMs) || null;
              })()}
              onSelect={(opt: any) => {
                if (opt && typeof opt.data === 'number') {
                  onChartRefreshMsChange(opt.data);
                }
              }}
              disabled={isLoading}
            />
          </div>

      {/* Run without telemetry option */}
      <div className="pt-2">
        <div className={`flex items-start gap-2 ${isLoading ? 'opacity-50' : ''}`}>
          <input
            id="run-without-telemetry"
            type="checkbox"
            className="mt-0.5 rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
            checked={runWithoutTelemetry}
            onChange={(e) => onRunWithoutTelemetryChange(e.target.checked)}
            disabled={isLoading}
          />
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <label htmlFor="run-without-telemetry" className="text-sm font-medium text-gray-800">Run without telemetry</label>
              <SmartTooltip
                title="Disable telemetry during inference"
                description={`When enabled, hardware telemetry collection and emission are disabled during inference. Useful for minimal overhead. Charts will not receive live telemetry for this run.`}
                preferredPosition="top"
              >
                <svg className="w-4 h-4 text-gray-400 cursor-help" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                </svg>
              </SmartTooltip>
            </div>
          </div>
        </div>
      </div>

      {/* Cooldown between models option */}
      <div className="pt-2">
        <div className={`flex items-start gap-2 ${isLoading ? 'opacity-50' : ''}`}>
          <input
            id="cooldown-enabled"
            type="checkbox"
            className="mt-0.5 rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
            checked={waitForCpuBaselineBetweenModels}
            onChange={(e) => onWaitForCpuBaselineBetweenModelsChange(e.target.checked)}
            disabled={isLoading}
          />
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <label htmlFor="cooldown-enabled" className="text-sm font-medium text-gray-800">Automatically wait for CPU baseline temp</label>
              <SmartTooltip
                title="CPU Cooldown Between Models"
                description={`When enabled, after Model A completes, the app will wait until the CPU cools back to within +2°C of the baseline measured just before Model A starts, using the max CPU sensor temperature. This helps ensure fairer comparisons for Model B. If temperatures don't fall promptly, you can cancel the run.`}
                preferredPosition="top"
              >
                <svg className="w-4 h-4 text-gray-400 cursor-help" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                </svg>
              </SmartTooltip>
            </div>

            {/* Tolerance input */}
            {waitForCpuBaselineBetweenModels && (
              <div className="mt-2">
                <div className="flex items-center gap-2">
                  <label className="text-xs text-gray-600">Tolerance (°C):</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    placeholder="e.g., 2 or -1"
                    value={toleranceRaw}
                    onChange={(e) => {
                      const raw = e.target.value;
                      setToleranceRaw(raw);
                      const trimmed = raw.trim();
                      if (trimmed === '') {
                        setToleranceError('Tolerance is required.');
                        return;
                      }
                      // Do not immediately error on an intermediate '-' or '+'; wait for a number
                      const v = parseFloat(trimmed);
                      if (!isNaN(v)) {
                        setToleranceError('');
                        onCpuBaselineToleranceCChange(v);
                      }
                    }}
                    disabled={isLoading}
                    className={`w-28 px-2 py-1 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${toleranceError ? 'border-red-300' : ''}`}
                  />
                  <SmartTooltip
                    title="Tolerance relative to baseline"
                    description={`Sets how far from the baseline max CPU temperature we will allow before starting Model B.

Positive values (e.g., +2.0°C): start when CPU cools to within that margin above baseline.
Negative values (e.g., -1.0°C): require CPU to cool below the baseline by that amount before starting (may add wait time but yields stricter fairness).`}
                    preferredPosition="top"
                  >
                    <svg className="w-4 h-4 text-gray-400 cursor-help" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                    </svg>
                  </SmartTooltip>
                </div>
                {toleranceError && (
                  <div className="mt-1 text-xs text-red-600">{toleranceError}</div>
                )}
              </div>
            )}
            </div>
          </div>
        </div>
        </div>
      )}
    </div>
  );
};

export default TelemetryConfigPanel;
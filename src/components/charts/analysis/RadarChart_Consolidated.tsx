import React, { useState, useMemo } from 'react';
import type { TelemetrySession, TelemetryDataPoint } from '../../../types/telemetry';
import type { TelemetryVariable } from '../../../types/charts';
import { BasePlotly } from './base/BasePlotly';
import { createPolarLayout } from './base/PlotlyConfig';
import { MULTI_SESSION_COLORS } from './base/PlotlyThemes';
import { MultiVariableSelector, ChartConfigPanel } from './VariableSelector';
import { 
  getValidDataPoints, 
  getVariableConfig,
  normalizeData 
} from './utils';

interface RadarChartProps {
  sessionData: TelemetrySession | null;
  comparisonData?: TelemetrySession | null;
  height?: number;
}

export const RadarChart: React.FC<RadarChartProps> = ({
  sessionData,
  comparisonData = null,
  height = 600,
}) => {
  const [selectedVariables, setSelectedVariables] = useState<TelemetryVariable[]>([
    'cpu_power', 'gpu_power', 'cpu_temp_avg', 'tps', 'cpu_overall_utilization'
  ]);
  const [configCollapsed, setConfigCollapsed] = useState(false);
  const [aggregationMethod, setAggregationMethod] = useState<'average' | 'median' | 'max'>('average');

  // Helper function to aggregate data points
  const aggregateData = (values: number[], method: 'average' | 'median' | 'max'): number => {
    if (values.length === 0) return 0;
    
    switch (method) {
      case 'average':
        return values.reduce((sum, val) => sum + val, 0) / values.length;
      case 'median':
        const sorted = [...values].sort((a, b) => a - b);
        const mid = Math.floor(sorted.length / 2);
        return sorted.length % 2 === 0
          ? (sorted[mid - 1] + sorted[mid]) / 2
          : sorted[mid];
      case 'max':
        return Math.max(...values);
      default:
        return values.reduce((sum, val) => sum + val, 0) / values.length;
    }
  };

  // Prepare radar chart data
  const plotData = useMemo(() => {
    if (!sessionData || selectedVariables.length < 3) {
      return [];
    }

    const traces: any[] = [];

    const hexToRgba = (hex: string, alpha: number) => {
      const sanitized = hex.replace('#', '');
      const bigint = parseInt(sanitized, 16);
      const r = (bigint >> 16) & 255;
      const g = (bigint >> 8) & 255;
      const b = bigint & 255;
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    };

    const addTracesForSession = (s: TelemetrySession, sessionIndex: number) => {
      const presentModels = Array.from(new Set(
        s.data.map(d => d.model).filter((m): m is 'A' | 'B' => m === 'A' || m === 'B')
      ));

      const labelForModel = (m: 'A' | 'B') => {
        const raw = m === 'A' ? s.model_info?.model_a : s.model_info?.model_b;
        const short = raw ? raw.split('/').pop() : undefined;
        return short || `Model ${m}`;
      };

      const buildAggregatedTrace = (dataArr: TelemetryDataPoint[], nameLabel: string, colorIndex: number) => {
        const validData = getValidDataPoints(dataArr, selectedVariables);
        if (validData.indices.length === 0) return;

        const aggregatedValues: number[] = [];
        const labels: string[] = [];

        selectedVariables.forEach(variable => {
          const config = getVariableConfig(variable);
          const values = validData.values[variable].filter(v => v !== null && !isNaN(v));
          if (values.length > 0) {
            const aggregated = aggregateData(values, aggregationMethod);
            aggregatedValues.push(aggregated);
            labels.push(config?.label || variable);
          }
        });

        if (aggregatedValues.length < 3) return;

        const normalizedValues = normalizeData(aggregatedValues);
        const base = MULTI_SESSION_COLORS[colorIndex % MULTI_SESSION_COLORS.length];

        traces.push({
          type: 'scatterpolar',
          r: [...normalizedValues, normalizedValues[0]],
          theta: [...labels, labels[0]],
          fill: 'toself',
          name: nameLabel,
          line: { color: base },
          fillcolor: hexToRgba(base, 0.2),
          hovertemplate: '<b>%{theta}</b><br>' +
                         'Normalized Value: %{r:.2f}<br>' +
                         `<extra>${nameLabel}</extra>`,
        });
      };

      if (presentModels.length === 0) {
        buildAggregatedTrace(s.data, s.name, sessionIndex * 2);
      } else {
        presentModels.forEach((m, localIdx) => {
          const filtered = s.data.filter(d => d.model === m);
          const label = `${s.name} — ${labelForModel(m)}`;
          buildAggregatedTrace(filtered, label, sessionIndex * 2 + localIdx);
        });
      }
    };

    addTracesForSession(sessionData, 0);
    if (comparisonData) addTracesForSession(comparisonData, 1);

    return traces;
  }, [sessionData, comparisonData, selectedVariables, aggregationMethod]);

  // Custom layout for polar chart
  const customLayout = useMemo(() => 
    createPolarLayout(`Radar Chart Analysis (${aggregationMethod})`)
  , [aggregationMethod]);


  return (
    <div className="w-full space-y-4">
      <ChartConfigPanel
        title="Radar Chart Configuration"
        isCollapsed={configCollapsed}
        onToggleCollapse={() => setConfigCollapsed(!configCollapsed)}
      >
        <div className="space-y-4">
          <MultiVariableSelector
            selectedVariables={selectedVariables}
            onVariablesChange={setSelectedVariables}
            label="Select Variables for Radar Chart"
            minSelections={3}
            maxSelections={8}
            disabled={!sessionData}
          />
          
          <div className="flex flex-col space-y-2">
            <label className="text-sm font-medium text-gray-700">Aggregation Method</label>
            <select
              value={aggregationMethod}
              onChange={(e) => setAggregationMethod(e.target.value as 'average' | 'median' | 'max')}
              disabled={!sessionData}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
            >
              <option value="average">Average</option>
              <option value="median">Median</option>
              <option value="max">Maximum</option>
            </select>
          </div>

          {selectedVariables.length < 3 && (
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-yellow-800">
                    Minimum Variables Required
                  </h3>
                  <div className="mt-2 text-sm text-yellow-700">
                    <p>Select at least 3 variables to generate the radar chart. Currently selected: {selectedVariables.length}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </ChartConfigPanel>

      <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
        <div className="p-4">
          {!sessionData ? (
            <div className="flex items-center justify-center h-64 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
              <div className="text-center">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 48 48">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M7 21l3-3 9 9 6-6 3 3" />
                </svg>
                <h3 className="mt-2 text-lg font-medium text-gray-900">Select a Session</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Choose a telemetry session to visualize performance patterns in radar view.
                </p>
              </div>
            </div>
          ) : (
            <BasePlotly
              data={plotData}
              title={`Radar Chart Analysis (${aggregationMethod})`}
              chartType="polar"
              layoutVariant="standard"
              customLayout={customLayout}
              height={height}
              emptyMessage="Not enough data points or variables selected. Select at least 3 variables with valid data."
              filename={`radar_chart_${aggregationMethod.toLowerCase()}`}
            />
          )}
        </div>
      </div>
    </div>
  );
};
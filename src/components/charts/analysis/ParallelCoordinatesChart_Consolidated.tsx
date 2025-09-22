import React, { useState, useMemo } from 'react';
import type { TelemetrySession, TelemetryDataPoint } from '../../../types/telemetry';
import type { TelemetryVariable } from '../../../types/charts';
import { BasePlotly } from './base/BasePlotly';
import { createParallelCoordsLayout } from './base/PlotlyConfig';
import { MultiVariableSelector, ChartConfigPanel } from './VariableSelector';
import { 
  getValidDataPoints, 
  getVariableConfig 
} from './utils';

interface ParallelCoordinatesChartProps {
  sessionData: TelemetrySession | null;
  comparisonData?: TelemetrySession | null;
  height?: number;
}

export const ParallelCoordinatesChart: React.FC<ParallelCoordinatesChartProps> = ({
  sessionData,
  comparisonData = null,
  height = 600,
}) => {
  const [selectedVariables, setSelectedVariables] = useState<TelemetryVariable[]>([
    'cpu_power', 'gpu_power', 'cpu_temp_avg', 'tps', 'cpu_overall_utilization', 'ram_usage'
  ]);
  const [configCollapsed, setConfigCollapsed] = useState(false);
  const [colorBy, setColorBy] = useState<TelemetryVariable | ''>('tps');
  const [maxDataPoints, setMaxDataPoints] = useState<number>(200);

  // Prepare parallel coordinates data
  const plotData = useMemo(() => {
    if (!sessionData || selectedVariables.length < 2) {
      return [];
    }

    const traces: any[] = [];
    const colorScales = ['Viridis', 'Cividis', 'Plasma', 'Inferno', 'Magma', 'Turbo', 'Portland', 'Jet'];

    const addTracesForSession = (s: TelemetrySession, sessionIndex: number) => {
      const presentModels = Array.from(new Set(
        s.data.map(d => d.model).filter((m): m is 'A' | 'B' => m === 'A' || m === 'B')
      ));

      const labelForModel = (m: 'A' | 'B') => {
        const raw = m === 'A' ? s.model_info?.model_a : s.model_info?.model_b;
        const short = raw ? raw.split('/').pop() : undefined;
        return short || `Model ${m}`;
      };

      const buildTrace = (dataArr: TelemetryDataPoint[], modelLabel: string, localIdx: number) => {
        const validData = getValidDataPoints(dataArr, selectedVariables);
        if (validData.indices.length === 0) return;

        const indices = validData.indices.length > maxDataPoints
          ? validData.indices.filter((_, i) => i % Math.ceil(validData.indices.length / maxDataPoints) === 0)
          : validData.indices;

        const dimensions = selectedVariables.map(variable => {
          const config = getVariableConfig(variable);
          const values = indices.map(i => validData.values[variable][validData.indices.indexOf(i)]);
          return {
            label: config?.label || variable,
            values,
            range: [Math.min(...values), Math.max(...values)]
          };
        });

        let colorValues: number[] = [];
        let colorLabel = 'Data Point Index';
        if (colorBy && selectedVariables.includes(colorBy)) {
          colorValues = indices.map(i => validData.values[colorBy][validData.indices.indexOf(i)]);
          const colorConfig = getVariableConfig(colorBy);
          colorLabel = colorConfig?.label || colorBy;
        } else {
          colorValues = indices.map((_, i) => i);
          colorLabel = 'Data Point Index';
        }

        const scale = colorScales[(sessionIndex * 2 + localIdx) % colorScales.length];
        const showColorbar = localIdx === 0; // one per session

        traces.push({
          type: 'parcoords',
          line: {
            color: colorValues,
            colorscale: scale,
            // Some plotly versions support showscale/colorbar on parcoords; keep consistent with existing code
            showscale: true,
            colorbar: showColorbar ? {
              title: { text: colorLabel, side: 'right' },
              thickness: 20,
              len: 0.7,
            } : undefined,
          },
          dimensions: dimensions.map(dim => ({
            label: dim.label,
            values: dim.values,
            range: dim.range
          })),
          labelfont: { size: 12 },
          tickfont: { size: 10 },
          name: `${s.name} — ${modelLabel}`,
          hoverlabel: { align: 'left' }
        });
      };

      if (presentModels.length === 0) {
        buildTrace(s.data, s.name, 0);
      } else {
        presentModels.forEach((m, localIdx) => {
          const filtered = s.data.filter(d => d.model === m);
          buildTrace(filtered, labelForModel(m), localIdx);
        });
      }
    };

    addTracesForSession(sessionData, 0);
    if (comparisonData) addTracesForSession(comparisonData, 1);

    return traces;
  }, [sessionData, comparisonData, selectedVariables, colorBy, maxDataPoints]);

  // Custom layout for parallel coordinates
  const customLayout = useMemo(() => 
    createParallelCoordsLayout('Parallel Coordinates Analysis')
  , []);

  const hasValidData = plotData.length > 0 && plotData.some(trace => trace.dimensions && trace.dimensions.length >= 2);

  return (
    <div className="w-full space-y-4">
      <ChartConfigPanel
        title="Parallel Coordinates Configuration"
        isCollapsed={configCollapsed}
        onToggleCollapse={() => setConfigCollapsed(!configCollapsed)}
      >
        <div className="space-y-4">
          <MultiVariableSelector
            selectedVariables={selectedVariables}
            onVariablesChange={setSelectedVariables}
            label="Select Variables for Parallel Coordinates"
            minSelections={2}
            maxSelections={10}
            disabled={!sessionData}
          />
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col space-y-2">
              <label className="text-sm font-medium text-gray-700">Color By Variable</label>
              <select
                value={colorBy}
                onChange={(e) => setColorBy(e.target.value as TelemetryVariable | '')}
                disabled={!sessionData}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:text-gray-500"
              >
                <option value="">Data Point Index</option>
                {selectedVariables.map((variable) => {
                  const config = getVariableConfig(variable);
                  return (
                    <option key={variable} value={variable}>
                      {config?.label} ({config?.unit})
                    </option>
                  );
                })}
              </select>
              <p className="text-xs text-gray-500">
                Variable to use for coloring the parallel coordinate lines.
              </p>
            </div>

            <div className="flex flex-col space-y-2">
              <label className="text-sm font-medium text-gray-700">Max Data Points</label>
              <select
                value={maxDataPoints}
                onChange={(e) => setMaxDataPoints(Number(e.target.value))}
                disabled={!sessionData}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:text-gray-500"
              >
                <option value={100}>100</option>
                <option value={200}>200</option>
                <option value={500}>500</option>
                <option value={1000}>1000</option>
              </select>
              <p className="text-xs text-gray-500">
                Limit data points for better performance. Large datasets will be subsampled.
              </p>
            </div>
          </div>

          {selectedVariables.length < 2 && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-blue-800">
                    Minimum Variables Required
                  </h3>
                  <div className="mt-2 text-sm text-blue-700">
                    <p>Select at least 2 variables to generate a parallel coordinates plot. Currently {selectedVariables.length} variable{selectedVariables.length !== 1 ? 's' : ''} selected.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {!hasValidData && sessionData && selectedVariables.length >= 2 && (
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-yellow-800">
                    Insufficient Data
                  </h3>
                  <div className="mt-2 text-sm text-yellow-700">
                    <p>No valid data points found for the selected variables. Try selecting different variables or check if your session contains the required telemetry data.</p>
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
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M13 10V3L4 14l9 11v-7h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2v-9a2 2 0 012-2h8z" />
                </svg>
                <h3 className="mt-2 text-lg font-medium text-gray-900">Select a Session</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Choose a telemetry session to visualize parallel coordinates.
                </p>
              </div>
            </div>
          ) : selectedVariables.length < 2 ? (
            <div className="flex items-center justify-center h-64 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
              <div className="text-center">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 48 48">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M13 10V3L4 14l9 11v-7h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2v-9a2 2 0 012-2h8z" />
                </svg>
                <h3 className="mt-2 text-lg font-medium text-gray-900">Select Variables</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Choose at least 2 telemetry variables to generate parallel coordinates.
                </p>
              </div>
            </div>
          ) : hasValidData ? (
            <div>
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-blue-800">
                      Interactive Features
                    </h3>
                    <div className="mt-2 text-sm text-blue-700">
                      <p>Click and drag on any axis to brush/filter data points. This will highlight patterns and correlations across dimensions.</p>
                    </div>
                  </div>
                </div>
              </div>
              
              <BasePlotly
                data={plotData}
                title="Parallel Coordinates Analysis"
                chartType="parcoords"
                layoutVariant="standard"
                customLayout={customLayout}
                height={height}
                emptyMessage="No valid data points found for the selected variables. Try selecting different variables or check if your session contains the required telemetry data."
                filename="parallel_coordinates_analysis"
              />
            </div>
          ) : (
            <div className="flex items-center justify-center h-64 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
              <div className="text-center">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 48 48">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v6a2 2 0 002 2h6a2 2 0 002-2v-7m0 0V9a2 2 0 00-2-2h-6a2 2 0 00-2 2v4z" />
                </svg>
                <h3 className="mt-2 text-lg font-medium text-gray-900">No Data Available</h3>
                <p className="mt-1 text-sm text-gray-500">
                  The selected session does not contain sufficient data for the chosen variables.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
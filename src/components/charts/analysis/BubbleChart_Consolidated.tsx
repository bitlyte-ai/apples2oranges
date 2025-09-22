import React, { useState, useMemo } from 'react';
import type { TelemetrySession, TelemetryDataPoint } from '../../../types/telemetry';
import type { TelemetryVariable } from '../../../types/charts';
import { BasePlotly } from './base/BasePlotly';
import { createBubbleChartLayout } from './base/PlotlyConfig';
import { VariableSelector, ChartConfigPanel } from './VariableSelector';
import { 
  getValidDataPoints, 
  getVariableConfig 
} from './utils';
import { MULTI_SESSION_COLORS } from './base/PlotlyThemes';

interface BubbleChartProps {
  sessionData: TelemetrySession | null;
  comparisonData?: TelemetrySession | null;
  height?: number;
}

export const BubbleChart: React.FC<BubbleChartProps> = ({
  sessionData,
  comparisonData = null,
  height = 600,
}) => {
  const [xVariable, setXVariable] = useState<TelemetryVariable | ''>('cpu_power');
  const [yVariable, setYVariable] = useState<TelemetryVariable | ''>('tps');
  const [sizeVariable, setSizeVariable] = useState<TelemetryVariable | ''>('gpu_power');
  const [colorVariable, setColorVariable] = useState<TelemetryVariable | ''>('cpu_temp_avg');
  const [configCollapsed, setConfigCollapsed] = useState(false);
  const [bubbleScale, setBubbleScale] = useState<number>(20);
  const [maxDataPoints, setMaxDataPoints] = useState<number>(500);

  // Prepare bubble chart data
  const plotData = useMemo(() => {
    if (!sessionData || !xVariable || !yVariable || !sizeVariable) {
      return [];
    }

    const traces: any[] = [];
    const variables = [xVariable, yVariable, sizeVariable];
    if (colorVariable && !variables.includes(colorVariable)) {
      variables.push(colorVariable);
    }

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

      const xConfig = getVariableConfig(xVariable);
      const yConfig = getVariableConfig(yVariable);
      const sizeConfig = getVariableConfig(sizeVariable);
      const colorVarLabel = colorVariable ? (getVariableConfig(colorVariable)?.label || colorVariable) : (sizeConfig?.label || sizeVariable);

      const buildTrace = (dataArr: TelemetryDataPoint[], modelLabel: string, localIdx: number) => {
        const valid = getValidDataPoints(dataArr, variables);
        if (valid.indices.length === 0) return;

        // Subsample for performance
        const indices = valid.indices.length > maxDataPoints
          ? valid.indices.filter((_, i) => i % Math.ceil(valid.indices.length / maxDataPoints) === 0)
          : valid.indices;

        const xValues = indices.map(i => valid.values[xVariable][valid.indices.indexOf(i)]);
        const yValues = indices.map(i => valid.values[yVariable][valid.indices.indexOf(i)]);
        const sizeValues = indices.map(i => valid.values[sizeVariable][valid.indices.indexOf(i)]);

        const minSize = Math.min(...sizeValues);
        const maxSize = Math.max(...sizeValues);
        const normalizedSizes = sizeValues.map(size => {
          if (maxSize === minSize) return bubbleScale;
          return ((size - minSize) / (maxSize - minSize)) * bubbleScale + 5;
        });

        let colorValues = sizeValues;
        if (colorVariable && variables.includes(colorVariable)) {
          colorValues = indices.map(i => valid.values[colorVariable][valid.indices.indexOf(i)]);
        }

        const colorIndex = (sessionIndex * 2 + localIdx) % MULTI_SESSION_COLORS.length;
        const outlineColor = MULTI_SESSION_COLORS[colorIndex];
        const scale = colorScales[(sessionIndex * 2 + localIdx) % colorScales.length];
        const showScale = localIdx === 0; // one colorbar per session

        traces.push({
          x: xValues,
          y: yValues,
          mode: 'markers',
          type: 'scatter',
          name: `${s.name} — ${modelLabel}`,
          marker: {
            size: normalizedSizes,
            color: colorValues,
            colorscale: scale,
            showscale: showScale,
            colorbar: showScale ? {
              title: { text: colorVarLabel, side: 'right' },
              thickness: 20,
              len: 0.7,
            } : undefined,
            line: {
              width: 1,
              color: outlineColor,
            },
            opacity: 0.7,
          },
          text: indices.map((originalIndex, i) => {
            const point = dataArr[originalIndex];
            const time = new Date(point.timestamp).toLocaleTimeString();
            const colorText = colorVariable && colorVariable !== sizeVariable ? `<br/>${colorVarLabel}: ${colorValues[i]}` : '';
            return `Time: ${time}<br/>` +
                   `${xConfig?.label}: ${xValues[i]} ${xConfig?.unit}<br/>` +
                   `${yConfig?.label}: ${yValues[i]} ${yConfig?.unit}<br/>` +
                   `${sizeConfig?.label}: ${sizeValues[i]} ${sizeConfig?.unit}` + colorText;
          }),
          hovertemplate: '%{text}<extra></extra>',
        });
      };

      if (presentModels.length === 0) {
        // Fallback to single combined trace
        buildTrace(s.data, s.name, 0);
      } else {
        presentModels.forEach((m, localIdx) => {
          const filtered = s.data.filter(d => d.model === m);
          buildTrace(filtered, labelForModel(m), localIdx);
        });
      }
    };

    // Primary and optional comparison
    addTracesForSession(sessionData, 0);
    if (comparisonData) addTracesForSession(comparisonData, 1);

    return traces;
  }, [sessionData, comparisonData, xVariable, yVariable, sizeVariable, colorVariable, bubbleScale, maxDataPoints]);

  // Custom layout for bubble chart
  const customLayout = useMemo(() =>
    createBubbleChartLayout('Bubble Chart Analysis', xVariable, yVariable)
  , [xVariable, yVariable]);

  const hasValidData = plotData.length > 0 && plotData.some(trace => trace.x && trace.x.length > 0);

  return (
    <div className="w-full space-y-4">
      <ChartConfigPanel
        title="Bubble Chart Configuration"
        isCollapsed={configCollapsed}
        onToggleCollapse={() => setConfigCollapsed(!configCollapsed)}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <VariableSelector
              selectedVariable={xVariable}
              onVariableChange={setXVariable}
              label="X-Axis Variable"
              placeholder="Select X variable..."
              disabled={!sessionData}
            />
            
            <VariableSelector
              selectedVariable={yVariable}
              onVariableChange={setYVariable}
              label="Y-Axis Variable"
              placeholder="Select Y variable..."
              disabled={!sessionData}
            />
            
            <VariableSelector
              selectedVariable={sizeVariable}
              onVariableChange={setSizeVariable}
              label="Bubble Size Variable"
              placeholder="Select size variable..."
              disabled={!sessionData}
            />
            
            <VariableSelector
              selectedVariable={colorVariable}
              onVariableChange={setColorVariable}
              label="Bubble Color Variable (Optional)"
              placeholder="Select color variable..."
              disabled={!sessionData}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col space-y-2">
              <label className="text-sm font-medium text-gray-700">Bubble Scale</label>
              <input
                type="range"
                min="10"
                max="50"
                value={bubbleScale}
                onChange={(e) => setBubbleScale(Number(e.target.value))}
                disabled={!sessionData}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer disabled:opacity-50"
              />
              <div className="flex justify-between text-xs text-gray-500">
                <span>Small (10)</span>
                <span className="font-medium">{bubbleScale}</span>
                <span>Large (50)</span>
              </div>
              <p className="text-xs text-gray-500">
                Controls the maximum size of bubbles in the chart.
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
                <option value={200}>200</option>
                <option value={500}>500</option>
                <option value={1000}>1000</option>
                <option value={2000}>2000</option>
              </select>
              <p className="text-xs text-gray-500">
                Limit data points for better performance. Large datasets will be subsampled.
              </p>
            </div>
          </div>

          {(!xVariable || !yVariable || !sizeVariable) && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-blue-800">
                    Required Variables
                  </h3>
                  <div className="mt-2 text-sm text-blue-700">
                    <p>Select variables for X-axis, Y-axis, and bubble size to generate the bubble chart. Color variable is optional.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {!hasValidData && sessionData && xVariable && yVariable && sizeVariable && (
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
                    <p>No data points found with valid values for the selected variables. Try selecting different variables or check if your session contains the required telemetry data.</p>
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
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 12h.01M12 12h.01M16 12h.01M21 16c0 2.5-2 4.5-4.5 4.5S12 18.5 12 16s2-4.5 4.5-4.5S21 13.5 21 16zM8 21l1.5-1.5L12 22l3-3 4 4" />
                </svg>
                <h3 className="mt-2 text-lg font-medium text-gray-900">Select a Session</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Choose a telemetry session to visualize bubble chart.
                </p>
              </div>
            </div>
          ) : (!xVariable || !yVariable || !sizeVariable) ? (
            <div className="flex items-center justify-center h-64 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
              <div className="text-center">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 48 48">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 12h.01M12 12h.01M16 12h.01M21 16c0 2.5-2 4.5-4.5 4.5S12 18.5 12 16s2-4.5 4.5-4.5S21 13.5 21 16zM8 21l1.5-1.5L12 22l3-3 4 4" />
                </svg>
                <h3 className="mt-2 text-lg font-medium text-gray-900">Configure Variables</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Select variables for X-axis, Y-axis, and bubble size to generate the bubble chart.
                </p>
              </div>
            </div>
          ) : (
            <BasePlotly
              data={plotData}
              title="Bubble Chart Analysis"
              chartType="scatter"
              layoutVariant="standard"
              customLayout={customLayout}
              height={height}
              emptyMessage="No data points found with valid values for the selected variables. Try selecting different variables or check if your session contains the required telemetry data."
              filename="bubble_chart_analysis"
            />
          )}
        </div>
      </div>
    </div>
  );
};
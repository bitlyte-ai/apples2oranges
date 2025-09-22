import React, { useState, useMemo } from 'react';
import type { TelemetrySession } from '../../../types/telemetry';
import type { TelemetryVariable } from '../../../types/charts';
import { BasePlotly } from './base/BasePlotly';
import { create3DScene } from './base/PlotlyConfig';
import { MARKER_CONFIGS, MULTI_SESSION_COLORS } from './base/PlotlyThemes';
import { AxisConfig, ChartConfigPanel } from './VariableSelector';
import { getValidDataPoints, getVariableConfig } from './utils';

interface Scatter3DChartProps {
  sessionData: TelemetrySession | null;
  comparisonData?: TelemetrySession | null;
  height?: number;
}

export const Scatter3DChart: React.FC<Scatter3DChartProps> = ({
  sessionData,
  comparisonData = null,
  height = 600,
}) => {
  const [xVariable, setXVariable] = useState<TelemetryVariable | ''>('cpu_power');
  const [yVariable, setYVariable] = useState<TelemetryVariable | ''>('gpu_power');
  const [zVariable, setZVariable] = useState<TelemetryVariable | ''>('tps');
  const [configCollapsed, setConfigCollapsed] = useState(false);

  // Prepare plot data
  const plotData = useMemo(() => {
    if (!sessionData || !xVariable || !yVariable || !zVariable) {
      return [];
    }

    const traces: any[] = [];

    const addTracesForSession = (s: TelemetrySession, sessionIndex: number) => {
      // Identify present models (A/B) in this session
      const presentModels = Array.from(new Set(
        s.data.map(d => d.model).filter((m): m is 'A' | 'B' => m === 'A' || m === 'B')
      ));

      const buildLabelForModel = (m: 'A' | 'B') => {
        const raw = m === 'A' ? s.model_info?.model_a : s.model_info?.model_b;
        const short = raw ? raw.split('/').pop() : undefined;
        return short || `Model ${m}`;
      };

      const xConfig = getVariableConfig(xVariable);
      const yConfig = getVariableConfig(yVariable);
      const zConfig = getVariableConfig(zVariable);

      if (presentModels.length === 0) {
        // Fallback: single combined trace (no model attribution found)
        const valid = getValidDataPoints(s.data, [xVariable, yVariable, zVariable]);
        if (valid.indices.length > 0) {
          const color = MULTI_SESSION_COLORS[(sessionIndex * 2) % MULTI_SESSION_COLORS.length];
          traces.push({
            x: valid.values[xVariable],
            y: valid.values[yVariable],
            z: valid.values[zVariable],
            type: 'scatter3d',
            mode: 'markers',
            name: s.name,
            marker: {
              ...MARKER_CONFIGS.default,
              color,
              line: { ...MARKER_CONFIGS.default.line, color }
            },
            text: valid.indices.map((i, idx) => {
              const point = s.data[i];
              const time = new Date(point.timestamp).toLocaleTimeString();
              const xv = valid.values[xVariable][idx];
              const yv = valid.values[yVariable][idx];
              const zv = valid.values[zVariable][idx];
              return `Time: ${time}<br/>` +
                     `${xConfig?.label}: ${xv} ${xConfig?.unit}<br/>` +
                     `${yConfig?.label}: ${yv} ${yConfig?.unit}<br/>` +
                     `${zConfig?.label}: ${zv} ${zConfig?.unit}`;
            }),
            hovertemplate: '%{text}<extra></extra>',
          });
        }
        return;
      }

      presentModels.forEach((m, localIdx) => {
        const filtered = s.data.filter(d => d.model === m);
        const valid = getValidDataPoints(filtered, [xVariable, yVariable, zVariable]);
        if (valid.indices.length === 0) return;

        const xValues = valid.values[xVariable];
        const yValues = valid.values[yVariable];
        const zValues = valid.values[zVariable];

        const colorIndex = (sessionIndex * 2 + localIdx) % MULTI_SESSION_COLORS.length;
        const color = MULTI_SESSION_COLORS[colorIndex];
        const label = `${s.name} — ${buildLabelForModel(m)}`;

        traces.push({
          x: xValues,
          y: yValues,
          z: zValues,
          type: 'scatter3d',
          mode: 'markers',
          name: label,
          marker: {
            ...MARKER_CONFIGS.default,
            color,
            line: { ...MARKER_CONFIGS.default.line, color }
          },
          text: valid.indices.map((i, idx) => {
            const point = filtered[i];
            const time = new Date(point.timestamp).toLocaleTimeString();
            return `Time: ${time}<br/>` +
                   `${xConfig?.label}: ${xValues[idx]} ${xConfig?.unit}<br/>` +
                   `${yConfig?.label}: ${yValues[idx]} ${yConfig?.unit}<br/>` +
                   `${zConfig?.label}: ${zValues[idx]} ${zConfig?.unit}`;
          }),
          hovertemplate: '%{text}<extra></extra>',
        });
      });
    };

    // Add traces for primary and optional comparison sessions
    addTracesForSession(sessionData, 0);
    if (comparisonData) addTracesForSession(comparisonData, 1);

    return traces;
  }, [sessionData, comparisonData, xVariable, yVariable, zVariable]);

  // Custom layout for 3D scene
  const customLayout = useMemo(() => ({
    scene: create3DScene(xVariable, yVariable, zVariable)
  }), [xVariable, yVariable, zVariable]);

  const hasValidData = plotData.length > 0 && plotData.some(trace => trace.x.length > 0);

  return (
    <div className="w-full space-y-4">
      <ChartConfigPanel
        title="3D Scatter Plot Configuration"
        isCollapsed={configCollapsed}
        onToggleCollapse={() => setConfigCollapsed(!configCollapsed)}
      >
        <AxisConfig
          xVariable={xVariable}
          yVariable={yVariable}
          zVariable={zVariable}
          onXChange={setXVariable}
          onYChange={setYVariable}
          onZChange={setZVariable}
          disabled={!sessionData}
        />
        
        {!hasValidData && sessionData && xVariable && yVariable && zVariable && (
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
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
                  <p>No data points found with valid values for all three selected variables. Try selecting different variables or check if your session contains the required telemetry data.</p>
                </div>
              </div>
            </div>
          </div>
        )}
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
                  Choose a telemetry session to visualize data relationships in 3D space.
                </p>
              </div>
            </div>
          ) : (
            <BasePlotly
              data={plotData}
              title="3D Scatter Plot Analysis"
              chartType="scatter3d"
              layoutVariant="fullscreen"
              customLayout={customLayout}
              height={height}
              emptyMessage="No data points found with valid values for all three selected variables. Try selecting different variables or check if your session contains the required telemetry data."
              filename="3d_scatter_analysis"
            />
          )}
        </div>
      </div>
    </div>
  );
};
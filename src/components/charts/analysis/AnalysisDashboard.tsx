import React, { useState, useMemo } from 'react';
import type { TelemetrySession } from '../../../types/telemetry';
import { EnhancedSessionSelector } from './EnhancedSessionSelector';
import { Scatter3DChart } from './Scatter3DChart_Consolidated';
import { RadarChart } from './RadarChart_Consolidated';
import { ParallelCoordinatesChart } from './ParallelCoordinatesChart_Consolidated';
import { BubbleChart } from './BubbleChart_Consolidated';
import { MultiSessionTPSChart } from './MultiSessionTPSChart';

interface AnalysisDashboardProps {
  sessions: TelemetrySession[];
}

type ChartType = 'tps-comparison' | '3d-scatter' | 'radar' | 'parallel-coordinates' | 'bubble';

interface ChartConfig {
  id: ChartType;
  name: string;
  description: string;
  component: React.ComponentType<any>;
  icon: React.ReactNode;
}

const chartConfigs: ChartConfig[] = [
  {
    id: 'tps-comparison',
    name: 'TPS Comparison',
    description: 'Compare tokens per second performance across multiple sessions',
    component: MultiSessionTPSChart,
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-4 4" />
      </svg>
    ),
  },
  {
    id: '3d-scatter',
    name: '3D Scatter Plot',
    description: 'Visualize relationships between three telemetry variables in 3D space',
    component: Scatter3DChart,
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21l3-3 3 3 3-3 3 3M4 12h.01M8 12h.01M12 12h.01M16 12h.01M20 12h.01M4 8h.01M8 8h.01M12 8h.01M16 8h.01M20 8h.01" />
      </svg>
    ),
  },
  {
    id: 'radar',
    name: 'Radar Chart',
    description: 'Compare multiple telemetry variables on a multi-dimensional radar plot',
    component: RadarChart,
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    id: 'parallel-coordinates',
    name: 'Parallel Coordinates',
    description: 'Visualize high-dimensional data with interactive brushing and filtering',
    component: ParallelCoordinatesChart,
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14l9 11v-7h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2v-9a2 2 0 012-2h8z" />
      </svg>
    ),
  },
  {
    id: 'bubble',
    name: 'Bubble Chart',
    description: 'Four-dimensional visualization using X, Y, size, and color variables',
    component: BubbleChart,
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 16c0 2.5-2 4.5-4.5 4.5S12 18.5 12 16s2-4.5 4.5-4.5S21 13.5 21 16zM8 21l1.5-1.5L12 22l3-3 4 4" />
      </svg>
    ),
  },
];

export const AnalysisDashboard: React.FC<AnalysisDashboardProps> = ({
  sessions,
}) => {
  const [primarySession, setPrimarySession] = useState<TelemetrySession | null>(null);
  const [comparisonSessions, setComparisonSessions] = useState<TelemetrySession[]>([]);
  const [activeChart, setActiveChart] = useState<ChartType>('tps-comparison');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);


  // Get the active chart component
  const activeChartConfig = useMemo(() => {
    return chartConfigs.find(config => config.id === activeChart);
  }, [activeChart]);

  const ChartComponent = activeChartConfig?.component;

  if (sessions.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
        <div className="text-center">
          <svg className="mx-auto h-16 w-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 48 48">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h3 className="mt-4 text-lg font-medium text-gray-900">No Telemetry Sessions</h3>
          <p className="mt-2 text-sm text-gray-500 max-w-sm">
            Run some inference sessions in the main application to generate telemetry data for analysis.
            Once you have data, you'll be able to explore it with advanced visualization tools.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full bg-gray-50">
      {/* Sidebar */}
      <div className={`bg-white border-r border-gray-200 transition-all duration-300 ${
        sidebarCollapsed ? 'w-16' : 'w-80'
      } flex-shrink-0 flex flex-col`}>
        {/* Fixed Header */}
        <div className="p-4 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center justify-between">
            {!sidebarCollapsed && (
              <h2 className="text-lg font-semibold text-gray-900">Analysis Dashboard</h2>
            )}
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100"
              title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              <svg className={`w-5 h-5 transition-transform ${sidebarCollapsed ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
              </svg>
            </button>
          </div>
        </div>

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto">
          {!sidebarCollapsed && (
            <>
              {/* Session Selection */}
              <div className="p-4 border-b border-gray-200">
                <EnhancedSessionSelector
                  sessions={sessions}
                  primarySession={primarySession}
                  comparisonSessions={comparisonSessions}
                  onPrimarySessionSelect={setPrimarySession}
                  onComparisonSessionsChange={setComparisonSessions}
                />
              </div>

              {/* Chart Selection */}
              <div className="p-4">
                <h3 className="text-sm font-medium text-gray-900 mb-3">Analysis Charts</h3>
                <div className="space-y-2">
                  {chartConfigs.map((config) => (
                    <button
                      key={config.id}
                      onClick={() => setActiveChart(config.id)}
                      className={`w-full text-left p-3 rounded-lg border transition-colors ${
                        activeChart === config.id
                          ? 'bg-blue-50 border-blue-200 text-blue-900'
                          : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center">
                        <div className={`flex-shrink-0 ${
                          activeChart === config.id ? 'text-blue-600' : 'text-gray-400'
                        }`}>
                          {config.icon}
                        </div>
                        <div className="ml-3 flex-1">
                          <div className="text-sm font-medium">
                            {config.name}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            {config.description}
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {sidebarCollapsed && (
            <div className="p-2">
              <div className="space-y-2">
                {chartConfigs.map((config) => (
                  <button
                    key={config.id}
                    onClick={() => setActiveChart(config.id)}
                    className={`w-full p-2 rounded-lg transition-colors ${
                      activeChart === config.id
                        ? 'bg-blue-50 text-blue-600'
                        : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
                    }`}
                    title={config.name}
                  >
                    {config.icon}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <div className="p-6">
          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {activeChartConfig?.name}
                </h1>
                <p className="text-sm text-gray-600 mt-1">
                  {activeChartConfig?.description}
                </p>
                {primarySession?.config && (
                  <div className="mt-2 text-xs text-gray-600 flex items-center gap-3">
                    <span className="px-2 py-1 rounded bg-gray-100 border border-gray-200">
                      Sampling: {primarySession.config.telemetry_sampling_hz ?? '—'} Hz
                    </span>
                    <span className={`px-2 py-1 rounded border ${primarySession.config.wait_for_cpu_baseline_between_models ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-gray-50 border-gray-200 text-gray-700'}`}>
                      CPU Cooldown Wait: {primarySession.config.wait_for_cpu_baseline_between_models ? `Yes (Δ ${(primarySession.config.wait_for_cpu_baseline_margin_c ?? 2.0).toFixed(1)}°C)` : 'No'}
                    </span>
                  </div>
                )}
              </div>
              
              <div className="flex items-center space-x-2 text-sm text-gray-500">
                {primarySession && (
                  <>
                    <span className="flex items-center">
                      <div className="w-3 h-3 bg-blue-500 rounded-full mr-1"></div>
                      {primarySession.name}
                    </span>
                    {comparisonSessions.length > 0 && (
                      <>
                        <span className="text-gray-300">+</span>
                        <span className="text-gray-600">
                          {comparisonSessions.length} comparison session{comparisonSessions.length !== 1 ? 's' : ''}
                        </span>
                      </>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Chart Content */}
          <div className="bg-white rounded-lg shadow-sm">
            {!primarySession ? (
              <div className="p-8">
                <div className="text-center">
                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 48 48">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M7 21l3-3 9 9 6-6 3 3" />
                  </svg>
                  <h3 className="mt-2 text-lg font-medium text-gray-900">Select a Session</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Choose a telemetry session from the sidebar to start analyzing your data.
                    {sidebarCollapsed && ' Click the expand button to access session selection.'}
                  </p>
                </div>
              </div>
            ) : ChartComponent ? (
              <div className="p-6">
                {activeChart === 'tps-comparison' ? (
                  <ChartComponent
                    sessions={primarySession ? [primarySession, ...comparisonSessions] : []}
                    height={600}
                  />
                ) : (
                  <ChartComponent
                    sessionData={primarySession}
                    comparisonData={comparisonSessions[0] || null}
                    height={600}
                  />
                )}
              </div>
            ) : (
              <div className="p-8">
                <div className="text-center">
                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 48 48">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 1v3m0 0v3m0-3h3m-3 0h-3" />
                  </svg>
                  <h3 className="mt-2 text-lg font-medium text-gray-900">Chart Not Available</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    The selected chart component is not available. Please try a different chart type.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Footer with session info */}
          {primarySession && (
            <div className="mt-6 text-xs text-gray-500">
              <div className="flex items-center justify-between">
                <div>
                  Sessions analyzed: {primarySession.name}
                  {comparisonSessions.length > 0 && ` + ${comparisonSessions.length} more`}
                </div>
                <div>
                  Total data points: {[primarySession, ...comparisonSessions]
                    .reduce((sum, session) => sum + session.data.length, 0)}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
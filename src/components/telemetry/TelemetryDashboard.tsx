import React, { useEffect, useState } from 'react';
import { LiveOverlayTemperatureChart } from '../charts/live/LiveOverlayTemperatureChart';
import { LiveOverlayCPUUtilizationChart } from '../charts/live/LiveOverlayCPUUtilizationChart';
import { LiveOverlaySmallMultiplesCPUChart } from '../charts/live/LiveOverlaySmallMultiplesCPUChart';
import { LiveOverlayMemoryChart } from '../charts/live/LiveOverlayMemoryChart';
import { TPSvsCPUTempOverlayChart, TPSvsPowerOverlayChart, TPSvsMemoryOverlayChart } from '../charts/live/LiveOverlayCorrelationCharts';
import { LiveOverlayPowerChart } from '../charts/live/LiveOverlayPowerChart';
import { LiveOverlayTPSChart } from '../charts/live/LiveOverlayTPSChart';
import { LiveOverlayCumulativePowerChart } from '../charts/live/LiveOverlayCumulativePowerChart';
import { SelectableChart, createChartData, createCorrelationChartData } from '../charts/SelectableChart';
import { SmartTooltip } from '../ui/SmartTooltip';
import { type TelemetryData } from '../../stores/telemetryStore';
import type { TelemetryDataPoint, TelemetryDataPointWithRelativeTime } from '../../types/telemetry';

interface TelemetryDashboardProps {
  chartRefreshMs: number;
  isLoading: boolean;
  telemetryData: TelemetryData[];
  summaryStats: {
    A?: { ttft_ms?: number; avg_tps?: number; energy_per_token_wh?: number };
    B?: { ttft_ms?: number; avg_tps?: number; energy_per_token_wh?: number };
  };
  overlayTelemetry: {
    getOverlayChartData: () => {
      modelA: TelemetryDataPointWithRelativeTime[];
      modelB: TelemetryDataPointWithRelativeTime[];
    };
    getLatestSessionData: () => {
      modelA: TelemetryDataPointWithRelativeTime[];
      modelB: TelemetryDataPointWithRelativeTime[];
    };
    startModelSession: (model: 'A' | 'B') => void;
    addTelemetryPoint: (data: TelemetryDataPoint) => void;
    clearAllTelemetry: () => void;
  };
  getLatestTelemetry: () => TelemetryData | null;
  addTelemetryData: (data: TelemetryData) => void;
  clearSessionData: () => void;
  handlePotentialClose: (closeAction: () => void, context: 'close' | 'clear' | 'switch-mode') => void;
  className?: string;
}

/**
 * TelemetryDashboard Component
 * 
 * Comprehensive telemetry display with extensive real-time functionality:
 * - Performance summary stats for Model A/B (TTFT, TPS)
 * - Live overlay charts for power, temperature, memory, CPU utilization
 * - Individual core temperature and utilization monitoring
 * - Correlation charts (TPS vs Temperature, TPS vs Power, etc.)
 * - Debug functionality and test data injection
 * - Real-time data updates and thermal state monitoring
 * - Battery temperature tracking
 * - Interactive chart selection and data visualization
 */
import { CooldownPanel } from './CooldownPanel';

export const TelemetryDashboard: React.FC<TelemetryDashboardProps> = ({
  telemetryData,
  summaryStats,
  overlayTelemetry,
  getLatestTelemetry,
  clearSessionData,
  handlePotentialClose,
  chartRefreshMs,
  isLoading,
  className = ""
}) => {

  // Throttled overlay snapshot for live chart rendering (updates every 2000ms)
  const [overlaySnapshot, setOverlaySnapshot] = useState<{
    modelA: TelemetryDataPointWithRelativeTime[];
    modelB: TelemetryDataPointWithRelativeTime[];
  }>({ modelA: [], modelB: [] });

  useEffect(() => {
    if (chartRefreshMs > 0) {
      // Polling mode: take an initial snapshot and then refresh on interval
      try {
        setOverlaySnapshot(overlayTelemetry.getOverlayChartData());
      } catch {}

      const id = setInterval(() => {
        try {
          setOverlaySnapshot(overlayTelemetry.getOverlayChartData());
        } catch {}
      }, chartRefreshMs);
      return () => clearInterval(id);
    } else {
      // After-completion mode: do not refresh during inference here.
      // A one-time snapshot will be taken when isLoading becomes false (see effect below).
      return () => {};
    }
  }, [overlayTelemetry, chartRefreshMs]);

  // For on-completion mode, update snapshot when isLoading transitions to false
  useEffect(() => {
    if (chartRefreshMs === 0 && !isLoading) {
      try {
        setOverlaySnapshot(overlayTelemetry.getOverlayChartData());
      } catch {}
    }
  }, [chartRefreshMs, isLoading, overlayTelemetry]);

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Clear Session Data button */}
      <div className="space-y-2">
        <button
          onClick={() => handlePotentialClose(clearSessionData, 'clear')}
          className="w-full px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
        >
          Clear Session Data
        </button>
      </div>

      {/* Cooling down panel */}
      <CooldownPanel />

      {/* Performance Summary Stats */}
      <div className="space-y-3">
        <h4 className="font-medium text-gray-800">Performance Summary</h4>
        <div className="grid grid-cols-1 gap-2 text-sm">
          {summaryStats.A && (
            <div className="bg-green-50 p-2 rounded border border-green-200">
              <div className="font-medium text-green-800">Model A</div>
              {summaryStats.A.ttft_ms && (
                <div className="text-green-700">TTFT: {summaryStats.A.ttft_ms}ms</div>
              )}
              {summaryStats.A.avg_tps && (
                <div className="text-green-700">Avg TPS: {summaryStats.A.avg_tps.toFixed(2)}</div>
              )}
              {summaryStats.A.energy_per_token_wh && (
                <div className="text-green-700">Energy per Token: {(summaryStats.A.energy_per_token_wh * 1000).toFixed(3)}mWh</div>
              )}
            </div>
          )}
          {summaryStats.B && (
            <div className="bg-purple-50 p-2 rounded border border-purple-200">
              <div className="font-medium text-purple-800">Model B</div>
              {summaryStats.B.ttft_ms && (
                <div className="text-purple-700">TTFT: {summaryStats.B.ttft_ms}ms</div>
              )}
              {summaryStats.B.avg_tps && (
                <div className="text-purple-700">Avg TPS: {summaryStats.B.avg_tps.toFixed(2)}</div>
              )}
              {summaryStats.B.energy_per_token_wh && (
                <div className="text-purple-700">Energy per Token: {(summaryStats.B.energy_per_token_wh * 1000).toFixed(3)}mWh</div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Debug telemetry data status */}
      <div className="text-xs text-gray-500 mb-2">
        Telemetry points: {telemetryData.length}
        {telemetryData.length > 0 && (() => {
          const latest = getLatestTelemetry();
          return latest ? ` | Latest: ${new Date(latest.timestamp).toLocaleTimeString()}` : '';
        })()}
      </div>

      {/* Real-time Charts - Only show if we have telemetry data */}
      {telemetryData.length > 0 ? (
        <div className="space-y-4">
          {/* Power Usage Chart - Overlay Mode */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <h5 className="text-sm font-medium text-gray-700">Power Usage</h5>
            </div>
            {(() => {
              const overlayChartData = overlaySnapshot;
              const latestData = overlayTelemetry.getLatestSessionData();
              
              // Show current values from latest data (with safe array access)
              const latestModelA = latestData.modelA.length > 0 ? latestData.modelA[latestData.modelA.length - 1] : undefined;
              const latestModelB = latestData.modelB.length > 0 ? latestData.modelB[latestData.modelB.length - 1] : undefined;
              
              return (
                <>
                  {(latestModelA || latestModelB) && (
                    <div className="text-sm space-y-1 mb-2">
                      {latestModelA && latestModelA.cpu_power !== null && (
                        <div className="bg-green-50 p-2 rounded border border-green-200">
                          <div className="flex items-center justify-between">
                            <span>Model A CPU Power:</span>
                            <span className="font-mono text-green-800">
                              {latestModelA.cpu_power?.toFixed(2)}W
                            </span>
                          </div>
                        </div>
                      )}
                      {latestModelB && latestModelB.cpu_power !== null && (
                        <div className="bg-purple-50 p-2 rounded border border-purple-200">
                          <div className="flex items-center justify-between">
                            <span>Model B CPU Power:</span>
                            <span className="font-mono text-purple-800">
                              {latestModelB.cpu_power?.toFixed(2)}W
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  <SelectableChart
                    chartData={createChartData(
                      'Power Usage',
                      'power',
                      overlayChartData.modelA,
                      overlayChartData.modelB
                    )}
                  >
                    <LiveOverlayPowerChart 
                      modelAData={overlayChartData.modelA}
                      modelBData={overlayChartData.modelB}
                      height={256}
                    />
                  </SelectableChart>
                </>
              );
            })()}
          </div>

          {/* Cumulative Energy Consumption Chart */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <h5 className="text-sm font-medium text-gray-700">Energy Consumption</h5>
            </div>
            {(() => {
              const overlayChartData = overlaySnapshot;
              const latestData = overlayTelemetry.getLatestSessionData();
              
              // Show current values from latest data (with safe array access)
              const latestModelA = latestData.modelA.length > 0 ? latestData.modelA[latestData.modelA.length - 1] : undefined;
              const latestModelB = latestData.modelB.length > 0 ? latestData.modelB[latestData.modelB.length - 1] : undefined;
              
              return (
                <>
                  {(latestModelA || latestModelB) && (
                    <div className="text-sm space-y-1 mb-2">
                      {latestModelA && latestModelA.total_energy_wh !== null && (
                        <div className="bg-green-50 p-2 rounded border border-green-200">
                          <div className="flex items-center justify-between">
                            <span>Model A Total Energy:</span>
                            <span className="font-mono text-green-800">
                              {latestModelA.total_energy_wh?.toFixed(4)}Wh
                            </span>
                          </div>
                        </div>
                      )}
                      {latestModelB && latestModelB.total_energy_wh !== null && (
                        <div className="bg-purple-50 p-2 rounded border border-purple-200">
                          <div className="flex items-center justify-between">
                            <span>Model B Total Energy:</span>
                            <span className="font-mono text-purple-800">
                              {latestModelB.total_energy_wh?.toFixed(4)}Wh
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  <SelectableChart
                    chartData={createChartData(
                      'Energy Consumption',
                      'energy',
                      overlayChartData.modelA,
                      overlayChartData.modelB
                    )}
                  >
                    <LiveOverlayCumulativePowerChart 
                      modelAData={overlayChartData.modelA}
                      modelBData={overlayChartData.modelB}
                      height={256}
                    />
                  </SelectableChart>
                </>
              );
            })()}
          </div>

          {/* Enhanced Temperature Charts */}
          <div>
            <h5 className="text-sm font-medium text-gray-700 mb-2">CPU Temperature</h5>
            {(() => {
              const overlayChartData = overlaySnapshot;
              return (
                <SelectableChart
                  chartData={createChartData(
                    'CPU Temperature',
                    'temperature',
                    overlayChartData.modelA,
                    overlayChartData.modelB
                  )}
                >
                  <LiveOverlayTemperatureChart
                    modelAData={overlayChartData.modelA}
                    modelBData={overlayChartData.modelB}
                    height={256}
                  />
                </SelectableChart>
              );
            })()}
          </div>

          {/* Temperature Sensor Details */}
          {telemetryData.length > 0 && telemetryData[telemetryData.length - 1]?.core_temperatures && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <h5 className="text-sm font-medium text-gray-700">Temperature Sensors</h5>
                <SmartTooltip
                  title="About Temperature Sensors"
                  description="These are thermal sensors discovered on the Apple Silicon chip. They're placed in areas near the performance and efficiency CPU clusters, but don't represent individual core temperatures."
                  preferredPosition="left"
                >
                  <svg className="w-4 h-4 text-gray-400 cursor-help" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                  </svg>
                </SmartTooltip>
              </div>
              <div className="text-xs space-y-2">
                {/* Current thermal state indicator */}
                {(() => {
                  const latest = getLatestTelemetry();
                  const thermalTrend = latest?.core_temperatures?.thermal_trend;
                  return (
                    <div className="flex items-center justify-between">
                      <span>Thermal State:</span>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        thermalTrend === 'Rapid' 
                          ? 'bg-red-100 text-red-800'
                          : thermalTrend === 'Heating'
                          ? 'bg-orange-100 text-orange-800'
                          : thermalTrend === 'Cooling'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {thermalTrend || 'Stable'}
                      </span>
                    </div>
                  );
                })()}
                
                {/* Performance Area Sensors */}
                {(() => {
                  const latest = getLatestTelemetry();
                  const pCores = latest?.core_temperatures?.p_cores;
                  return pCores && pCores.length > 0 ? (
                    <div>
                      <div className="font-medium text-gray-600 mb-1">Performance Area Sensors ({pCores.length})</div>
                      <div className="grid grid-cols-4 gap-1">
                        {pCores.map((temp, index) => (
                          <div key={index} className="bg-red-50 p-1 rounded text-center">
                            <div className="text-xs font-mono">{temp.toFixed(1)}°C</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null;
                })()}
                
                {/* Efficiency Area Sensors */}
                {(() => {
                  const latest = getLatestTelemetry();
                  const eCores = latest?.core_temperatures?.e_cores;
                  return eCores && eCores.length > 0 ? (
                    <div>
                      <div className="font-medium text-gray-600 mb-1">Efficiency Area Sensors ({eCores.length})</div>
                      <div className="grid grid-cols-4 gap-1">
                        {eCores.map((temp, index) => (
                          <div key={index} className="bg-blue-50 p-1 rounded text-center">
                            <div className="text-xs font-mono">{temp.toFixed(1)}°C</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null;
                })()}
              </div>
            </div>
          )}

          {/* TPS Chart - Overlay Mode */}
          <div>
            <h5 className="text-sm font-medium text-gray-700 mb-2">Tokens Per Second</h5>
            {(() => {
              const overlayChartData = overlaySnapshot;
              const latestData = overlayTelemetry.getLatestSessionData();
              
              // Show current values from latest data (with safe array access)
              const latestModelA = latestData.modelA.length > 0 ? latestData.modelA[latestData.modelA.length - 1] : undefined;
              const latestModelB = latestData.modelB.length > 0 ? latestData.modelB[latestData.modelB.length - 1] : undefined;
              
              return (
                <>
                  {(latestModelA || latestModelB) && (
                    <div className="text-sm mb-2 space-y-2">
                      {latestModelA && latestModelA.tps !== null && (
                        <div className="bg-green-50 p-2 rounded border border-green-200">
                          <div className="flex items-center justify-between">
                            <span>Model A TPS:</span>
                            <span className="font-mono text-green-800">
                              {latestModelA.tps?.toFixed(2)}
                            </span>
                          </div>
                        </div>
                      )}
                      {latestModelB && latestModelB.tps !== null && (
                        <div className="bg-purple-50 p-2 rounded border border-purple-200">
                          <div className="flex items-center justify-between">
                            <span>Model B TPS:</span>
                            <span className="font-mono text-purple-800">
                              {latestModelB.tps?.toFixed(2)}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  <SelectableChart
                    chartData={createChartData(
                      'Tokens Per Second',
                      'tps',
                      overlayChartData.modelA,
                      overlayChartData.modelB
                    )}
                  >
                    <LiveOverlayTPSChart 
                      modelAData={overlayChartData.modelA}
                      modelBData={overlayChartData.modelB}
                      height={256}
                    />
                  </SelectableChart>
                </>
              );
            })()}
          </div>

          {/* Memory Usage Chart */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <h5 className="text-sm font-medium text-gray-700">Memory Usage</h5>
            </div>
            {(() => {
              const latest = getLatestTelemetry();
              return latest && latest.ram_usage !== null ? (
                <div className="text-sm mb-2">
                  <div className="bg-purple-50 p-2 rounded border border-purple-200">
                    <div className="flex items-center justify-between">
                      <span>Current RAM Usage:</span>
                      <span className="font-mono text-purple-800">
                        {latest.ram_usage?.toFixed(2)}GB
                      </span>
                    </div>
                  </div>
                </div>
              ) : null;
            })()}
            {(() => {
              const overlayChartData = overlaySnapshot;
              return (
                <SelectableChart
                  chartData={createChartData(
                    'Memory Usage',
                    'memory',
                    overlayChartData.modelA,
                    overlayChartData.modelB
                  )}
                >
                  <LiveOverlayMemoryChart
                    modelAData={overlayChartData.modelA}
                    modelBData={overlayChartData.modelB}
                    height={256}
                  />
                </SelectableChart>
              );
            })()}
          </div>

          {/* CPU Utilization Overlay Chart */}
          <div>
            <h5 className="text-sm font-medium text-gray-700 mb-2">CPU Utilization</h5>
            {(() => {
              const overlayChartData = overlaySnapshot;
              return (
                <SelectableChart
                  chartData={createChartData(
                    'CPU Utilization',
                    'cpu_utilization',
                    overlayChartData.modelA,
                    overlayChartData.modelB
                  )}
                >
                  <LiveOverlayCPUUtilizationChart
                    modelAData={overlayChartData.modelA}
                    modelBData={overlayChartData.modelB}
                    height={400}
                  />
                </SelectableChart>
              );
            })()}
          </div>

          {/* Per-Core CPU Utilization Charts (Individual Charts) */}
          <div>
            <h5 className="text-sm font-medium text-gray-700 mb-2">Per-Core CPU Utilization Charts</h5>
            {(() => {
              const overlayChartData = overlaySnapshot;
              return (
                <LiveOverlaySmallMultiplesCPUChart
                  modelAData={overlayChartData.modelA}
                  modelBData={overlayChartData.modelB}
                  height={780}
                />
              );
            })()}
          </div>

          {/* Per-Core Utilization Details */}
          {(() => {
            const latest = getLatestTelemetry();
            return latest && latest.cpu_p_core_utilization ? (
              <div>
                <h5 className="text-sm font-medium text-gray-700 mb-2">Per-Core CPU Utilization (Current Values)</h5>
                <div className="text-xs space-y-2">
                  {/* Overall CPU utilization */}
                  <div className="flex items-center justify-between">
                    <span>Overall CPU:</span>
                    <span className="font-mono">
                      {latest.cpu_overall_utilization?.toFixed(1) || '0.0'}%
                    </span>
                  </div>
                  
                  {/* P-Core utilization */}
                  {latest.cpu_p_core_utilization && (
                    <div>
                      <div className="font-medium text-gray-600 mb-1">
                        Performance Cores ({latest.cpu_p_core_utilization.length})
                      </div>
                      <div className="grid grid-cols-4 gap-1">
                        {latest.cpu_p_core_utilization.map((util, index) => (
                          <div key={index} className="bg-red-50 p-1 rounded text-center">
                            <div className="text-xs font-mono">{util.toFixed(1)}%</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* E-Core utilization */}
                  {latest.cpu_e_core_utilization && (
                    <div>
                      <div className="font-medium text-gray-600 mb-1">
                        Efficiency Cores ({latest.cpu_e_core_utilization.length})
                      </div>
                      <div className="grid grid-cols-4 gap-1">
                        {latest.cpu_e_core_utilization.map((util, index) => (
                          <div key={index} className="bg-blue-50 p-1 rounded text-center">
                            <div className="text-xs font-mono">{util.toFixed(1)}%</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : null;
          })()}

          {/* Battery Temperature */}
          {(() => {
            const latest = getLatestTelemetry();
            return latest && latest.battery_temp_avg ? (
              <div>
                <h5 className="text-sm font-medium text-gray-700 mb-2">Battery Temperature</h5>
                <div className="text-sm">
                  <div className="bg-yellow-50 p-2 rounded border border-yellow-200">
                    <div className="flex items-center justify-between">
                      <span>Battery Temp:</span>
                      <span className="font-mono text-yellow-800">
                        {latest.battery_temp_avg.toFixed(1)}°C
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ) : null;
          })()}

          {/* Correlation Charts (Overlay Comparison) */}
          <div className="space-y-4">
            <h5 className="text-sm font-medium text-gray-700">Performance Correlations</h5>

            {(() => {
              const overlayChartData = overlaySnapshot;
              return (
                <>
                  {/* TPS vs CPU Temperature */}
                  <div>
                    <h6 className="text-xs font-medium text-gray-600 mb-1">TPS vs CPU Temperature</h6>
                    <SelectableChart
                      chartData={createCorrelationChartData(
                        'TPS vs CPU Temperature',
                        'cpu_temp_avg',
                        'tps',
                        overlayChartData.modelA,
                        overlayChartData.modelB
                      )}
                    >
                      <TPSvsCPUTempOverlayChart
                        modelAData={overlayChartData.modelA}
                        modelBData={overlayChartData.modelB}
                        height={200}
                      />
                    </SelectableChart>
                  </div>

                  {/* TPS vs Power Draw */}
                  <div>
                    <h6 className="text-xs font-medium text-gray-600 mb-1">TPS vs CPU Power</h6>
                    <SelectableChart
                      chartData={createCorrelationChartData(
                        'TPS vs CPU Power',
                        'cpu_power',
                        'tps',
                        overlayChartData.modelA,
                        overlayChartData.modelB
                      )}
                    >
                      <TPSvsPowerOverlayChart
                        modelAData={overlayChartData.modelA}
                        modelBData={overlayChartData.modelB}
                        height={200}
                      />
                    </SelectableChart>
                  </div>

                  {/* TPS vs Memory Usage */}
                  <div>
                    <h6 className="text-xs font-medium text-gray-600 mb-1">TPS vs Memory Usage</h6>
                    <SelectableChart
                      chartData={createCorrelationChartData(
                        'TPS vs Memory Usage',
                        'ram_usage',
                        'tps',
                        overlayChartData.modelA,
                        overlayChartData.modelB
                      )}
                    >
                      <TPSvsMemoryOverlayChart
                        modelAData={overlayChartData.modelA}
                        modelBData={overlayChartData.modelB}
                        height={200}
                      />
                    </SelectableChart>
                  </div>
                </>
              );
            })()}
          </div>
          
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500">
          <p>No telemetry data available</p>
          <p className="text-xs mt-1">Charts will appear when data starts flowing</p>
        </div>
      )}
    </div>
  );
};

export default TelemetryDashboard;
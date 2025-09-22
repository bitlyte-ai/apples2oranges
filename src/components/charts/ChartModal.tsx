import React, { useMemo } from 'react';
import { createPortal } from 'react-dom';
import { PlotlyRenderer } from './modal/PlotlyRenderer';
import type { TelemetryDataPointWithRelativeTime } from '../../types/telemetry';
import type { PlotlyTrace } from './modal/transformers/BaseTransformer';

// Not the architecture, we use these "transformers" to convert chart.js to plotly chrts.
import { PowerChartTransformer } from './modal/transformers/PowerChartTransformer';
import { TemperatureChartTransformer } from './modal/transformers/TemperatureChartTransformer';
import { TPSChartTransformer } from './modal/transformers/TPSChartTransformer';
import { MemoryChartTransformer } from './modal/transformers/MemoryChartTransformer';
import { CPUUtilizationTransformer } from './modal/transformers/CPUUtilizationTransformer';
import { CorrelationChartTransformer } from './modal/transformers/CorrelationChartTransformer';
import { EnergyChartTransformer } from './modal/transformers/EnergyChartTransformer';

export interface ChartModalData {
  title: string;
  type: 'power' | 'temperature' | 'tps' | 'memory' | 'cpu_utilization' | 'correlation' | 'energy';
  modelAData: TelemetryDataPointWithRelativeTime[];
  modelBData: TelemetryDataPointWithRelativeTime[];
  // For correlation charts - specify x and y axis variables
  xAxis?: 'cpu_temp_avg' | 'cpu_power' | 'ram_usage';
  yAxis?: 'tps';
}

interface ChartModalProps {
  isOpen: boolean;
  onClose: () => void;
  chartData: ChartModalData | null;
}


export const ChartModal: React.FC<ChartModalProps> = ({
  isOpen,
  onClose,
  chartData,
}) => {
  // Transform Chart.js data to Plotly format using appropriate transformer
  const plotlyData = useMemo((): PlotlyTrace[] => {
    if (!chartData) return [];

    let transformer;
    
    switch (chartData.type) {
      case 'power':
        transformer = new PowerChartTransformer(chartData);
        break;
      case 'temperature':
        transformer = new TemperatureChartTransformer(chartData);
        break;
      case 'tps':
        transformer = new TPSChartTransformer(chartData);
        break;
      case 'memory':
        transformer = new MemoryChartTransformer(chartData);
        break;
      case 'cpu_utilization':
        transformer = new CPUUtilizationTransformer(chartData);
        break;
      case 'correlation':
        transformer = new CorrelationChartTransformer(chartData);
        break;
      case 'energy':
        transformer = new EnergyChartTransformer(chartData);
        break;
      default:
        console.warn(`Unknown chart type: ${chartData.type}`);
        return [];
    }

    return transformer.transform();
  }, [chartData]);

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div 
        className="relative bg-white rounded-lg shadow-2xl"
        style={{ 
          width: '70vw', 
          height: '80vh',
          maxWidth: '1200px',
          maxHeight: '900px',
          minWidth: '600px',
          minHeight: '400px'
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            {chartData?.title || 'Chart View'}
          </h2>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
            aria-label="Close modal"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        {/* Chart Content */}
        <div className="flex-1 p-4" style={{ height: 'calc(100% - 80px)' }}>
          {chartData ? (
            <PlotlyRenderer
              chartData={chartData}
              traces={plotlyData}
            />
          ) : (
            <div className="flex items-center justify-center h-full bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
              <div className="text-center">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 48 48">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900">No data available</h3>
                <p className="mt-1 text-sm text-gray-500">No chart data to display</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};
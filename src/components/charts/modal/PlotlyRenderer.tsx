import React, { useMemo, Suspense } from 'react';
import { LazyPlot, ChartLoadingSpinner } from '../analysis/LazyPlotlyWrapper';
import type { ChartModalData } from '../ChartModal';
import type { PlotlyTrace } from './transformers/BaseTransformer';

interface PlotlyRendererProps {
  chartData: ChartModalData;
  traces: PlotlyTrace[];
}

/**
 * Pure Plotly rendering component - handles only chart rendering without modal concerns
 * Preserves exact original layout and configuration logic from ChartModal
 */
export const PlotlyRenderer: React.FC<PlotlyRendererProps> = ({
  chartData,
  traces,
}) => {
  // Get axis label for correlation charts
  const getAxisLabel = (axis: 'cpu_temp_avg' | 'cpu_power' | 'ram_usage' | 'tps') => {
    switch (axis) {
      case 'cpu_temp_avg':
        return 'CPU Temperature (°C)';
      case 'cpu_power':
        return 'CPU Power (W)';
      case 'ram_usage':
        return 'Memory Usage (GB)';
      case 'tps':
        return 'TPS';
      default:
        return axis;
    }
  };

  const layout = useMemo(() => {
    const unit = (() => {
      switch (chartData.type) {
        case 'power':
          return 'Power (W)';
        case 'temperature':
          return 'Temperature (°C)';
        case 'tps':
          return 'Tokens Per Second';
        case 'memory':
          return 'Memory Usage (GB)';
        case 'cpu_utilization':
          return 'CPU Utilization (%)';
        case 'correlation':
          return 'Correlation Analysis';
        default:
          return 'Value';
      }
    })();

    // For correlation charts, use custom axis titles
    const xAxisTitle = chartData.type === 'correlation' && chartData.xAxis 
      ? getAxisLabel(chartData.xAxis) 
      : 'Time from Inference Start (seconds)';
    const yAxisTitle = chartData.type === 'correlation' && chartData.yAxis 
      ? getAxisLabel(chartData.yAxis) 
      : unit;

    return {
      title: {
        text: `${chartData.title} - Enhanced View`,
        font: { size: 18 },
        x: 0.5,
      },
      xaxis: {
        title: {
          text: xAxisTitle,
          font: { size: 14 },
        },
        showgrid: true,
        zeroline: false,
      },
      yaxis: {
        title: {
          text: yAxisTitle,
          font: { size: 14 },
        },
        showgrid: true,
        zeroline: chartData.type !== 'correlation',
      },
      showlegend: true,
      legend: {
        orientation: 'v',
        x: 1.02,
        y: 1,
        xanchor: 'left',
        yanchor: 'top',
        bgcolor: 'rgba(255,255,255,0.9)',
        bordercolor: 'rgba(0,0,0,0.1)',
        borderwidth: 1,
      },
      margin: { l: 80, r: 150, t: 80, b: 80 },
      plot_bgcolor: 'white',
      paper_bgcolor: 'white',
      hovermode: 'x unified',
    };
  }, [chartData]);

  const config = useMemo(() => ({
    displayModeBar: true,
    responsive: true,
    displaylogo: false,
    modeBarButtonsToRemove: ['lasso2d', 'select2d'],
    toImageButtonOptions: {
      format: 'png' as const,
      filename: `${chartData.title.replace(/\s+/g, '_').toLowerCase()}_chart`,
      height: 800,
      width: 1200,
      scale: 2,
    },
  }), [chartData]);

  if (traces.length === 0) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
        <div className="text-center">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 48 48">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No data available</h3>
          <p className="mt-1 text-sm text-gray-500">No chart data to display</p>
        </div>
      </div>
    );
  }

  return (
    <Suspense fallback={<ChartLoadingSpinner />}>
      <LazyPlot
        data={traces}
        layout={layout}
        config={config}
        style={{ width: '100%', height: '100%' }}
        useResizeHandler
      />
    </Suspense>
  );
};
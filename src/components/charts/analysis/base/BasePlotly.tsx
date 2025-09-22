import React, { Suspense } from 'react';
import { LazyPlot, ChartLoadingSpinner } from '../LazyPlotlyWrapper';
import type { ChartConfigType, LayoutVariant } from './PlotlyThemes';
import { buildLayout, getChartConfig } from './PlotlyConfig';

interface BasePlotlyProps {
  data: any[];
  title: string;
  chartType: ChartConfigType;
  layoutVariant?: LayoutVariant;
  customLayout?: any;
  customConfig?: any;
  height?: number;
  emptyMessage?: string;
  filename?: string;
}

/**
 * Base Plotly component that provides common patterns for all analysis charts
 * Handles loading states, empty states, and consistent configuration
 */
export const BasePlotly: React.FC<BasePlotlyProps> = ({
  data,
  title,
  chartType,
  layoutVariant = 'standard',
  customLayout = {},
  customConfig = {},
  height = 600,
  emptyMessage = 'No data available for visualization',
  filename,
}) => {
  // Build complete layout
  const layout = {
    ...buildLayout(title, layoutVariant),
    ...customLayout,
    height,
  };

  // Build complete config
  const config = {
    ...getChartConfig(chartType, filename),
    ...customConfig,
  };

  // Check if data is available
  const hasData = data && data.length > 0 && data.some(trace => {
    // Check different data formats
    if (trace.x && Array.isArray(trace.x) && trace.x.length > 0) return true;
    if (trace.r && Array.isArray(trace.r) && trace.r.length > 0) return true;
    if (trace.dimensions && Array.isArray(trace.dimensions) && trace.dimensions.length > 0) return true;
    return false;
  });

  if (!hasData) {
    return (
      <div 
        className="flex items-center justify-center bg-gray-50 rounded-lg border-2 border-dashed border-gray-300"
        style={{ height }}
      >
        <div className="text-center">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 48 48">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 19v-2a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2h2a2 2 0 002-2v-2m0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m0 0v10a2 2 0 01-2 2h-2a2 2 0 01-2-2V19m0 0h8" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No Data Available</h3>
          <p className="mt-1 text-sm text-gray-500">{emptyMessage}</p>
        </div>
      </div>
    );
  }

  return (
    <Suspense fallback={<ChartLoadingSpinner />}>
      <LazyPlot
        data={data}
        layout={layout}
        config={config}
        style={{ width: '100%', height: '100%' }}
        useResizeHandler
      />
    </Suspense>
  );
};
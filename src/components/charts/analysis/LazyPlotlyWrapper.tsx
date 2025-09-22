import { lazy } from 'react';

// Lazy load Plotly.js components to keep initial bundle small
// Use any type to avoid complex Plotly type issues
export const LazyPlot = lazy(() => 
  import('react-plotly.js').then(module => ({ default: module.default }))
) as any;

// Loading component for lazy-loaded charts
export const ChartLoadingSpinner = () => (
  <div className="flex items-center justify-center h-64 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
    <div className="text-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
      <span className="text-gray-500 text-sm">Loading chart...</span>
    </div>
  </div>
);
import React, { useMemo, useRef } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Line, Scatter } from 'react-chartjs-2';
import { useResponsiveChart } from '../../../../hooks/useChartContainer';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

export interface BaseChartProps {
  data: { datasets: any[] };
  height?: number;
  customOptions?: any;
  emptyMessage: string;
  useResponsive?: boolean; // Some charts use useResponsiveChart hook, others don't
  onChartRef?: (ref: ChartJS | null) => void; // Callback for chart ref
  chartType?: 'line' | 'scatter'; // Support different chart types
}

/**
 * Base Chart.js component that preserves exact responsive behavior from originals
 * - Some charts use useResponsiveChart hook (Power, TPS) 
 * - Others use standard responsive: true (Temperature, Memory, CPU)
 */
export const BaseChartJS: React.FC<BaseChartProps> = ({
  data,
  height = 200,
  customOptions = {},
  emptyMessage,
  useResponsive = false,
  onChartRef,
  chartType = 'line',
}) => {
  // Conditional hook usage to match original implementations exactly
  const responsiveChart = useResponsive ? useResponsiveChart(height) : null;
  const chartInstanceRef = useRef<ChartJS | null>(null);

  const chartData = useMemo(() => data, [data]);

  // Pure passthrough - no corrupting defaults, charts provide complete options
  const finalOptions = useMemo(() => {
    if (useResponsive && responsiveChart) {
      return {
        ...customOptions,
        ...responsiveChart.chartOptions,
      };
    }
    return customOptions;
  }, [customOptions, useResponsive, responsiveChart]);

  // Empty state check
  if (data.datasets.length === 0) {
    const containerStyle = { height, width: '100%', maxWidth: '100%', overflow: 'hidden' };
    
    if (useResponsive && responsiveChart) {
      // Use responsive container for charts that had useResponsiveChart
      return (
        <div
          ref={responsiveChart.containerRef}
          className="bg-gray-50 rounded border-2 border-dashed border-gray-300 flex items-center justify-center"
          style={{ ...containerStyle, minWidth: 0 }}
        >
          <span className="text-gray-500 text-sm">{emptyMessage}</span>
        </div>
      );
    } else {
      // Use standard container for charts that didn't use hook
      return (
        <div
          className="bg-gray-50 rounded border-2 border-dashed border-gray-300 flex items-center justify-center"
          style={containerStyle}
        >
          <span className="text-gray-500 text-sm">{emptyMessage}</span>
        </div>
      );
    }
  }

  // Select chart component based on chartType
  const ChartComponent = chartType === 'scatter' ? Scatter : Line;

  // Chart rendering
  if (useResponsive && responsiveChart) {
    // For charts that used useResponsiveChart hook (Power, TPS)
    return (
      <div
        ref={responsiveChart.containerRef}
        style={{ height, width: '100%', maxWidth: '100%', minWidth: 0, overflow: 'hidden' }}
      >
        <ChartComponent 
          data={chartData} 
          options={finalOptions}
          ref={(ref: any) => {
            const chartInstance = ref || null;
            chartInstanceRef.current = chartInstance;
            if (responsiveChart.chartRef) {
              responsiveChart.chartRef(chartInstance);
            }
            if (onChartRef) {
              onChartRef(chartInstance);
            }
          }}
        />
      </div>
    );
  } else {
    // For charts that used standard responsive (Temperature, Memory, CPU)
    return (
      <div style={{ height, width: '100%', maxWidth: '100%', overflow: 'hidden' }}>
        <ChartComponent 
          data={chartData} 
          options={finalOptions}
          ref={(ref: any) => {
            const chartInstance = ref || null;
            chartInstanceRef.current = chartInstance;
            if (onChartRef) {
              onChartRef(chartInstance);
            }
          }}
        />
      </div>
    );
  }
};
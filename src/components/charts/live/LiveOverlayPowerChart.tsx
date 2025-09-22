import React, { useMemo } from 'react';
import type { TelemetryDataPointWithRelativeTime } from '../../../types/telemetry';
import { BaseChartJS } from './base/BaseChartJS';
import { CHART_COLORS, BORDER_DASH_PATTERNS, BORDER_WIDTHS } from './base/ChartConfig';

interface LiveOverlayPowerChartProps {
  modelAData: TelemetryDataPointWithRelativeTime[];
  modelBData: TelemetryDataPointWithRelativeTime[];
  height?: number;
}

export const LiveOverlayPowerChart: React.FC<LiveOverlayPowerChartProps> = ({
  modelAData,
  modelBData,
  height = 128
}) => {
 
  const datasets = useMemo(() => {
    const datasets = [];
    
    // Model A CPU Power dataset
    const modelACpuData = modelAData
      .filter(d => d.cpu_power !== null)
      .map(d => ({ x: d.relative_time_seconds, y: d.cpu_power! }));
    
    if (modelACpuData.length > 0) {
      datasets.push({
        label: 'Model A - CPU Power',
        data: modelACpuData,
        borderColor: CHART_COLORS.modelA.primary, // '#10b981'
        backgroundColor: CHART_COLORS.modelA.primaryBg, // 'rgba(16, 185, 129, 0.1)'
        borderWidth: BORDER_WIDTHS.primary, // 2
        tension: 0.1,
        pointRadius: 0,
        pointHoverRadius: 4,
      });
    }
    
    // Model A GPU Power dataset
    const modelAGpuData = modelAData
      .filter(d => d.gpu_power !== null)
      .map(d => ({ x: d.relative_time_seconds, y: d.gpu_power! }));
    
    if (modelAGpuData.length > 0) {
      datasets.push({
        label: 'Model A - GPU Power',
        data: modelAGpuData,
        borderColor: CHART_COLORS.modelA.secondary, // '#22c55e'
        backgroundColor: CHART_COLORS.modelA.secondaryBg, // 'rgba(34, 197, 94, 0.1)'
        borderWidth: BORDER_WIDTHS.secondary, // 2
        borderDash: BORDER_DASH_PATTERNS.gpu, // [3, 3]
        tension: 0.1,
        pointRadius: 0,
        pointHoverRadius: 4,
      });
    }
    
    // Model B CPU Power dataset
    const modelBCpuData = modelBData
      .filter(d => d.cpu_power !== null)
      .map(d => ({ x: d.relative_time_seconds, y: d.cpu_power! }));
    
    if (modelBCpuData.length > 0) {
      datasets.push({
        label: 'Model B - CPU Power',
        data: modelBCpuData,
        borderColor: CHART_COLORS.modelB.primary, // '#8b5cf6'
        backgroundColor: CHART_COLORS.modelB.primaryBg, // 'rgba(139, 92, 246, 0.1)'
        borderWidth: BORDER_WIDTHS.primary, // 2
        tension: 0.1,
        pointRadius: 0,
        pointHoverRadius: 4,
      });
    }
    
    // Model B GPU Power dataset
    const modelBGpuData = modelBData
      .filter(d => d.gpu_power !== null)
      .map(d => ({ x: d.relative_time_seconds, y: d.gpu_power! }));
    
    if (modelBGpuData.length > 0) {
      datasets.push({
        label: 'Model B - GPU Power',
        data: modelBGpuData,
        borderColor: CHART_COLORS.modelB.secondary, // '#a855f7'
        backgroundColor: CHART_COLORS.modelB.secondaryBg, // 'rgba(168, 85, 247, 0.1)'
        borderWidth: BORDER_WIDTHS.secondary, // 2
        borderDash: BORDER_DASH_PATTERNS.gpu, // [3, 3]
        tension: 0.1,
        pointRadius: 0,
        pointHoverRadius: 4,
      });
    }
    
    return datasets;
  }, [modelAData, modelBData]);

  
  const options = useMemo(() => ({
    // Note: useResponsiveChart options will be merged in BaseChartJS
    animation: {
      duration: 0, // Disable animations for performance
    },
    scales: {
      x: {
        type: 'linear' as const,
        title: {
          display: true,
          text: 'Time from Inference Start (seconds)',
        },
        ticks: {
          callback: function(value: any) {
            return `${value}s`;
          },
          font: {
            size: 10,
          },
        },
        beginAtZero: true,
      },
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: 'Power (W)',
        },
        ticks: {
          font: {
            size: 10,
          },
        },
      },
    },
    plugins: {
      legend: {
        display: true,
        position: 'top' as const,
        labels: {
          font: {
            size: 10,
          },
          padding: 10,
          usePointStyle: true,
        },
      },
      tooltip: {
        mode: 'index' as const,
        intersect: false,
        callbacks: {
          title: function(context: any) {
            const time = context[0]?.parsed?.x || 0;
            return `Time: ${time.toFixed(1)}s`;
          },
          label: function(context: any) {
            return `${context.dataset.label}: ${context.parsed.y.toFixed(2)}W`;
          },
        },
      },
    },
    interaction: {
      mode: 'nearest' as const,
      axis: 'x' as const,
      intersect: false,
    },
  }), []);

  return (
    <BaseChartJS
      data={{ datasets }}
      height={height}
      customOptions={options}
      emptyMessage="No power data available"
      useResponsive={true} 
    />
  );
};
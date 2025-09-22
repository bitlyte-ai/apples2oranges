import React, { useMemo } from 'react';
import { BaseChartJS } from './base/BaseChartJS';
import type { TelemetryDataPointWithRelativeTime } from '../../../types/telemetry';

interface LiveOverlayMemoryChartProps {
  modelAData: TelemetryDataPointWithRelativeTime[];
  modelBData: TelemetryDataPointWithRelativeTime[];
  height?: number;
}

export const LiveOverlayMemoryChart: React.FC<LiveOverlayMemoryChartProps> = ({ 
  modelAData, 
  modelBData, 
  height = 200 
}) => {
  const chartData = useMemo(() => {
    const datasets = [];
    
    // Model A Memory Usage dataset
    const modelAMemoryData = modelAData
      .filter(d => d.ram_usage !== null && d.ram_usage !== undefined)
      .map(d => ({ x: d.relative_time_seconds, y: d.ram_usage! }));
    
    if (modelAMemoryData.length > 0) {
      datasets.push({
        label: 'Model A - RAM Usage (GB)',
        data: modelAMemoryData,
        borderColor: '#22c55e', // Green for Model A
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        borderWidth: 2,
        pointRadius: 1,
        pointHoverRadius: 4,
        fill: true,
        tension: 0.1,
      });
    }
    
    // Model B Memory Usage dataset
    const modelBMemoryData = modelBData
      .filter(d => d.ram_usage !== null && d.ram_usage !== undefined)
      .map(d => ({ x: d.relative_time_seconds, y: d.ram_usage! }));
    
    if (modelBMemoryData.length > 0) {
      datasets.push({
        label: 'Model B - RAM Usage (GB)',
        data: modelBMemoryData,
        borderColor: '#a855f7', // Purple for Model B
        backgroundColor: 'rgba(168, 85, 247, 0.1)',
        borderWidth: 2,
        pointRadius: 1,
        pointHoverRadius: 4,
        fill: true,
        tension: 0.1,
      });
    }
    
    return { datasets };
  }, [modelAData, modelBData]);

  const customOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: 0, // Disable animations for real-time performance
    },
    interaction: {
      intersect: false,
      mode: 'index' as const,
    },
    scales: {
      x: {
        type: 'linear' as const, // Use linear scale for relative time
        min: 0, // Start from 0 seconds
        title: {
          display: true,
          text: 'Time (seconds)',
        },
        ticks: {
          font: {
            size: 9,
          },
          maxTicksLimit: 6,
          callback: function(value: any) {
            return value.toFixed(1) + 's';
          },
        },
      },
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: 'Memory (GB)',
        },
        ticks: {
          font: {
            size: 10,
          },
          callback: function(value: any) {
            return value.toFixed(1) + 'GB';
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
          padding: 8,
          usePointStyle: true,
        },
      },
      tooltip: {
        callbacks: {
          label: function(context: any) {
            const usage = context.parsed.y;
            return `${context.dataset.label}: ${usage.toFixed(2)}GB`;
          },
          title: function(context: any) {
            const timeSeconds = context[0]?.parsed?.x;
            return timeSeconds !== undefined ? `Time: ${timeSeconds.toFixed(1)}s` : '';
          },
        },
      },
    },
  }), []);

  return (
    <BaseChartJS
      data={chartData}
      height={height}
      customOptions={customOptions}
      emptyMessage="No memory usage data available for comparison"
    />
  );
};
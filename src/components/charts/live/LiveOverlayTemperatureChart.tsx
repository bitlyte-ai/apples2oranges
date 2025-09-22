import React, { useMemo } from 'react';
import { BaseChartJS } from './base/BaseChartJS';
import type { TelemetryDataPointWithRelativeTime } from '../../../types/telemetry';

interface LiveOverlayTemperatureChartProps {
  modelAData: TelemetryDataPointWithRelativeTime[];
  modelBData: TelemetryDataPointWithRelativeTime[];
  height?: number;
}

export const LiveOverlayTemperatureChart: React.FC<LiveOverlayTemperatureChartProps> = ({ 
  modelAData, 
  modelBData, 
  height = 220 
}) => {
  const chartData = useMemo(() => {
    const datasets = [];
    
    // Model A CPU Temperature Average dataset
    const modelACpuTempData = modelAData
      .filter(d => d.cpu_temp_avg !== null)
      .map(d => ({ x: d.relative_time_seconds, y: d.cpu_temp_avg! }));
    
    if (modelACpuTempData.length > 0) {
      datasets.push({
        label: 'Model A - CPU Temp (Avg)',
        data: modelACpuTempData,
        borderColor: '#22c55e', // Green for Model A
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        borderWidth: 2,
        tension: 0.1,
        pointRadius: 0,
        pointHoverRadius: 4,
      });
    }
    
    // Model A CPU Temperature Max dataset (dashed line)
    const modelACpuTempMaxData = modelAData
      .filter(d => d.cpu_temp_max !== null)
      .map(d => ({ x: d.relative_time_seconds, y: d.cpu_temp_max! }));
    
    if (modelACpuTempMaxData.length > 0) {
      datasets.push({
        label: 'Model A - CPU Temp (Max)',
        data: modelACpuTempMaxData,
        borderColor: '#16a34a', // Darker green for Model A max
        backgroundColor: 'rgba(22, 163, 74, 0.05)',
        borderWidth: 1,
        borderDash: [5, 5],
        tension: 0.1,
        pointRadius: 0,
        pointHoverRadius: 4,
      });
    }
    
    // Model A GPU Temperature dataset
    const modelAGpuTempData = modelAData
      .filter(d => d.gpu_temp_avg !== null)
      .map(d => ({ x: d.relative_time_seconds, y: d.gpu_temp_avg! }));
    
    if (modelAGpuTempData.length > 0) {
      datasets.push({
        label: 'Model A - GPU Temp',
        data: modelAGpuTempData,
        borderColor: '#65a30d', // Yellow-green for Model A GPU
        backgroundColor: 'rgba(101, 163, 13, 0.1)',
        borderWidth: 2,
        tension: 0.1,
        pointRadius: 0,
        pointHoverRadius: 4,
      });
    }
    
    // Model B CPU Temperature Average dataset
    const modelBCpuTempData = modelBData
      .filter(d => d.cpu_temp_avg !== null)
      .map(d => ({ x: d.relative_time_seconds, y: d.cpu_temp_avg! }));
    
    if (modelBCpuTempData.length > 0) {
      datasets.push({
        label: 'Model B - CPU Temp (Avg)',
        data: modelBCpuTempData,
        borderColor: '#a855f7', // Purple for Model B
        backgroundColor: 'rgba(168, 85, 247, 0.1)',
        borderWidth: 2,
        tension: 0.1,
        pointRadius: 0,
        pointHoverRadius: 4,
      });
    }
    
    // Model B CPU Temperature Max dataset (dashed line)
    const modelBCpuTempMaxData = modelBData
      .filter(d => d.cpu_temp_max !== null)
      .map(d => ({ x: d.relative_time_seconds, y: d.cpu_temp_max! }));
    
    if (modelBCpuTempMaxData.length > 0) {
      datasets.push({
        label: 'Model B - CPU Temp (Max)',
        data: modelBCpuTempMaxData,
        borderColor: '#9333ea', // Darker purple for Model B max
        backgroundColor: 'rgba(147, 51, 234, 0.05)',
        borderWidth: 1,
        borderDash: [5, 5],
        tension: 0.1,
        pointRadius: 0,
        pointHoverRadius: 4,
      });
    }
    
    // Model B GPU Temperature dataset
    const modelBGpuTempData = modelBData
      .filter(d => d.gpu_temp_avg !== null)
      .map(d => ({ x: d.relative_time_seconds, y: d.gpu_temp_avg! }));
    
    if (modelBGpuTempData.length > 0) {
      datasets.push({
        label: 'Model B - GPU Temp',
        data: modelBGpuTempData,
        borderColor: '#c026d3', // Magenta-purple for Model B GPU
        backgroundColor: 'rgba(192, 38, 211, 0.1)',
        borderWidth: 2,
        tension: 0.1,
        pointRadius: 0,
        pointHoverRadius: 4,
      });
    }
    
    return { datasets };
  }, [modelAData, modelBData]);

  const customOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: 0, // Disable animations for performance
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
          maxTicksLimit: 6,
          font: {
            size: 10,
          },
          callback: function(value: any) {
            return value.toFixed(1) + 's';
          },
        },
      },
      y: {
        beginAtZero: false,
        min: 20, // Start at reasonable temperature baseline
        title: {
          display: true,
          text: 'Temperature (°C)',
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
          label: function(context: any) {
            return `${context.dataset.label}: ${context.parsed.y.toFixed(1)}°C`;
          },
          title: function(context: any) {
            const timeSeconds = context[0]?.parsed?.x;
            return timeSeconds !== undefined ? `Time: ${timeSeconds.toFixed(1)}s` : '';
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
      data={chartData}
      height={height}
      customOptions={customOptions}
      emptyMessage="No temperature data available for comparison"
    />
  );
};
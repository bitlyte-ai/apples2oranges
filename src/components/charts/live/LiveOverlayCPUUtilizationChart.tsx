import React, { useMemo } from 'react';
import { BaseChartJS } from './base/BaseChartJS';
import type { TelemetryDataPointWithRelativeTime } from '../../../types/telemetry';

interface LiveOverlayCPUUtilizationChartProps {
  modelAData: TelemetryDataPointWithRelativeTime[];
  modelBData: TelemetryDataPointWithRelativeTime[];
  height?: number;
}

export const LiveOverlayCPUUtilizationChart: React.FC<LiveOverlayCPUUtilizationChartProps> = ({ 
  modelAData, 
  modelBData, 
  height = 220 
}) => {
  const chartData = useMemo(() => {
    const datasets = [];
    
    // Model A Overall CPU Utilization
    const modelAOverallCpuData = modelAData
      .filter(d => d.cpu_overall_utilization !== null && d.cpu_overall_utilization !== undefined)
      .map(d => ({ x: d.relative_time_seconds, y: d.cpu_overall_utilization! }));
    
    if (modelAOverallCpuData.length > 0) {
      datasets.push({
        label: 'Model A - Overall CPU',
        data: modelAOverallCpuData,
        borderColor: '#22c55e', // Green for Model A
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        borderWidth: 2,
        pointRadius: 1,
        pointHoverRadius: 4,
        fill: 'origin',
        tension: 0.1,
      });
    }
    
    // Model A P-Core Average (if available)
    const modelAPCoreData = modelAData
      .filter(d => d.cpu_p_core_utilization && d.cpu_p_core_utilization.length > 0)
      .map(d => ({
        x: d.relative_time_seconds,
        y: d.cpu_p_core_utilization!.reduce((sum, val) => sum + val, 0) / d.cpu_p_core_utilization!.length
      }));
    
    if (modelAPCoreData.length > 0) {
      datasets.push({
        label: 'Model A - P-Cores Avg',
        data: modelAPCoreData,
        borderColor: '#16a34a', // Darker green for Model A P-cores
        backgroundColor: 'rgba(22, 163, 74, 0.05)',
        borderWidth: 1.5,
        borderDash: [3, 3],
        pointRadius: 0,
        pointHoverRadius: 3,
        fill: false,
        tension: 0.1,
      });
    }
    
    // Model A E-Core Average (if available)
    const modelAECoreData = modelAData
      .filter(d => d.cpu_e_core_utilization && d.cpu_e_core_utilization.length > 0)
      .map(d => ({
        x: d.relative_time_seconds,
        y: d.cpu_e_core_utilization!.reduce((sum, val) => sum + val, 0) / d.cpu_e_core_utilization!.length
      }));
    
    if (modelAECoreData.length > 0) {
      datasets.push({
        label: 'Model A - E-Cores Avg',
        data: modelAECoreData,
        borderColor: '#65a30d', // Yellow-green for Model A E-cores
        backgroundColor: 'rgba(101, 163, 13, 0.05)',
        borderWidth: 1.5,
        borderDash: [5, 2],
        pointRadius: 0,
        pointHoverRadius: 3,
        fill: false,
        tension: 0.1,
      });
    }
    
    // Model B Overall CPU Utilization
    const modelBOverallCpuData = modelBData
      .filter(d => d.cpu_overall_utilization !== null && d.cpu_overall_utilization !== undefined)
      .map(d => ({ x: d.relative_time_seconds, y: d.cpu_overall_utilization! }));
    
    if (modelBOverallCpuData.length > 0) {
      datasets.push({
        label: 'Model B - Overall CPU',
        data: modelBOverallCpuData,
        borderColor: '#a855f7', // Purple for Model B
        backgroundColor: 'rgba(168, 85, 247, 0.1)',
        borderWidth: 2,
        pointRadius: 1,
        pointHoverRadius: 4,
        fill: 'origin',
        tension: 0.1,
      });
    }
    
    // Model B P-Core Average (if available)
    const modelBPCoreData = modelBData
      .filter(d => d.cpu_p_core_utilization && d.cpu_p_core_utilization.length > 0)
      .map(d => ({
        x: d.relative_time_seconds,
        y: d.cpu_p_core_utilization!.reduce((sum, val) => sum + val, 0) / d.cpu_p_core_utilization!.length
      }));
    
    if (modelBPCoreData.length > 0) {
      datasets.push({
        label: 'Model B - P-Cores Avg',
        data: modelBPCoreData,
        borderColor: '#9333ea', // Darker purple for Model B P-cores
        backgroundColor: 'rgba(147, 51, 234, 0.05)',
        borderWidth: 1.5,
        borderDash: [3, 3],
        pointRadius: 0,
        pointHoverRadius: 3,
        fill: false,
        tension: 0.1,
      });
    }
    
    // Model B E-Core Average (if available)
    const modelBECoreData = modelBData
      .filter(d => d.cpu_e_core_utilization && d.cpu_e_core_utilization.length > 0)
      .map(d => ({
        x: d.relative_time_seconds,
        y: d.cpu_e_core_utilization!.reduce((sum, val) => sum + val, 0) / d.cpu_e_core_utilization!.length
      }));
    
    if (modelBECoreData.length > 0) {
      datasets.push({
        label: 'Model B - E-Cores Avg',
        data: modelBECoreData,
        borderColor: '#c026d3', // Magenta-purple for Model B E-cores
        backgroundColor: 'rgba(192, 38, 211, 0.05)',
        borderWidth: 1.5,
        borderDash: [5, 2],
        pointRadius: 0,
        pointHoverRadius: 3,
        fill: false,
        tension: 0.1,
      });
    }
    
    return { datasets };
  }, [modelAData, modelBData]);

  const options = useMemo(() => ({
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
        max: 100, // CPU utilization goes from 0-100%
        title: {
          display: true,
          text: 'CPU Utilization (%)',
        },
        ticks: {
          font: {
            size: 10,
          },
          callback: function(value: any) {
            return value + '%';
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
            size: 9,
          },
          padding: 6,
          usePointStyle: true,
        },
      },
      tooltip: {
        callbacks: {
          label: function(context: any) {
            const utilization = context.parsed.y;
            return `${context.dataset.label}: ${utilization.toFixed(1)}%`;
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
      customOptions={options}
      emptyMessage="No CPU utilization data available for comparison"
    />
  );
};
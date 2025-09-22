import React, { useMemo } from 'react';
import { BaseChartJS } from './base/BaseChartJS';
import type { TelemetryDataPointWithRelativeTime } from '../../../types/telemetry';

interface LiveOverlayCorrelationChartsProps {
  modelAData: TelemetryDataPointWithRelativeTime[];
  modelBData: TelemetryDataPointWithRelativeTime[];
  height?: number;
}

export const TPSvsCPUTempOverlayChart: React.FC<LiveOverlayCorrelationChartsProps> = ({ 
  modelAData, 
  modelBData, 
  height = 180 
}) => {
  const chartData = useMemo(() => {
    const datasets = [];
    
    // Model A TPS vs CPU Temperature data
    const modelAValidData = modelAData.filter(d => d.tps !== null && d.cpu_temp_avg !== null);
    if (modelAValidData.length > 0) {
      datasets.push({
        label: 'Model A',
        data: modelAValidData.map(d => ({
          x: d.cpu_temp_avg!,
          y: d.tps!,
        })),
        backgroundColor: 'rgba(34, 197, 94, 0.6)', // Green for Model A
        borderColor: 'rgba(34, 197, 94, 0.8)',
        borderWidth: 1,
        pointRadius: 3,
        pointHoverRadius: 5,
      });
    }
    
    // Model B TPS vs CPU Temperature data
    const modelBValidData = modelBData.filter(d => d.tps !== null && d.cpu_temp_avg !== null);
    if (modelBValidData.length > 0) {
      datasets.push({
        label: 'Model B',
        data: modelBValidData.map(d => ({
          x: d.cpu_temp_avg!,
          y: d.tps!,
        })),
        backgroundColor: 'rgba(168, 85, 247, 0.6)', // Purple for Model B
        borderColor: 'rgba(168, 85, 247, 0.8)',
        borderWidth: 1,
        pointRadius: 3,
        pointHoverRadius: 5,
      });
    }
    
    return { datasets };
  }, [modelAData, modelBData]);

  const options = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: 0,
    },
    scales: {
      x: {
        title: {
          display: true,
          text: 'CPU Temperature (°C)',
        },
        ticks: {
          font: {
            size: 10,
          },
        },
      },
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: 'TPS',
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
          padding: 8,
          usePointStyle: true,
        },
      },
      tooltip: {
        callbacks: {
          label: function(context: any) {
            return `${context.dataset.label}: Temp: ${context.parsed.x.toFixed(1)}°C, TPS: ${context.parsed.y.toFixed(2)}`;
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
      emptyMessage="No TPS/Temperature data for comparison"
      chartType="scatter"
    />
  );
};

export const TPSvsPowerOverlayChart: React.FC<LiveOverlayCorrelationChartsProps> = ({ 
  modelAData, 
  modelBData, 
  height = 180 
}) => {
  const chartData = useMemo(() => {
    const datasets = [];
    
    // Model A TPS vs CPU Power data
    const modelAValidData = modelAData.filter(d => d.tps !== null && d.cpu_power !== null);
    if (modelAValidData.length > 0) {
      datasets.push({
        label: 'Model A',
        data: modelAValidData.map(d => ({
          x: d.cpu_power!,
          y: d.tps!,
        })),
        backgroundColor: 'rgba(34, 197, 94, 0.6)', // Green for Model A
        borderColor: 'rgba(34, 197, 94, 0.8)',
        borderWidth: 1,
        pointRadius: 3,
        pointHoverRadius: 5,
      });
    }
    
    // Model B TPS vs CPU Power data
    const modelBValidData = modelBData.filter(d => d.tps !== null && d.cpu_power !== null);
    if (modelBValidData.length > 0) {
      datasets.push({
        label: 'Model B',
        data: modelBValidData.map(d => ({
          x: d.cpu_power!,
          y: d.tps!,
        })),
        backgroundColor: 'rgba(168, 85, 247, 0.6)', // Purple for Model B
        borderColor: 'rgba(168, 85, 247, 0.8)',
        borderWidth: 1,
        pointRadius: 3,
        pointHoverRadius: 5,
      });
    }
    
    return { datasets };
  }, [modelAData, modelBData]);

  const options = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: 0,
    },
    scales: {
      x: {
        title: {
          display: true,
          text: 'CPU Power (W)',
        },
        ticks: {
          font: {
            size: 10,
          },
        },
      },
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: 'TPS',
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
          padding: 8,
          usePointStyle: true,
        },
      },
      tooltip: {
        callbacks: {
          label: function(context: any) {
            return `${context.dataset.label}: Power: ${context.parsed.x.toFixed(2)}W, TPS: ${context.parsed.y.toFixed(2)}`;
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
      emptyMessage="No TPS/Power data for comparison"
      chartType="scatter"
    />
  );
};

export const TPSvsMemoryOverlayChart: React.FC<LiveOverlayCorrelationChartsProps> = ({ 
  modelAData, 
  modelBData, 
  height = 180 
}) => {
  const chartData = useMemo(() => {
    const datasets = [];
    
    // Model A TPS vs Memory Usage data
    const modelAValidData = modelAData.filter(d => d.tps !== null && d.ram_usage !== null);
    if (modelAValidData.length > 0) {
      datasets.push({
        label: 'Model A',
        data: modelAValidData.map(d => ({
          x: d.ram_usage!,
          y: d.tps!,
        })),
        backgroundColor: 'rgba(34, 197, 94, 0.6)', // Green for Model A
        borderColor: 'rgba(34, 197, 94, 0.8)',
        borderWidth: 1,
        pointRadius: 3,
        pointHoverRadius: 5,
      });
    }
    
    // Model B TPS vs Memory Usage data
    const modelBValidData = modelBData.filter(d => d.tps !== null && d.ram_usage !== null);
    if (modelBValidData.length > 0) {
      datasets.push({
        label: 'Model B',
        data: modelBValidData.map(d => ({
          x: d.ram_usage!,
          y: d.tps!,
        })),
        backgroundColor: 'rgba(168, 85, 247, 0.6)', // Purple for Model B
        borderColor: 'rgba(168, 85, 247, 0.8)',
        borderWidth: 1,
        pointRadius: 3,
        pointHoverRadius: 5,
      });
    }
    
    return { datasets };
  }, [modelAData, modelBData]);

  const options = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: 0,
    },
    scales: {
      x: {
        title: {
          display: true,
          text: 'Memory Usage (GB)',
        },
        ticks: {
          font: {
            size: 10,
          },
        },
      },
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: 'TPS',
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
          padding: 8,
          usePointStyle: true,
        },
      },
      tooltip: {
        callbacks: {
          label: function(context: any) {
            return `${context.dataset.label}: Memory: ${context.parsed.x.toFixed(2)}GB, TPS: ${context.parsed.y.toFixed(2)}`;
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
      emptyMessage="No TPS/Memory data for comparison"
      chartType="scatter"
    />
  );
};
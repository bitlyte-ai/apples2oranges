import React, { useMemo, useRef } from 'react';
import { BaseChartJS } from './base/BaseChartJS';
import type { TelemetryDataPointWithRelativeTime } from '../../../types/telemetry';
import { useResponsiveChart } from '../../../hooks/useChartContainer';

interface LiveOverlayTPSChartProps {
  modelAData: TelemetryDataPointWithRelativeTime[];
  modelBData: TelemetryDataPointWithRelativeTime[];
  height?: number;
}

export const LiveOverlayTPSChart: React.FC<LiveOverlayTPSChartProps> = ({
  modelAData,
  modelBData,
  height = 128
}) => {
  const { containerRef, chartRef } = useResponsiveChart(height);
  const chartInstanceRef = useRef<any | null>(null);

  const chartData = useMemo(() => {
    const datasets = [];
    
    // Model A TPS dataset (moving average)
    const modelATpsData = modelAData
      .filter(d => d.tps !== null)
      .map(d => ({ x: d.relative_time_seconds, y: d.tps! }));
    
    if (modelATpsData.length > 0) {
      datasets.push({
        label: 'Model A - TPS (Avg)',
        data: modelATpsData,
        borderColor: '#10b981', // Green for Model A
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        borderWidth: 2,
        tension: 0.1,
        pointRadius: 0,
        pointHoverRadius: 4,
      });
    }
    
    // Model A Instantaneous TPS dataset
    const modelAInstantTpsData = modelAData
      .filter(d => d.instantaneous_tps !== null)
      .map(d => ({ x: d.relative_time_seconds, y: d.instantaneous_tps! }));
    
    if (modelAInstantTpsData.length > 0) {
      datasets.push({
        label: 'Model A - TPS (Instant)',
        data: modelAInstantTpsData,
        borderColor: '#22c55e', // Lighter green for Model A instant
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        borderWidth: 1,
        borderDash: [3, 3], // Dashed line for instantaneous
        tension: 0.1,
        pointRadius: 0,
        pointHoverRadius: 4,
      });
    }
    
    // Model B TPS dataset (moving average)
    const modelBTpsData = modelBData
      .filter(d => d.tps !== null)
      .map(d => ({ x: d.relative_time_seconds, y: d.tps! }));
    
    if (modelBTpsData.length > 0) {
      datasets.push({
        label: 'Model B - TPS (Avg)',
        data: modelBTpsData,
        borderColor: '#8b5cf6', // Purple for Model B
        backgroundColor: 'rgba(139, 92, 246, 0.1)',
        borderWidth: 2,
        tension: 0.1,
        pointRadius: 0,
        pointHoverRadius: 4,
      });
    }
    
    // Model B Instantaneous TPS dataset
    const modelBInstantTpsData = modelBData
      .filter(d => d.instantaneous_tps !== null)
      .map(d => ({ x: d.relative_time_seconds, y: d.instantaneous_tps! }));
    
    if (modelBInstantTpsData.length > 0) {
      datasets.push({
        label: 'Model B - TPS (Instant)',
        data: modelBInstantTpsData,
        borderColor: '#a855f7', // Lighter purple for Model B instant
        backgroundColor: 'rgba(168, 85, 247, 0.1)',
        borderWidth: 1,
        borderDash: [3, 3], // Dashed line for instantaneous
        tension: 0.1,
        pointRadius: 0,
        pointHoverRadius: 4,
      });
    }
    
    return { datasets };
  }, [modelAData, modelBData]);

  const customOptions = useMemo(() => ({
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
          text: 'Tokens/Second',
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
            return `${context.dataset.label}: ${context.parsed.y.toFixed(2)} TPS`;
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
    <div
      ref={containerRef}
      style={{
        height,
        width: '100%',
        maxWidth: '100%',
        minWidth: 0,
        overflow: 'hidden'
      }}
    >
      <BaseChartJS
        data={chartData}
        height={height}
        customOptions={customOptions}
        emptyMessage="No TPS data available"
        useResponsive={true}
        onChartRef={(ref) => {
          chartInstanceRef.current = ref;
          if (ref) chartRef(ref as any);
        }}
      />
    </div>
  );
};
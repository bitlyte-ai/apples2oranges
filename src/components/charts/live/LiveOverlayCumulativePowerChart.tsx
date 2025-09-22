import React, { useMemo } from 'react';
import type { TelemetryDataPointWithRelativeTime } from '../../../types/telemetry';
import { BaseChartJS } from './base/BaseChartJS';
import { CHART_COLORS, BORDER_DASH_PATTERNS, BORDER_WIDTHS } from './base/ChartConfig';

interface LiveOverlayCumulativePowerChartProps {
  modelAData: TelemetryDataPointWithRelativeTime[];
  modelBData: TelemetryDataPointWithRelativeTime[];
  height?: number;
}

export const LiveOverlayCumulativePowerChart: React.FC<LiveOverlayCumulativePowerChartProps> = ({
  modelAData,
  modelBData,
  height = 128
}) => {
  // Follow exact pattern from LiveOverlayPowerChart.tsx
  const datasets = useMemo(() => {
    const datasets = [];

    // Model A datasets - following exact LiveOverlayPowerChart pattern

    // Model A Total Energy
    const modelATotalData = modelAData
      .filter(d => d.total_energy_wh !== null)
      .map(d => ({ x: d.relative_time_seconds, y: d.total_energy_wh! }));

    if (modelATotalData.length > 0) {
      datasets.push({
        label: 'Model A - Total Energy',
        data: modelATotalData,
        borderColor: CHART_COLORS.modelA.primary,
        backgroundColor: CHART_COLORS.modelA.primaryBg,
        borderWidth: BORDER_WIDTHS.primary,
        tension: 0.1,
        pointRadius: 0,
        pointHoverRadius: 4,
      });
    }

    // Model A CPU Energy
    const modelACpuEnergyData = modelAData
      .filter(d => d.cpu_energy_wh !== null)
      .map(d => ({ x: d.relative_time_seconds, y: d.cpu_energy_wh! }));

    if (modelACpuEnergyData.length > 0) {
      datasets.push({
        label: 'Model A - CPU Energy',
        data: modelACpuEnergyData,
        borderColor: CHART_COLORS.modelA.secondary,
        backgroundColor: CHART_COLORS.modelA.secondaryBg,
        borderWidth: BORDER_WIDTHS.secondary,
        borderDash: [2, 2],
        tension: 0.1,
        pointRadius: 0,
        pointHoverRadius: 4,
      });
    }

    // Model A GPU Energy
    const modelAGpuEnergyData = modelAData
      .filter(d => d.gpu_energy_wh !== null)
      .map(d => ({ x: d.relative_time_seconds, y: d.gpu_energy_wh! }));

    if (modelAGpuEnergyData.length > 0) {
      datasets.push({
        label: 'Model A - GPU Energy',
        data: modelAGpuEnergyData,
        borderColor: CHART_COLORS.modelA.tertiary,
        backgroundColor: CHART_COLORS.modelA.tertiaryBg,
        borderWidth: BORDER_WIDTHS.secondary,
        borderDash: BORDER_DASH_PATTERNS.gpu,
        tension: 0.1,
        pointRadius: 0,
        pointHoverRadius: 4,
      });
    }

    // Model A ANE Energy  
    const modelAAneEnergyData = modelAData
      .filter(d => d.ane_energy_wh !== null)
      .map(d => ({ x: d.relative_time_seconds, y: d.ane_energy_wh! }));

    if (modelAAneEnergyData.length > 0) {
      datasets.push({
        label: 'Model A - ANE Energy',
        data: modelAAneEnergyData,
        borderColor: CHART_COLORS.modelA.quaternary,
        backgroundColor: CHART_COLORS.modelA.quaternaryBg,
        borderWidth: BORDER_WIDTHS.secondary,
        borderDash: [4, 2],
        tension: 0.1,
        pointRadius: 0,
        pointHoverRadius: 4,
      });
    }

    // Model B datasets - mirror pattern with Model B colors

    // Model B Total Energy
    const modelBTotalData = modelBData
      .filter(d => d.total_energy_wh !== null)
      .map(d => ({ x: d.relative_time_seconds, y: d.total_energy_wh! }));

    if (modelBTotalData.length > 0) {
      datasets.push({
        label: 'Model B - Total Energy',
        data: modelBTotalData,
        borderColor: CHART_COLORS.modelB.primary,
        backgroundColor: CHART_COLORS.modelB.primaryBg,
        borderWidth: BORDER_WIDTHS.primary,
        tension: 0.1,
        pointRadius: 0,
        pointHoverRadius: 4,
      });
    }

    // Model B CPU Energy
    const modelBCpuEnergyData = modelBData
      .filter(d => d.cpu_energy_wh !== null)
      .map(d => ({ x: d.relative_time_seconds, y: d.cpu_energy_wh! }));

    if (modelBCpuEnergyData.length > 0) {
      datasets.push({
        label: 'Model B - CPU Energy',
        data: modelBCpuEnergyData,
        borderColor: CHART_COLORS.modelB.secondary,
        backgroundColor: CHART_COLORS.modelB.secondaryBg,
        borderWidth: BORDER_WIDTHS.secondary,
        borderDash: [2, 2],
        tension: 0.1,
        pointRadius: 0,
        pointHoverRadius: 4,
      });
    }

    // Model B GPU Energy
    const modelBGpuEnergyData = modelBData
      .filter(d => d.gpu_energy_wh !== null)
      .map(d => ({ x: d.relative_time_seconds, y: d.gpu_energy_wh! }));

    if (modelBGpuEnergyData.length > 0) {
      datasets.push({
        label: 'Model B - GPU Energy',
        data: modelBGpuEnergyData,
        borderColor: CHART_COLORS.modelB.tertiary,
        backgroundColor: CHART_COLORS.modelB.tertiaryBg,
        borderWidth: BORDER_WIDTHS.secondary,
        borderDash: BORDER_DASH_PATTERNS.gpu,
        tension: 0.1,
        pointRadius: 0,
        pointHoverRadius: 4,
      });
    }

    // Model B ANE Energy
    const modelBAneEnergyData = modelBData
      .filter(d => d.ane_energy_wh !== null)
      .map(d => ({ x: d.relative_time_seconds, y: d.ane_energy_wh! }));

    if (modelBAneEnergyData.length > 0) {
      datasets.push({
        label: 'Model B - ANE Energy',
        data: modelBAneEnergyData,
        borderColor: CHART_COLORS.modelB.quaternary,
        backgroundColor: CHART_COLORS.modelB.quaternaryBg,
        borderWidth: BORDER_WIDTHS.secondary,
        borderDash: [4, 2],
        tension: 0.1,
        pointRadius: 0,
        pointHoverRadius: 4,
      });
    }

    return datasets;
  }, [modelAData, modelBData]);

  // Follow exact options pattern from LiveOverlayPowerChart.tsx
  const options = useMemo(() => ({
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
          text: 'Cumulative Energy (Wh)',
        },
        ticks: {
          callback: function(value: any) {
            return `${value.toFixed(3)}Wh`;
          },
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
            return `${context.dataset.label}: ${context.parsed.y.toFixed(4)}Wh`;
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
      emptyMessage="No energy consumption data available"
      useResponsive={true}
    />
  );
};
import React, { useMemo } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import type { TelemetryDataPointWithRelativeTime } from '../../../types/telemetry';


ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface LiveOverlaySmallMultiplesCPUChartProps {
  modelAData: TelemetryDataPointWithRelativeTime[];
  modelBData: TelemetryDataPointWithRelativeTime[];
  height?: number;
}

interface CoreChartData {
  id: string;
  label: string;
  type: 'Performance' | 'Efficiency';
  modelAData: { x: number; y: number }[];
  modelBData: { x: number; y: number }[];
  coreIndex: number;
}

export const LiveOverlaySmallMultiplesCPUChart: React.FC<LiveOverlaySmallMultiplesCPUChartProps> = ({ 
  modelAData, 
  modelBData, 
  height = 400 
}) => {
  const { coreChartsData, timeRange } = useMemo(() => {
    // Find the maximum time range across both models for consistent x-axis
    const allTimes = [
      ...modelAData.map(d => d.relative_time_seconds),
      ...modelBData.map(d => d.relative_time_seconds)
    ];
    const maxTime = allTimes.length > 0 ? Math.max(...allTimes) : 0;
    const minTime = allTimes.length > 0 ? Math.min(...allTimes) : 0;

    // Determine core configuration from the first available data point
    const sampleModelA = modelAData.find(d => 
      (d.cpu_p_core_utilization && d.cpu_p_core_utilization.length > 0) ||
      (d.cpu_e_core_utilization && d.cpu_e_core_utilization.length > 0)
    );
    
    const sampleModelB = modelBData.find(d => 
      (d.cpu_p_core_utilization && d.cpu_p_core_utilization.length > 0) ||
      (d.cpu_e_core_utilization && d.cpu_e_core_utilization.length > 0)
    );

    // Use the sample with more cores or fallback to the available one
    const sample = (sampleModelA && sampleModelB) 
      ? ((sampleModelA.cpu_p_core_utilization?.length || 0) + (sampleModelA.cpu_e_core_utilization?.length || 0) >= 
         (sampleModelB.cpu_p_core_utilization?.length || 0) + (sampleModelB.cpu_e_core_utilization?.length || 0)
         ? sampleModelA : sampleModelB)
      : sampleModelA || sampleModelB;

    if (!sample) {
      return { coreChartsData: [], timeRange: { minTime, maxTime } };
    }

    const pCoreCount = sample.cpu_p_core_utilization?.length || 0;
    const eCoreCount = sample.cpu_e_core_utilization?.length || 0;

    const coreChartsData: CoreChartData[] = [];

    // Create data for P-cores
    for (let i = 0; i < pCoreCount; i++) {
      const modelAUtilData = modelAData
        .filter(d => d.cpu_p_core_utilization && d.cpu_p_core_utilization[i] !== undefined)
        .map(d => ({
          x: d.relative_time_seconds,
          y: d.cpu_p_core_utilization![i],
        }));

      const modelBUtilData = modelBData
        .filter(d => d.cpu_p_core_utilization && d.cpu_p_core_utilization[i] !== undefined)
        .map(d => ({
          x: d.relative_time_seconds,
          y: d.cpu_p_core_utilization![i],
        }));

      coreChartsData.push({
        id: `p-core-${i}`,
        label: `P-Core ${i + 1}`,
        type: 'Performance',
        modelAData: modelAUtilData,
        modelBData: modelBUtilData,
        coreIndex: i,
      });
    }

    // Create data for E-cores
    for (let i = 0; i < eCoreCount; i++) {
      const modelAUtilData = modelAData
        .filter(d => d.cpu_e_core_utilization && d.cpu_e_core_utilization[i] !== undefined)
        .map(d => ({
          x: d.relative_time_seconds,
          y: d.cpu_e_core_utilization![i],
        }));

      const modelBUtilData = modelBData
        .filter(d => d.cpu_e_core_utilization && d.cpu_e_core_utilization[i] !== undefined)
        .map(d => ({
          x: d.relative_time_seconds,
          y: d.cpu_e_core_utilization![i],
        }));

      coreChartsData.push({
        id: `e-core-${i}`,
        label: `E-Core ${i + 1}`,
        type: 'Efficiency',
        modelAData: modelAUtilData,
        modelBData: modelBUtilData,
        coreIndex: i,
      });
    }

    return { coreChartsData, timeRange: { minTime, maxTime } };
  }, [modelAData, modelBData]);

  // Calculate grid layout
  const totalCores = coreChartsData.length;
  const cols = Math.min(2, totalCores); // Maximum 2 columns
  const rows = Math.ceil(totalCores / cols);
  
  // Individual chart height based on total height and number of rows
  // Account for gaps, titles, and shared axis labels
  const gapSize = 8; // gap between charts
  const titleHeight = 24; // space for chart titles
  const sharedLabelsHeight = 30; // space for shared axis labels
  const availableHeight = height - sharedLabelsHeight - (rows - 1) * gapSize;
  const chartHeight = Math.max(60, (availableHeight - rows * titleHeight) / rows);

  const createChartOptions = (_core: CoreChartData) => ({
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
        min: timeRange.minTime,
        max: timeRange.maxTime,
        title: {
          display: false,
        },
        ticks: {
          font: {
            size: 8,
          },
          maxTicksLimit: 4,
          callback: function(value: any) {
            return value.toFixed(1) + 's';
          },
        },
        grid: {
          display: true,
          color: 'rgba(0, 0, 0, 0.05)',
        },
      },
      y: {
        beginAtZero: true,
        max: 100,
        title: {
          display: false,
        },
        ticks: {
          font: {
            size: 8,
          },
          maxTicksLimit: 4,
          callback: function(value: any) {
            return value + '%';
          },
        },
        grid: {
          display: true,
          color: 'rgba(0, 0, 0, 0.05)',
        },
      },
    },
    plugins: {
      legend: {
        display: true,
        position: 'bottom' as const,
        labels: {
          font: {
            size: 7,
          },
          padding: 2,
          usePointStyle: true,
          boxHeight: 4,
          boxWidth: 4,
        },
      },
      tooltip: {
        callbacks: {
          label: function(context: any) {
            const utilization = context.parsed.y;
            const modelLabel = context.dataset.label;
            return `${modelLabel}: ${utilization.toFixed(1)}%`;
          },
          title: function(context: any) {
            const timeSeconds = context[0]?.parsed?.x;
            return timeSeconds !== undefined ? `Time: ${timeSeconds.toFixed(1)}s` : '';
          },
        },
      },
    },
  });

  const createChartData = (core: CoreChartData) => {
    const datasets = [];
    
    // Model A dataset
    if (core.modelAData.length > 0) {
      datasets.push({
        label: 'Model A',
        data: core.modelAData,
        borderColor: core.type === 'Performance' ? '#22c55e' : '#16a34a', // Green variants for Model A
        backgroundColor: core.type === 'Performance' 
          ? 'rgba(34, 197, 94, 0.1)' 
          : 'rgba(22, 163, 74, 0.1)',
        borderWidth: 1.5,
        pointRadius: 0,
        pointHoverRadius: 2,
        fill: 'origin',
        tension: 0.1,
      });
    }

    // Model B dataset
    if (core.modelBData.length > 0) {
      datasets.push({
        label: 'Model B',
        data: core.modelBData,
        borderColor: core.type === 'Performance' ? '#a855f7' : '#9333ea', // Purple variants for Model B
        backgroundColor: core.type === 'Performance' 
          ? 'rgba(168, 85, 247, 0.1)' 
          : 'rgba(147, 51, 234, 0.1)',
        borderWidth: 1.5,
        pointRadius: 0,
        pointHoverRadius: 2,
        fill: false, // Don't fill Model B to avoid overlap
        tension: 0.1,
      });
    }
    
    return { datasets };
  };

  if (coreChartsData.length === 0) {
    return (
      <div 
        className="bg-gray-50 rounded border-2 border-dashed border-gray-300 flex items-center justify-center" 
        style={{ height }}
      >
        <span className="text-gray-500 text-sm">No per-core CPU utilization data available for comparison</span>
      </div>
    );
  }

  return (
    <div className="w-full overflow-hidden" style={{ height, maxWidth: '100%' }}>
      <div
        className="grid"
        style={{
          gridTemplateColumns: `repeat(${cols}, 1fr)`,
          gap: `${gapSize}px`,
          height: `calc(100% - ${sharedLabelsHeight}px)`,
          width: '100%',
          maxWidth: '100%'
        }}
      >
        {coreChartsData.map((core) => (
          <div key={core.id} className="relative w-full overflow-hidden" style={{ maxWidth: '100%' }}>
            {/* Chart title */}
            <div className="absolute top-0 left-0 right-0 z-10 pointer-events-none px-1 py-1">
              <span className={`text-xs font-medium px-1 py-0.5 rounded text-center block ${
                core.type === 'Performance'
                  ? 'bg-red-100 text-red-800'
                  : 'bg-blue-100 text-blue-800'
              }`}>
                {core.label} — {core.type}
              </span>
            </div>

            {/* Chart container */}
            <div style={{
              height: chartHeight,
              paddingTop: `${titleHeight}px`,
              width: '100%',
              maxWidth: '100%',
              overflow: 'hidden'
            }}>
              <Line
                data={createChartData(core)}
                options={createChartOptions(core)}
              />
            </div>
          </div>
        ))}
        
        {/* Fill empty grid cells if needed */}
        {Array.from({ length: (cols * rows) - totalCores }).map((_, index) => (
          <div key={`empty-${index}`} />
        ))}
      </div>
      
      {/* Shared axis labels */}
      <div className="mt-2 text-center">
        <span className="text-xs text-gray-500">Time (seconds) — Model A vs Model B Comparison</span>
      </div>
    </div>
  );
};
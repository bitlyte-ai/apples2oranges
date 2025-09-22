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
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import type { TelemetrySession } from '../../../types/telemetry';
import { MultiSessionChartWrapper } from './MultiSessionChartWrapper';
import { MULTI_SESSION_COLORS } from './base/PlotlyThemes';

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

interface MultiSessionTPSChartProps {
  sessions: TelemetrySession[];
  height?: number;
}

export const MultiSessionTPSChart: React.FC<MultiSessionTPSChartProps> = ({
  sessions,
  height = 400,
}) => {
  return (
    <MultiSessionChartWrapper
      sessions={sessions}
      title="TPS Comparison"
      height={height}
    >
      {({ normalizedData, sessionMetadata, sessions }) => {
        // Helper to convert hex "#rrggbb" to rgba with alpha for backgrounds
        const hexToRgba = (hex: string, alpha: number) => {
          const sanitized = hex.replace('#', '');
          const bigint = parseInt(sanitized, 16);
          const r = (bigint >> 16) & 255;
          const g = (bigint >> 8) & 255;
          const b = bigint & 255;
          return `rgba(${r}, ${g}, ${b}, ${alpha})`;
        };

        const chartData = useMemo(() => {
          const datasets: any[] = [];

          normalizedData.forEach((sessionData, sIdx) => {
            const session = sessions[sIdx];
            const modelDisplay = (m: 'A' | 'B'): string => {
              const raw = m === 'A' ? session?.model_info?.model_a : session?.model_info?.model_b;
              const short = raw ? raw.split('/').pop() : undefined;
              return short || `Model ${m}`;
            };

            const byModel: Record<string, { x: number; y: number }[]> = {};
            sessionData.forEach(d => {
              if (d.tps === null) return;
              const key = (d.model || 'Unknown').toString();
              if (!byModel[key]) byModel[key] = [];
              byModel[key].push({ x: d.timestamp, y: d.tps! });
            });

            Object.entries(byModel).forEach(([modelKey, points], localIdx) => {
              const colorIndex = (sIdx * 2 + localIdx) % MULTI_SESSION_COLORS.length;
              const base = MULTI_SESSION_COLORS[colorIndex];
              const labelModel = modelKey === 'A' || modelKey === 'B' ? modelDisplay(modelKey as 'A' | 'B') : modelKey;
              const label = `${sessionMetadata[sIdx].name} — ${labelModel}`;

              datasets.push({
                label,
                data: points,
                borderColor: base,
                backgroundColor: hexToRgba(base, 0.12),
                borderWidth: 2,
                tension: 0.1,
                pointRadius: 1,
                pointHoverRadius: 4,
              });
            });
          });

          return { datasets };
        }, [normalizedData, sessionMetadata, sessions]);

        const options = useMemo(() => ({
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            x: {
              type: 'linear' as const,
              title: {
                display: true,
                text: 'Time (seconds)',
              },
              ticks: {
                callback: function(value: any) {
                  return `${value}s`;
                },
              },
            },
            y: {
              beginAtZero: true,
              title: {
                display: true,
                text: 'Tokens per Second',
              },
            },
          },
          plugins: {
            legend: {
              display: true,
              position: 'top' as const,
            },
            tooltip: {
              mode: 'index' as const,
              intersect: false,
              callbacks: {
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
          <div style={{ height }}>
            <Line data={chartData} options={options} />
          </div>
        );
      }}
    </MultiSessionChartWrapper>
  );
};

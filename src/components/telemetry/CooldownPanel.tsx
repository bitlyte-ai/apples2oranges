import React, { useMemo } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
} from 'chart.js';
import { useTelemetryStore } from '../../stores/telemetryStore';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend);

export const CooldownPanel: React.FC = () => {
  const {
    cooldownActive,
    cooldownStatus,
    cooldownBaselineC,
    cooldownThresholdC,
    cooldownPoints,
    cooldownMarginC,
  } = useTelemetryStore();

  const isVisible = cooldownActive || cooldownStatus === 'progress' || cooldownStatus === 'started' || cooldownStatus === 'complete';

  const { labels, datasets } = useMemo(() => {
    const haveMeta = cooldownBaselineC !== null && cooldownThresholdC !== null && cooldownBaselineC !== undefined && cooldownThresholdC !== undefined;
    const hasPoints = cooldownPoints.length > 0;
    const length = hasPoints ? cooldownPoints.length : (haveMeta ? 2 : 0);
    const labels = Array.from({ length }, (_, idx) => `${idx}s`);

    const current = hasPoints ? cooldownPoints.map(p => p.value) : [];
    const baseline = haveMeta && length > 0 ? Array.from({ length }, () => cooldownBaselineC as number) : [];
    const threshold = haveMeta && length > 0 ? Array.from({ length }, () => cooldownThresholdC as number) : [];

    return {
      labels,
      datasets: [
        {
          label: 'Current Max CPU Temp (°C)',
          data: current,
          borderColor: 'rgb(59, 130, 246)', // blue-500
          backgroundColor: 'rgba(59, 130, 246, 0.2)',
          tension: 0.25,
          pointRadius: 0,
        },
        ...(baseline.length > 0 ? [{
          label: 'Baseline (°C)',
          data: baseline,
          borderColor: 'rgb(16, 185, 129)', // emerald-500
          borderDash: [6, 6],
          pointRadius: 0,
        } as any] : []),
        ...(threshold.length > 0 ? [{
          label: `Threshold (baseline + ${cooldownMarginC.toFixed(1)}°C)`,
          data: threshold,
          borderColor: 'rgb(234, 88, 12)', // orange-600
          borderDash: [6, 6],
          pointRadius: 0,
        } as any] : []),
      ],
    };
  }, [cooldownPoints, cooldownBaselineC, cooldownThresholdC, cooldownMarginC]);

  if (!isVisible) return null;

  return (
    <div className="border rounded-lg p-3 bg-white">
      {cooldownStatus !== 'complete' && (
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 min-w-0">
            <svg className={`w-4 h-4 ${cooldownStatus === 'progress' ? 'animate-spin text-blue-500' : 'text-gray-400'}`} viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
            </svg>
            <span className="text-sm font-medium text-gray-800">
              {cooldownStatus === 'started' ? 'Waiting for A…' : 'Cooling down…'}
            </span>
          </div>
          <div className="text-xs text-gray-500 flex flex-wrap gap-x-3 gap-y-1 justify-end">
            {cooldownBaselineC !== null && cooldownThresholdC !== null && (
              <>
                <span className="whitespace-nowrap">Baseline: {cooldownBaselineC?.toFixed(1)}°C</span>
                <span className="hidden sm:inline text-gray-400">•</span>
                <span className="whitespace-nowrap">Threshold: {cooldownThresholdC?.toFixed(1)}°C</span>
                {cooldownPoints.length > 0 && (
                  <>
                    <span className="hidden sm:inline text-gray-400">•</span>
                    <span className="whitespace-nowrap">Current: {cooldownPoints[cooldownPoints.length - 1].value.toFixed(1)}°C</span>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {cooldownStatus === 'complete' ? (
        <div className="h-48 flex items-center justify-center">
          <div className="text-sm font-medium text-gray-700 text-center">Threshold reached.</div>
        </div>
      ) : (
        <div className="h-48">
          <Line
          data={{ labels, datasets: datasets.map(ds => ({
            ...ds,
            tension: 0.1,
            pointRadius: 0,
            pointStyle: 'circle',
            borderWidth: ds.label?.includes('Current') ? 2 : (ds.borderWidth ?? 2),
          })) }}
          options={{
            responsive: true,
            maintainAspectRatio: false,
            animation: { duration: 0 },
            plugins: {
              legend: { display: true, position: 'top', labels: { usePointStyle: true, boxWidth: 6, boxHeight: 6, font: { size: 10 } } },
              tooltip: { enabled: true, mode: 'index', intersect: false },
            },
            interaction: { mode: 'nearest', axis: 'x', intersect: false },
            scales: {
              x: { grid: { display: false }, ticks: { display: true, maxTicksLimit: 8, font: { size: 10 } } },
              y: { grid: { display: true }, ticks: { display: true, font: { size: 10 } }, title: { display: true, text: '°C' } },
            },
          }}
          />
        </div>
      )}
    </div>
  );
};

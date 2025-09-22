import React, { useState } from 'react';
import { ChartModal, ChartModalData } from './ChartModal';
import type { TelemetryDataPointWithRelativeTime } from '../../types/telemetry';

interface SelectableChartProps {
  children: React.ReactNode;
  chartData: ChartModalData;
  className?: string;
}

export const SelectableChart: React.FC<SelectableChartProps> = ({
  children,
  chartData,
  className = '',
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleChartClick = (e: React.MouseEvent) => {
    // Prevent opening modal if user is trying to interact with chart controls
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('select') || target.closest('input')) {
      return;
    }
    
    // Only open modal if there's actually data to show
    if (chartData.modelAData.length > 0 || chartData.modelBData.length > 0) {
      setIsModalOpen(true);
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  const hasData = chartData.modelAData.length > 0 || chartData.modelBData.length > 0;

  return (
    <>
      <div
        className={`relative group ${hasData ? 'cursor-pointer' : ''} ${className}`}
        onClick={handleChartClick}
      >
        {/* Overlay indicator */}
        {hasData && (
          <div className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <div className="bg-blue-600 text-white px-2 py-1 rounded-md text-xs font-medium shadow-sm flex items-center space-x-1">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
              </svg>
              <span>Expand</span>
            </div>
          </div>
        )}
        
        {/* Hover overlay */}
        {hasData && (
          <div className="absolute inset-0 bg-blue-50 opacity-0 group-hover:opacity-10 transition-opacity duration-200 rounded-md pointer-events-none" />
        )}
        
        {children}
      </div>

      <ChartModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        chartData={chartData}
      />
    </>
  );
};

// Helper function to create chart data for specific chart types
export const createChartData = (
  title: string,
  type: ChartModalData['type'],
  modelAData: TelemetryDataPointWithRelativeTime[],
  modelBData: TelemetryDataPointWithRelativeTime[]
): ChartModalData => ({
  title,
  type,
  modelAData,
  modelBData,
});

// Helper function to create correlation chart data
export const createCorrelationChartData = (
  title: string,
  xAxis: 'cpu_temp_avg' | 'cpu_power' | 'ram_usage',
  yAxis: 'tps',
  modelAData: TelemetryDataPointWithRelativeTime[],
  modelBData: TelemetryDataPointWithRelativeTime[]
): ChartModalData => ({
  title,
  type: 'correlation',
  xAxis,
  yAxis,
  modelAData,
  modelBData,
});

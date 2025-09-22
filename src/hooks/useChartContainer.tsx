import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { Chart } from 'chart.js';

/**
 * Dimensions interface for chart container
 */
interface ChartDimensions {
  width: number;
  height: number;
}

/**
 * Enhanced hook for responsive Chart.js components that ensures perfect 1:1
 * container-to-chart responsiveness using ResizeObserver + manual resize calls.
 *
 * This solves Chart.js v4 responsive limitations:
 * - Charts not expanding proportionally with container
 * - Charts not shrinking when container shrinks
 * - Window overflow during chart initialization
 */
export const useResponsiveChart = (targetHeight: number) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<Chart | null>(null);
  const [dimensions, setDimensions] = useState<ChartDimensions>({ width: 0, height: targetHeight });
  const resizeTimeoutRef = useRef<number | undefined>(undefined);

  const updateDimensions = useCallback(() => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const newDimensions = {
        width: Math.floor(rect.width),
        height: targetHeight
      };

      // Only update if dimensions actually changed to prevent unnecessary re-renders
      setDimensions(prev => {
        if (prev.width !== newDimensions.width || prev.height !== newDimensions.height) {
          return newDimensions;
        }
        return prev;
      });
    }
  }, [targetHeight]);

  const debouncedResize = useCallback(() => {
    if (resizeTimeoutRef.current) {
      clearTimeout(resizeTimeoutRef.current);
    }

    resizeTimeoutRef.current = window.setTimeout(() => {
      updateDimensions();

      // Force Chart.js to resize after container dimensions update
      if (chartRef.current) {
        chartRef.current.resize();
      }
    }, 16); // ~60fps debouncing for smooth resizing
  }, [updateDimensions]);

  useEffect(() => {
    // Initial measurement
    updateDimensions();

    // Set up ResizeObserver for container changes
    const resizeObserver = new ResizeObserver(debouncedResize);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      resizeObserver.disconnect();
      if (resizeTimeoutRef.current) {
        window.clearTimeout(resizeTimeoutRef.current);
      }
    };
  }, [debouncedResize, updateDimensions]);

  const setChartInstance = useCallback((chart: Chart | null) => {
    chartRef.current = chart;
  }, []);

  return {
    containerRef,
    chartRef: setChartInstance,
    dimensions,
    // Chart.js options optimized for manual responsive control
    chartOptions: {
      responsive: false, // Disable Chart.js built-in responsive behavior
      maintainAspectRatio: false, // Allow custom sizing
      // Force explicit dimensions
      width: dimensions.width,
      height: dimensions.height,
    }
  };
};

/**
 * Props for responsive chart container wrapper component
 */
export interface ResponsiveChartContainerProps {
  height: number;
  children: React.ReactNode;
  className?: string;
}

/**
 * Responsive chart container component with proper flex constraints
 * that prevents Chart.js v4 shrinking bugs and ensures charts stay within bounds
 */
export const ResponsiveChartContainer: React.FC<ResponsiveChartContainerProps> = ({
  height,
  children,
  className = ''
}) => {
  const { containerRef } = useResponsiveChart(height);

  return (
    <div
      ref={containerRef}
      className={`w-full overflow-hidden ${className}`}
      style={{
        height,
        maxWidth: '100%',
        minWidth: 0, // Override flexbox default to fix Chart.js v4 shrinking bug
        position: 'relative'
      }}
    >
      {children}
    </div>
  );
};
import React, { useMemo } from 'react';
import type { TelemetrySession, TelemetryDataPoint } from '../../../types/telemetry';

// Color palette for up to 7 sessions
export const SESSION_COLORS = [
  { border: '#3B82F6', background: 'rgba(59, 130, 246, 0.1)' }, // Blue
  { border: '#EF4444', background: 'rgba(239, 68, 68, 0.1)' },  // Red
  { border: '#10B981', background: 'rgba(16, 185, 129, 0.1)' }, // Green
  { border: '#F59E0B', background: 'rgba(245, 158, 11, 0.1)' }, // Amber
  { border: '#8B5CF6', background: 'rgba(139, 92, 246, 0.1)' }, // Violet
  { border: '#06B6D4', background: 'rgba(6, 182, 212, 0.1)' },  // Cyan
  { border: '#EC4899', background: 'rgba(236, 72, 153, 0.1)' }, // Pink
];

export interface MultiSessionData {
  sessions: TelemetrySession[];
  normalizedData: TelemetryDataPoint[][];
  sessionMetadata: Array<{
    name: string;
    color: { border: string; background: string };
    startTime: number;
    duration: number;
  }>;
}

/**
 * Normalizes multiple sessions for comparison by:
 * 1. Converting timestamps to relative seconds from session start
 * 2. Handling different session lengths
 * 3. Assigning colors to each session
 */
export const useMultiSessionData = (sessions: TelemetrySession[]): MultiSessionData => {
  return useMemo(() => {
    const validSessions = sessions.slice(0, 7); // Limit to 7 for UI clarity
    
    const normalizedData = validSessions.map(session => {
      const startTime = session.data.length > 0 ? session.data[0].timestamp : 0;
      return session.data.map(point => ({
        ...point,
        timestamp: (point.timestamp - startTime) / 1000, // Convert to relative seconds
      }));
    });

    const sessionMetadata = validSessions.map((session, index) => ({
      name: session.name,
      color: SESSION_COLORS[index % SESSION_COLORS.length],
      startTime: session.data.length > 0 ? session.data[0].timestamp : 0,
      duration: session.summary.duration_ms / 1000, // Convert to seconds
    }));

    return {
      sessions: validSessions,
      normalizedData,
      sessionMetadata,
    };
  }, [sessions]);
};

interface MultiSessionChartWrapperProps {
  sessions: TelemetrySession[];
  title: string;
  children: (data: MultiSessionData) => React.ReactNode;
  height?: number;
}

/**
 * Reusable wrapper component that handles multi-session data preparation
 * and provides a consistent layout for analysis charts
 */
export const MultiSessionChartWrapper: React.FC<MultiSessionChartWrapperProps> = ({
  sessions,
  title,
  children,
  height = 400,
}) => {
  const multiSessionData = useMultiSessionData(sessions);

  if (sessions.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">{title}</h3>
        <div 
          className="bg-gray-50 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center" 
          style={{ height }}
        >
          <div className="text-center">
            <svg className="mx-auto h-12 w-12 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <span className="text-gray-500">No sessions selected for analysis</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-gray-900">{title}</h3>
        <div className="text-sm text-gray-500">
          {sessions.length} session{sessions.length !== 1 ? 's' : ''} selected
        </div>
      </div>
      {children(multiSessionData)}
    </div>
  );
};
import { useState, useCallback, useRef } from 'react';
import type { 
  TelemetryDataPoint, 
  TelemetryDataPointWithRelativeTime, 
  ModelTelemetrySession, 
  OverlayTelemetryData 
} from '../types/telemetry';

interface UseOverlayTelemetryOptions {
  onSessionStart?: (model: 'A' | 'B', sessionId: string) => void;
  onSessionEnd?: (model: 'A' | 'B', sessionId: string) => void;
}

export const useOverlayTelemetry = (options: UseOverlayTelemetryOptions = {}) => {
  const [overlayData, setOverlayData] = useState<OverlayTelemetryData>({
    model_a_sessions: [],
    model_b_sessions: [],
  });

  // Track current turn number for each model to handle multi-turn conversations
  const turnCounterRef = useRef({ A: 1, B: 1 });

  // Track global timeline to ensure continuity across sessions
  const globalTimelineRef = useRef({ 
    A: { lastEndTime: 0, cumulativeSeconds: 0 }, 
    B: { lastEndTime: 0, cumulativeSeconds: 0 } 
  });

  // Generate unique session ID
  const generateSessionId = useCallback((model: 'A' | 'B'): string => {
    return `${model}_session_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  }, []);

  // Start a new telemetry session for a model
  const startModelSession = useCallback((model: 'A' | 'B'): string => {
    const sessionId = generateSessionId(model);
    const currentTime = Date.now();
    
    // Calculate the session offset to maintain timeline continuity
    const sessionOffsetSeconds = globalTimelineRef.current[model].cumulativeSeconds;
    
    const newSession: ModelTelemetrySession = {
      model,
      session_id: sessionId,
      start_timestamp: currentTime,
      data: [],
      is_active: true,
      turn_number: turnCounterRef.current[model],
      session_offset_seconds: sessionOffsetSeconds,
    };

    setOverlayData(prev => {
      // End any existing active session for this model
      const updatedPrev = { ...prev };
      const sessionKey = model === 'A' ? 'model_a_sessions' : 'model_b_sessions';
      const currentKey = model === 'A' ? 'current_session_a' : 'current_session_b';
      
      // Mark previous session as ended if it exists
      if (updatedPrev[currentKey]) {
        updatedPrev[currentKey]!.is_active = false;
        updatedPrev[currentKey]!.end_timestamp = currentTime;
      }

      // Add new session
      const updatedSessions = [...updatedPrev[sessionKey], newSession];
      
      return {
        ...updatedPrev,
        [sessionKey]: updatedSessions,
        [currentKey]: newSession,
      };
    });

    console.log(`🎯 Started telemetry session for Model ${model}: ${sessionId} (turn ${turnCounterRef.current[model]}, offset: ${sessionOffsetSeconds.toFixed(1)}s)`);
    options.onSessionStart?.(model, sessionId);
    
    return sessionId;
  }, [generateSessionId, options.onSessionStart, options.onSessionEnd]);

  // End the current telemetry session for a model
  const endModelSession = useCallback((model: 'A' | 'B') => {
    const currentTime = Date.now();
    
    setOverlayData(prev => {
      const currentKey = model === 'A' ? 'current_session_a' : 'current_session_b';
      const currentSession = prev[currentKey];
      
      if (!currentSession || !currentSession.is_active) {
        console.warn(`⚠️ No active session to end for Model ${model}`);
        return prev;
      }

      // Calculate session duration and update global timeline
      const sessionDurationSeconds = (currentTime - currentSession.start_timestamp) / 1000;
      const newCumulativeSeconds = currentSession.session_offset_seconds + sessionDurationSeconds;
      
      // Update global timeline for this model
      globalTimelineRef.current[model].lastEndTime = currentTime;
      globalTimelineRef.current[model].cumulativeSeconds = newCumulativeSeconds;
      
      // Mark session as ended
      const updatedSession = {
        ...currentSession,
        is_active: false,
        end_timestamp: currentTime,
      };

      const sessionKey = model === 'A' ? 'model_a_sessions' : 'model_b_sessions';
      const updatedSessions = prev[sessionKey].map(session => 
        session.session_id === currentSession.session_id ? updatedSession : session
      );

      console.log(`🏁 Ended telemetry session for Model ${model}: ${currentSession.session_id} (duration: ${sessionDurationSeconds.toFixed(1)}s, cumulative: ${newCumulativeSeconds.toFixed(1)}s)`);
      options.onSessionEnd?.(model, currentSession.session_id);

      // Increment turn counter for next session
      turnCounterRef.current[model]++;

      return {
        ...prev,
        [sessionKey]: updatedSessions,
        [currentKey]: undefined,
      };
    });
  }, [options.onSessionEnd]);

  // Add telemetry data point to the appropriate model session
  const addTelemetryPoint = useCallback((dataPoint: TelemetryDataPoint) => {
    if (!dataPoint.model || (dataPoint.model !== 'A' && dataPoint.model !== 'B')) {
      console.warn('⚠️ Telemetry point missing model information:', dataPoint);
      return;
    }

    const model = dataPoint.model as 'A' | 'B';
    
    setOverlayData(prev => {
      const currentKey = model === 'A' ? 'current_session_a' : 'current_session_b';
      const currentSession = prev[currentKey];
      
      if (!currentSession || !currentSession.is_active) {
        console.warn(`⚠️ No active session for Model ${model} to add telemetry point`);
        return prev;
      }

      // Calculate relative time from session start, then add session offset for global timeline continuity
      const sessionRelativeSeconds = (dataPoint.timestamp - currentSession.start_timestamp) / 1000;
      const globalRelativeSeconds = currentSession.session_offset_seconds + sessionRelativeSeconds;
      
      const enhancedPoint: TelemetryDataPointWithRelativeTime = {
        ...dataPoint,
        relative_time_seconds: Math.max(0, globalRelativeSeconds), // Ensure non-negative
      };

      // Update the current session with new data point
      const updatedSession = {
        ...currentSession,
        data: [...currentSession.data, enhancedPoint],
      };

      // Update sessions array
      const sessionKey = model === 'A' ? 'model_a_sessions' : 'model_b_sessions';
      const updatedSessions = prev[sessionKey].map(session =>
        session.session_id === currentSession.session_id ? updatedSession : session
      );

      return {
        ...prev,
        [sessionKey]: updatedSessions,
        [currentKey]: updatedSession,
      };
    });
  }, []);

  // Clear all telemetry data (for session reset)
  const clearAllTelemetry = useCallback(() => {
    setOverlayData({
      model_a_sessions: [],
      model_b_sessions: [],
    });
    turnCounterRef.current = { A: 1, B: 1 };
    // Reset global timeline tracking
    globalTimelineRef.current = { 
      A: { lastEndTime: 0, cumulativeSeconds: 0 }, 
      B: { lastEndTime: 0, cumulativeSeconds: 0 } 
    };
    console.log('🧧 Cleared all overlay telemetry data and reset global timeline');
  }, []);

  // Get all data points for chart overlay (combine all sessions with preserved timing)
  const getOverlayChartData = useCallback(() => {
    return {
      modelA: overlayData.model_a_sessions.flatMap(session => session.data),
      modelB: overlayData.model_b_sessions.flatMap(session => session.data),
    };
  }, [overlayData]);

  // Get latest active session data for live display
  const getLatestSessionData = useCallback(() => {
    return {
      modelA: overlayData.current_session_a?.data || [],
      modelB: overlayData.current_session_b?.data || [],
    };
  }, [overlayData]);

  // Check if any model is currently active
  const hasActiveSessions = useCallback(() => {
    return !!(overlayData.current_session_a?.is_active || overlayData.current_session_b?.is_active);
  }, [overlayData]);

  return {
    overlayData,
    startModelSession,
    endModelSession,
    addTelemetryPoint,
    clearAllTelemetry,
    getOverlayChartData,
    getLatestSessionData,
    hasActiveSessions,
  };
};
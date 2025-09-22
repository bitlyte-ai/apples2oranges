import { useState, useEffect, useMemo } from 'react';
import type { TelemetryDataPoint, Message } from '../types/telemetry';

// Snapshot of session state for comparison
interface SessionSnapshot {
  chatHistoryLength: number;
  telemetryDataLength: number;
  systemPrompt: string;
  modelAPath: string;
  modelBPath: string;
  modelAContextSize: number;
  modelBContextSize: number;
  // Hash of message contents to detect edits (for future message editing feature)
  messagesHash: string;
  timestamp: number;
}

export interface SessionStateResult {
  hasUnsavedChanges: boolean;
  canSave: boolean;
  lastSavedAt: Date | null;
  currentSessionId: string | null;
  markAsSaved: (sessionId: string) => void;
  clearSavedState: () => void;
}

interface SessionData {
  chatHistory: Message[];
  telemetryData: TelemetryDataPoint[];
  systemPrompt: string;
  modelAPath: string;
  modelBPath: string;
  modelAContextSize: number;
  modelBContextSize: number;
}

// Simple hash function for message content comparison
const hashMessages = (messages: Message[]): string => {
  return messages
    .map(m => `${m.id}:${m.role}:${m.content}:${m.model || ''}`)
    .join('|');
};

// Create snapshot of current session state
const createSnapshot = (data: SessionData): SessionSnapshot => ({
  chatHistoryLength: data.chatHistory.length,
  telemetryDataLength: data.telemetryData.length,
  systemPrompt: data.systemPrompt,
  modelAPath: data.modelAPath,
  modelBPath: data.modelBPath,
  modelAContextSize: data.modelAContextSize,
  modelBContextSize: data.modelBContextSize,
  messagesHash: hashMessages(data.chatHistory),
  timestamp: Date.now(),
});

// Compare current state with saved snapshot
const hasChangesFromSnapshot = (current: SessionData, saved: SessionSnapshot | null): boolean => {
  if (!saved) {
    return (
      current.chatHistory.length > 0 ||
      current.telemetryData.length > 0 ||
      current.systemPrompt.trim().length > 0
    );
  }

  // Compare all tracked fields
  const diffs = {
    chatHistoryLength: current.chatHistory.length !== saved.chatHistoryLength,
    telemetryDataLength: current.telemetryData.length !== saved.telemetryDataLength,
    systemPrompt: current.systemPrompt !== saved.systemPrompt,
    modelAPath: current.modelAPath !== saved.modelAPath,
    modelBPath: current.modelBPath !== saved.modelBPath,
    modelAContextSize: current.modelAContextSize !== saved.modelAContextSize,
    modelBContextSize: current.modelBContextSize !== saved.modelBContextSize,
    messagesHash: hashMessages(current.chatHistory) !== saved.messagesHash,
  };
  return Object.values(diffs).some(Boolean);
};

/**
 * Hook for managing session state and tracking unsaved changes
 * 
 * This hook provides a unified way to:
 * - Track whether there are unsaved changes
 * - Determine if save button should be enabled
 * - Know when the last save occurred
 * - Manage save state lifecycle
 */
export const useSessionState = (sessionData: SessionData): SessionStateResult => {
  const [lastSavedSnapshot, setLastSavedSnapshot] = useState<SessionSnapshot | null>(null);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);

  // Calculate derived state
  const hasUnsavedChanges = useMemo(
    () => hasChangesFromSnapshot(sessionData, lastSavedSnapshot),
    [sessionData, lastSavedSnapshot]
  );


  // Can save if there's meaningful content and it has changes
  const canSave = useMemo(() => {
    const hasMeaningfulContent = 
      sessionData.chatHistory.length > 0 || 
      sessionData.telemetryData.length > 0;
    
    return hasMeaningfulContent && hasUnsavedChanges;
  }, [sessionData, hasUnsavedChanges]);

  const lastSavedAt = useMemo(
    () => lastSavedSnapshot ? new Date(lastSavedSnapshot.timestamp) : null,
    [lastSavedSnapshot]
  );

  // Mark current state as saved
  const markAsSaved = (sessionId: string) => {
    const snapshot = createSnapshot(sessionData);
    setLastSavedSnapshot(snapshot);
    setCurrentSessionId(sessionId);
  };

  // Clear saved state (for new session or reset)
  const clearSavedState = () => {
    setLastSavedSnapshot(null);
    setCurrentSessionId(null);
  };

  // Clear saved state when session data is completely reset
  useEffect(() => {
    // If all session data is empty, clear the saved state
    const isEmpty = 
      sessionData.chatHistory.length === 0 &&
      sessionData.telemetryData.length === 0 &&
      sessionData.systemPrompt.trim().length === 0;
    
    if (isEmpty && lastSavedSnapshot) {
      clearSavedState();
    }
  }, [sessionData, lastSavedSnapshot]);

  return {
    hasUnsavedChanges,
    canSave,
    lastSavedAt,
    currentSessionId,
    markAsSaved,
    clearSavedState,
  };
};

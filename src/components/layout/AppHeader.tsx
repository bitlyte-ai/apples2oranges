import React from 'react';
import { useChatStore } from '../../stores/chatStore';
import { useModelStore } from '../../stores/modelStore';
import { useTelemetryStore } from '../../stores/telemetryStore';
import { useUIStore } from '../../stores/uiStore';
import { SmartTooltip } from '../ui/SmartTooltip';
import type { SessionStateResult } from '../../hooks/useSessionState';

interface AppHeaderProps {
  onClearSession: () => void;
  onHandlePotentialClose: (closeAction: () => void, context?: 'close' | 'clear' | 'switch-mode' | 'new-chat') => void;
  onHandleTargetChange: (newTarget: 'A' | 'B' | 'Both') => void;
  onHandleViewModeChange: (newViewMode: 'single' | 'dual') => void;
  sessionState: SessionStateResult;
  onNewChat?: () => void; // Optional explicit handler for New Chat to support immediate stop
}

/**
 * AppHeader Component
 * 
 * Responsive header with app mode toggles, view mode controls, and session management.
 * Preserves all interactive features including tooltips and responsive behavior.
 */
export const AppHeader: React.FC<AppHeaderProps> = ({
  onClearSession,
  onHandlePotentialClose,
  onHandleTargetChange: _onHandleTargetChange,
  onHandleViewModeChange,
  sessionState,
  onNewChat,
}) => {
  const { chatHistory } = useChatStore();
  const { appMode } = useModelStore();
  const { telemetryData, setSessionSaveDialogOpen } = useTelemetryStore();
  const { viewMode } = useUIStore();

  return (
    <div className="bg-white border-b px-6 py-4 flex items-center justify-between">
      <h1 className="text-2xl font-semibold text-gray-800">apples2oranges</h1>
      
      {/* Responsive control group */}
      <div className="flex items-center gap-4">
        {/* Chat Mode Controls - Responsive visibility */}
        {appMode === 'chat' && (
          <div className="flex gap-2">
            {/* View Mode Toggle */}
            <button
              onClick={() => onHandleViewModeChange("single")}
              className={`px-3 py-1 rounded transition-colors ${
                viewMode === "single" ? "bg-blue-500 text-white" : "bg-gray-200 hover:bg-gray-300"
              }`}
            >
              Single
            </button>
            <button
              onClick={() => onHandleViewModeChange("dual")}
              className={`px-3 py-1 rounded transition-colors ${
                viewMode === "dual" ? "bg-blue-500 text-white" : "bg-gray-200 hover:bg-gray-300"
              }`}
            >
              Dual
            </button>
            
            {/* Save Session Button - Conditional rendering with interactive tooltip */}
            {(telemetryData.length > 0 || chatHistory.length > 0) && (
              <>  
                {!sessionState.canSave && sessionState.lastSavedAt ? (
                  <SmartTooltip
                    title="Session Already Saved"
                    description={`This session was saved at ${sessionState.lastSavedAt.toLocaleTimeString()}. Make changes to save again.`}
                    preferredPosition="bottom"
                  >
                    <button
                      onClick={() => setSessionSaveDialogOpen(true)}
                      disabled={!sessionState.canSave}
                      className="px-3 py-2 h-8 rounded text-sm font-medium transition-colors flex items-center justify-center bg-gray-300 text-gray-500 cursor-not-allowed"
                    >
                      Save Session
                    </button>
                  </SmartTooltip>
                ) : (
                  <button
                    onClick={() => setSessionSaveDialogOpen(true)}
                    disabled={!sessionState.canSave}
                    className={`px-3 py-2 h-8 rounded text-sm font-medium transition-colors flex items-center justify-center ${
                      sessionState.canSave
                        ? "bg-green-500 text-white hover:bg-green-600"
                        : "bg-gray-300 text-gray-500 cursor-not-allowed"
                    }`}
                    title={sessionState.canSave ? "Save current session" : "Already saved"}
                  >
                    Save Session
                  </button>
                )}
              </>
            )}
            
            {/* New Chat Button */}
            <button
              onClick={() => (onNewChat ? onNewChat() : onHandlePotentialClose(onClearSession, 'new-chat'))}
              className="px-3 py-2 h-8 rounded text-sm font-medium transition-colors flex items-center justify-center bg-orange-500 text-white hover:bg-orange-600"
              title="Start a new chat session"
            >
              New Chat
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AppHeader;

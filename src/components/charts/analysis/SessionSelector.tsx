import React from 'react';
import type { TelemetrySession } from '../../../types/telemetry';

interface SessionSelectorProps {
  sessions: TelemetrySession[];
  selectedSession: TelemetrySession | null;
  onSessionSelect: (session: TelemetrySession | null) => void;
  label: string;
  placeholder?: string;
  disabled?: boolean;
}

export const SessionSelector: React.FC<SessionSelectorProps> = ({
  sessions,
  selectedSession,
  onSessionSelect,
  label,
  placeholder = 'Select a session...',
  disabled = false,
}) => {
  return (
    <div className="flex flex-col space-y-2">
      <label className="text-sm font-medium text-gray-700">{label}</label>
      <select
        value={selectedSession?.id || ''}
        onChange={(e) => {
          const sessionId = e.target.value;
          const session = sessions.find(s => s.id === sessionId) || null;
          onSessionSelect(session);
        }}
        disabled={disabled}
        className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:text-gray-500"
      >
        <option value="">{placeholder}</option>
        {sessions.map((session) => (
          <option key={session.id} value={session.id}>
            {session.name} ({new Date(session.timestamp).toLocaleString()})
          </option>
        ))}
      </select>
      
      {selectedSession && (
        <div className="mt-2 p-3 bg-gray-50 rounded-md border border-gray-200">
          <div className="text-sm text-gray-700">
            <div className="flex justify-between items-center">
              <span className="font-medium">{selectedSession.name}</span>
              <span className="text-gray-500">
                {new Date(selectedSession.timestamp).toLocaleString()}
              </span>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="font-medium">Duration:</span> {Math.round(selectedSession.summary.duration_ms / 1000)}s
              </div>
              <div>
                <span className="font-medium">Data Points:</span> {selectedSession.data.length}
              </div>
              <div>
                <span className="font-medium">Avg TPS:</span> {selectedSession.summary.avg_tps.toFixed(2)}
              </div>
              <div>
                <span className="font-medium">Peak Temp:</span> {selectedSession.summary.peak_cpu_temp.toFixed(1)}°C
              </div>
            </div>
            
            {Object.keys(selectedSession.summary.model_performance).length > 0 && (
              <div className="mt-2 text-xs">
                <div className="font-medium">Models:</div>
                <div className="ml-2 space-y-1">
                  {Object.entries(selectedSession.summary.model_performance).map(([model, perf]) => (
                    <div key={model} className="flex justify-between">
                      <span>{model}:</span>
                      <span>TTFT {perf.ttft_ms}ms, TPS {perf.avg_tps.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

interface ComparisonSessionSelectorProps {
  sessions: TelemetrySession[];
  primarySession: TelemetrySession | null;
  comparisonSession: TelemetrySession | null;
  onPrimarySessionSelect: (session: TelemetrySession | null) => void;
  onComparisonSessionSelect: (session: TelemetrySession | null) => void;
  disabled?: boolean;
}

export const ComparisonSessionSelector: React.FC<ComparisonSessionSelectorProps> = ({
  sessions,
  primarySession,
  comparisonSession,
  onPrimarySessionSelect,
  onComparisonSessionSelect,
  disabled = false,
}) => {
  const availableSessions = sessions.filter(s => s.id !== primarySession?.id);
  const availableComparisonSessions = sessions.filter(s => s.id !== comparisonSession?.id);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <SessionSelector
          sessions={availableComparisonSessions}
          selectedSession={primarySession}
          onSessionSelect={onPrimarySessionSelect}
          label="Primary Session"
          placeholder="Select primary session..."
          disabled={disabled}
        />
        
        <SessionSelector
          sessions={availableSessions}
          selectedSession={comparisonSession}
          onSessionSelect={onComparisonSessionSelect}
          label="Comparison Session (Optional)"
          placeholder="Select session to compare..."
          disabled={disabled || !primarySession}
        />
      </div>
      
      {primarySession && comparisonSession && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
          <div className="flex items-center">
            <svg className="h-5 w-5 text-blue-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
            </svg>
            <div>
              <h4 className="text-sm font-medium text-blue-900">Comparison Mode Active</h4>
              <p className="text-sm text-blue-700 mt-1">
                Charts will overlay data from both sessions. Primary session data appears in blue/purple, 
                comparison session data appears in orange/red.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

interface SessionListProps {
  sessions: TelemetrySession[];
  selectedSession: TelemetrySession | null;
  onSessionSelect: (session: TelemetrySession | null) => void;
  onSessionDelete?: (session: TelemetrySession) => void;
  showDeleteButton?: boolean;
}

export const SessionList: React.FC<SessionListProps> = ({
  sessions,
  selectedSession,
  onSessionSelect,
  onSessionDelete,
  showDeleteButton = false,
}) => {
  if (sessions.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 48 48">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <h3 className="text-sm font-medium text-gray-900 mb-1">No Sessions Available</h3>
        <p className="text-sm text-gray-500">Run some inference sessions to generate telemetry data for analysis.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {sessions.map((session) => {
        const isSelected = selectedSession?.id === session.id;
        
        return (
          <div
            key={session.id}
            className={`p-3 border rounded-lg cursor-pointer transition-colors ${
              isSelected 
                ? 'bg-blue-50 border-blue-200 ring-2 ring-blue-500 ring-opacity-20' 
                : 'bg-white border-gray-200 hover:bg-gray-50'
            }`}
            onClick={() => onSessionSelect(isSelected ? null : session)}
          >
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium text-gray-900 truncate">
                    {session.name}
                  </h4>
                  <span className="text-xs text-gray-500">
                    {new Date(session.timestamp).toLocaleDateString()}
                  </span>
                </div>
                
                <div className="mt-1 text-xs text-gray-600">
                  <div className="flex items-center justify-between">
                    <span>
                      {Math.round(session.summary.duration_ms / 1000)}s • {session.data.length} points
                    </span>
                    <span>
                      {session.summary.avg_tps.toFixed(1)} TPS • {session.summary.peak_cpu_temp.toFixed(1)}°C
                    </span>
                  </div>
                </div>
                
                {Object.keys(session.summary.model_performance).length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {Object.keys(session.summary.model_performance).map((model) => (
                      <span
                        key={model}
                        className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-800"
                      >
                        {model}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              
              {showDeleteButton && onSessionDelete && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onSessionDelete(session);
                  }}
                  className="ml-3 flex-shrink-0 text-red-400 hover:text-red-600 transition-colors"
                  title="Delete session"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

interface SessionManagerProps {
  sessions: TelemetrySession[];
  onSessionsChange: (sessions: TelemetrySession[]) => void;
}

export const SessionManager: React.FC<SessionManagerProps> = ({
  sessions,
  onSessionsChange,
}) => {
  const handleDeleteSession = (sessionToDelete: TelemetrySession) => {
    if (confirm(`Are you sure you want to delete session "${sessionToDelete.name}"?`)) {
      const updatedSessions = sessions.filter(s => s.id !== sessionToDelete.id);
      onSessionsChange(updatedSessions);
    }
  };

  const handleClearAllSessions = () => {
    if (confirm('Are you sure you want to delete all sessions? This action cannot be undone.')) {
      onSessionsChange([]);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900">Session Manager</h3>
        {sessions.length > 0 && (
          <button
            onClick={handleClearAllSessions}
            className="px-3 py-1 text-sm text-red-600 hover:text-red-800 border border-red-300 hover:border-red-400 rounded transition-colors"
          >
            Clear All
          </button>
        )}
      </div>
      
      <SessionList
        sessions={sessions}
        selectedSession={null}
        onSessionSelect={() => {}} // Read-only in manager mode
        onSessionDelete={handleDeleteSession}
        showDeleteButton={true}
      />
      
      {sessions.length > 0 && (
        <div className="text-xs text-gray-500 text-center">
          {sessions.length} session{sessions.length !== 1 ? 's' : ''} available
        </div>
      )}
    </div>
  );
};
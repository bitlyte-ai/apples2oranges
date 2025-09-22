import React from 'react';
import type { TelemetrySession } from '../../../types/telemetry';
import { SessionSelector } from './SessionSelector';
import { MultiSelectDropdown } from '../../ui/MultiSelectDropdown';

interface MultiSessionSelectorProps {
  sessions: TelemetrySession[];
  primarySession: TelemetrySession | null;
  comparisonSessions: TelemetrySession[];
  onPrimarySessionSelect: (session: TelemetrySession | null) => void;
  onComparisonSessionsSelect: (sessions: TelemetrySession[]) => void;
  disabled?: boolean;
  maxComparisons?: number;
}

export const MultiSessionSelector: React.FC<MultiSessionSelectorProps> = ({
  sessions,
  primarySession,
  comparisonSessions,
  onPrimarySessionSelect,
  onComparisonSessionsSelect,
  disabled = false,
  maxComparisons = 5,
}) => {
  // Filter sessions to prevent duplicates between primary and comparison
  const availablePrimarySessions = sessions.filter(s => 
    !comparisonSessions.some(cs => cs.id === s.id)
  );
  
  const availableComparisonSessions = sessions.filter(s => 
    s.id !== primarySession?.id
  );

  // Convert sessions to dropdown options
  const comparisonOptions = availableComparisonSessions.map(session => ({
    id: session.id,
    label: session.name,
    value: new Date(session.timestamp).toLocaleString(),
    disabled: false,
  }));

  const selectedComparisonIds = comparisonSessions.map(s => s.id);

  const handleComparisonChange = (selectedIds: string[]) => {
    const selectedSessions = sessions.filter(s => selectedIds.includes(s.id));
    onComparisonSessionsSelect(selectedSessions);
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Primary Session Selector */}
        <SessionSelector
          sessions={availablePrimarySessions}
          selectedSession={primarySession}
          onSessionSelect={onPrimarySessionSelect}
          label="Primary Session"
          placeholder="Select primary session..."
          disabled={disabled}
        />
        
        {/* Multi-Select Comparison Sessions */}
        <MultiSelectDropdown
          options={comparisonOptions}
          selectedIds={selectedComparisonIds}
          onChange={handleComparisonChange}
          placeholder="Select sessions to compare..."
          maxSelections={maxComparisons}
          disabled={disabled || !primarySession}
          label="Comparison Sessions (Optional)"
          emptyMessage="No sessions available for comparison"
        />
      </div>
      
      {/* Status Info */}
      {primarySession && comparisonSessions.length > 0 && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
          <div className="flex items-start">
            <svg className="h-5 w-5 text-blue-400 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
            </svg>
            <div>
              <h4 className="text-sm font-medium text-blue-900">Multi-Session Comparison Active</h4>
              <p className="text-sm text-blue-700 mt-1">
                Charts will overlay data from {comparisonSessions.length + 1} sessions. 
                Primary session appears in blue/purple, comparison sessions use distinct colors.
              </p>
              <div className="mt-2 text-xs text-blue-600">
                <div className="font-medium">Sessions being compared:</div>
                <ul className="mt-1 space-y-1">
                  <li className="flex items-center">
                    <div className="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
                    <span className="font-medium">{primarySession.name}</span>
                    <span className="text-blue-500 ml-2">(Primary)</span>
                  </li>
                  {comparisonSessions.map((session, index) => {
                    // Generate distinct colors for each comparison session
                    const colors = [
                      'bg-orange-500', 'bg-red-500', 'bg-green-500', 
                      'bg-purple-500', 'bg-yellow-500', 'bg-pink-500'
                    ];
                    const colorClass = colors[index % colors.length];
                    
                    return (
                      <li key={session.id} className="flex items-center">
                        <div className={`w-3 h-3 ${colorClass} rounded-full mr-2`}></div>
                        <span>{session.name}</span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Selection Summary */}
      {primarySession && (
        <div className="text-sm text-gray-600">
          <span className="font-medium">Primary:</span> {primarySession.name}
          {comparisonSessions.length > 0 && (
            <>
              <span className="mx-2">•</span>
              <span className="font-medium">Comparing with:</span> {comparisonSessions.length} session{comparisonSessions.length !== 1 ? 's' : ''}
            </>
          )}
        </div>
      )}
    </div>
  );
};
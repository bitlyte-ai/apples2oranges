import React from 'react';
import type { TelemetrySession } from '../../../types/telemetry';
import { CustomDropdown, MultiSelectDropdown, sessionToDropdownOption } from '../../ui/CustomDropdown';

interface EnhancedSessionSelectorProps {
  sessions: TelemetrySession[];
  primarySession: TelemetrySession | null;
  comparisonSessions: TelemetrySession[];
  onPrimarySessionSelect: (session: TelemetrySession | null) => void;
  onComparisonSessionsChange: (sessions: TelemetrySession[]) => void;
  disabled?: boolean;
}

export const EnhancedSessionSelector: React.FC<EnhancedSessionSelectorProps> = ({
  sessions,
  primarySession,
  comparisonSessions,
  onPrimarySessionSelect,
  onComparisonSessionsChange,
  disabled = false,
}) => {
  // Convert sessions to dropdown options
  const sessionOptions = sessions.map(sessionToDropdownOption);
  const primaryOption = primarySession ? sessionToDropdownOption(primarySession) : null;
  const comparisonOptions = comparisonSessions.map(sessionToDropdownOption);
  
  // Filter out primary session from comparison options
  const availableComparisonOptions = sessionOptions.filter(
    option => option.id !== primarySession?.id
  );

  const handlePrimarySelect = (option: any) => {
    const session = option ? sessions.find(s => s.id === option.id) || null : null;
    onPrimarySessionSelect(session);
    
    // Remove primary session from comparison sessions if it was selected
    if (session) {
      onComparisonSessionsChange(
        comparisonSessions.filter(s => s.id !== session.id)
      );
    }
  };

  const handleComparisonChange = (options: any[]) => {
    const selectedSessions = options.map(option => 
      sessions.find(s => s.id === option.id)
    ).filter(Boolean) as TelemetrySession[];
    
    onComparisonSessionsChange(selectedSessions);
  };

  const totalSessions = (primarySession ? 1 : 0) + comparisonSessions.length;

  return (
    <div className="space-y-4">
      {/* Primary Session Selector */}
      <CustomDropdown
        label="Primary Session"
        placeholder="Select primary session..."
        options={sessionOptions}
        selectedOption={primaryOption}
        onSelect={handlePrimarySelect}
        disabled={disabled}
      />

      {/* Multi-Select Comparison Sessions */}
      <MultiSelectDropdown
        label="Additional Sessions for Comparison"
        placeholder="Select additional sessions..."
        options={availableComparisonOptions}
        selectedOptions={comparisonOptions}
        onSelectionChange={handleComparisonChange}
        disabled={disabled || !primarySession}
        maxSelections={6} // Primary + 6 comparison = 7 total max
      />

      {/* Session Summary */}
      {totalSessions > 0 && (
        <div className="p-4 bg-gray-50 border border-gray-200 rounded-md">
          <div className="flex items-start">
            <svg className="h-5 w-5 text-gray-400 mt-0.5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            <div className="flex-1">
              <h4 className="text-sm font-medium text-gray-900">
                {totalSessions === 1 ? 'Single Session Analysis' : `Multi-Session Analysis (${totalSessions} sessions)`}
              </h4>
              <div className="mt-1 text-sm text-gray-600">
                {totalSessions === 1 ? (
                  <p>Analyzing data from one session. Charts will show individual telemetry metrics.</p>
                ) : (
                  <p>
                    Comparing {totalSessions} sessions with overlay visualization. Each session will be 
                    displayed with a distinct color for easy comparison.
                  </p>
                )}
              </div>
              
              {/* Session List */}
              {totalSessions > 1 && (
                <div className="mt-3 space-y-1">
                  {primarySession && (
                    <div className="flex items-center text-xs">
                      <div className="w-3 h-3 bg-blue-500 rounded-full mr-2 flex-shrink-0"></div>
                      <span className="font-medium text-gray-700">Primary:</span>
                      <span className="ml-1 text-gray-600 truncate">{primarySession.name}</span>
                    </div>
                  )}
                  {comparisonSessions.map((session, index) => {
                    // Use the same color palette as MultiSessionChartWrapper
                    const colors = [
                      '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#06B6D4', '#EC4899'
                    ];
                    const color = colors[index % colors.length];
                    
                    return (
                      <div key={session.id} className="flex items-center text-xs">
                        <div 
                          className="w-3 h-3 rounded-full mr-2 flex-shrink-0" 
                          style={{ backgroundColor: color }}
                        ></div>
                        <span className="font-medium text-gray-700">Compare:</span>
                        <span className="ml-1 text-gray-600 truncate">{session.name}</span>
                      </div>
                    );
                  })}
                </div>
              )}
              
              {/* Performance hint */}
              {totalSessions > 5 && (
                <div className="mt-2 text-xs text-amber-600">
                  ⚠️ Comparing many sessions may impact chart performance and readability.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
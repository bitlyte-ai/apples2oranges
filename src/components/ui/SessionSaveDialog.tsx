import React, { useState, useEffect } from 'react';
import type { TelemetryDataPoint, Message } from '../../types/telemetry';

interface SessionSaveDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (sessionName: string) => void;
  telemetryData: TelemetryDataPoint[];
  chatHistory: Message[];
  systemPrompt: string;
  systemPromptTokenCount: number | null;
  modelInfo: {
    model_a?: string;
    model_b?: string;
  };
}

export const SessionSaveDialog: React.FC<SessionSaveDialogProps> = ({
  isOpen,
  onClose,
  onSave,
  telemetryData,
  chatHistory,
  systemPrompt,
  systemPromptTokenCount,
  modelInfo,
}) => {
  const [sessionName, setSessionName] = useState('');
  const [isValid, setIsValid] = useState(false);

  // Generate default session name with current date/time
  useEffect(() => {
    if (isOpen && sessionName === '') {
      const now = new Date();
      const defaultName = `Session ${now.toLocaleDateString()} ${now.toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit' 
      })}`;
      setSessionName(defaultName);
      setIsValid(true);
    }
  }, [isOpen, sessionName]);

  // Validate session name
  useEffect(() => {
    setIsValid(sessionName.trim().length > 0);
  }, [sessionName]);

  const handleSave = () => {
    console.log('💾 SessionSaveDialog: Save button clicked, validating...');
    console.log('💾 SessionSaveDialog: isValid:', isValid, 'sessionName:', sessionName.trim());
    if (isValid) {
      console.log('💾 SessionSaveDialog: Validation passed, calling onSave');
      onSave(sessionName.trim());
      console.log('💾 SessionSaveDialog: onSave called, resetting form');
      setSessionName(''); // Reset for next time
      console.log('💾 SessionSaveDialog: Form reset, calling onClose');
      onClose();
      console.log('💾 SessionSaveDialog: onClose called, dialog should close');
    } else {
      console.log('💾 SessionSaveDialog: Validation failed, not saving');
    }
  };

  const handleCancel = () => {
    console.log('🔄 SessionSaveDialog: Cancel button clicked');
    setSessionName(''); // Reset for next time
    console.log('🔄 SessionSaveDialog: Session name reset, calling onClose');
    onClose();
    console.log('🔄 SessionSaveDialog: onClose called');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-20 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Save Session</h3>
          <p className="text-sm text-gray-500 mt-1">
            Give this session a memorable name to find it later in Analysis Mode.
          </p>
        </div>

        <div className="px-6 py-4">
          {/* Session Preview */}
          <div className="mb-4 p-3 bg-gray-50 rounded-lg">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Session Preview</h4>
            <div className="space-y-1 text-xs text-gray-600">
              <div>💬 {chatHistory.length} message{chatHistory.length !== 1 ? 's' : ''}</div>
              <div>📊 {telemetryData.length} telemetry data points</div>
              {systemPrompt && (
                <div>🤖 Custom system prompt ({systemPromptTokenCount !== null ? `${systemPromptTokenCount} tokens` : `${systemPrompt.length} chars`})</div>
              )}
              <div className="flex gap-2">
                {modelInfo.model_a && (
                  <div className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs">
                    Model A: {modelInfo.model_a.split('/').pop()}
                  </div>
                )}
                {modelInfo.model_b && (
                  <div className="bg-purple-100 text-purple-800 px-2 py-1 rounded text-xs">
                    Model B: {modelInfo.model_b.split('/').pop()}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Session Name Input */}
          <div>
            <label htmlFor="sessionName" className="block text-sm font-medium text-gray-700 mb-2">
              Session Name <span className="text-red-500">*</span>
            </label>
            <input
              id="sessionName"
              type="text"
              value={sessionName}
              onChange={(e) => setSessionName(e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                isValid 
                  ? 'border-gray-300 focus:ring-blue-500' 
                  : 'border-red-300 focus:ring-red-500'
              }`}
              placeholder="Enter session name..."
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter' && isValid) {
                  handleSave();
                } else if (e.key === 'Escape') {
                  handleCancel();
                }
              }}
            />
            {!isValid && (
              <p className="mt-1 text-sm text-red-600">Session name is required.</p>
            )}
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
          <button
            onClick={handleCancel}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!isValid}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              isValid
                ? 'bg-blue-500 text-white hover:bg-blue-600'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            Save Session
          </button>
        </div>
      </div>
    </div>
  );
};
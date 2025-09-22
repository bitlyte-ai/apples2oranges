import React from 'react';
import type { TelemetryDataPoint, Message } from '../../types/telemetry';

type DialogContext = 'close' | 'clear' | 'switch-mode' | 'new-chat';

interface UnsavedChangesDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveAndClose: () => void;
  onCloseWithoutSaving: () => void;
  chatHistory: Message[];
  telemetryData: TelemetryDataPoint[];
  systemPrompt: string;
  systemPromptTokenCount: number | null;
  modelInfo: {
    model_a?: string;
    model_b?: string;
  };
  context?: DialogContext;
}

export const UnsavedChangesDialog: React.FC<UnsavedChangesDialogProps> = ({
  isOpen,
  onClose,
  onSaveAndClose,
  onCloseWithoutSaving,
  chatHistory,
  telemetryData,
  systemPrompt,
  systemPromptTokenCount,
  modelInfo,
  context = 'close',
}) => {
  if (!isOpen) return null;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      console.log('⌨️ UnsavedChangesDialog: Escape key pressed, calling onClose');
      onClose();
    }
  };
  
  const getContextTexts = () => {
    switch (context) {
      case 'clear':
        return {
          title: 'Clear Session Data?',
          subtitle: 'You have unsaved changes that will be lost.',
          question: 'Would you like to save your current session before clearing, or clear without saving?',
          actionButton: 'Save and Clear',
          discardButton: 'Clear Without Saving'
        };
      case 'switch-mode':
        return {
          title: 'Switch Mode?',
          subtitle: 'You have unsaved changes that will be lost.',
          question: 'Would you like to save your current session before switching modes, or switch without saving?',
          actionButton: 'Save and Switch',
          discardButton: 'Switch Without Saving'
        };
      case 'new-chat':
        return {
          title: 'Start New Chat?',
          subtitle: 'You have unsaved changes that will be lost.',
          question: 'Would you like to save your current session before starting a new chat, or start without saving?',
          actionButton: 'Save and New Chat',
          discardButton: 'New Chat Without Saving'
        };
      case 'close':
      default:
        return {
          title: 'Unsaved Changes',
          subtitle: 'You have unsaved changes that will be lost.',
          question: 'Would you like to save your current session before closing, or close without saving?',
          actionButton: 'Save and Close',
          discardButton: 'Close Without Saving'
        };
    }
  };
  
  const texts = getContextTexts();

  return (
    <div 
      className="fixed inset-0 bg-gray-900 bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50"
      onKeyDown={handleKeyDown}
    >
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.314 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-medium text-gray-900">{texts.title}</h3>
              <p className="text-sm text-gray-500">
                {texts.subtitle}
              </p>
            </div>
          </div>
        </div>

        <div className="px-6 py-4">
          {/* Changes Preview */}
          <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <h4 className="text-sm font-medium text-yellow-800 mb-2">Changes that will be lost:</h4>
            <div className="space-y-1 text-xs text-yellow-700">
              {chatHistory.length > 0 && (
                <div className="flex items-center gap-2">
                  <span>💬</span>
                  <span>{chatHistory.length} message{chatHistory.length !== 1 ? 's' : ''} in conversation</span>
                </div>
              )}
              {telemetryData.length > 0 && (
                <div className="flex items-center gap-2">
                  <span>📊</span>
                  <span>{telemetryData.length} telemetry data points</span>
                </div>
              )}
              {systemPrompt && (
                <div className="flex items-center gap-2">
                  <span>🤖</span>
                  <span>Custom system prompt ({systemPromptTokenCount !== null ? `${systemPromptTokenCount} tokens` : `${systemPrompt.length} chars`})</span>
                </div>
              )}
              <div className="flex gap-2 flex-wrap mt-2">
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

          <p className="text-sm text-gray-600">
            {texts.question}
          </p>
        </div>

        <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
          <button
            onClick={(e) => {
              console.log('🔄 UnsavedChangesDialog: Cancel button clicked');
              e.stopPropagation(); // Prevent event bubbling
              onClose();
            }}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            autoFocus
          >
            Cancel
          </button>
          <button
            onClick={(e) => {
              console.log('🗑️ UnsavedChangesDialog: Close Without Saving button clicked', { context });
              e.stopPropagation(); // Prevent event bubbling
              onCloseWithoutSaving();
            }}
            className="px-4 py-2 text-red-700 bg-red-100 rounded-lg hover:bg-red-200 transition-colors font-medium"
          >
            {texts.discardButton}
          </button>
          <button
            onClick={(e) => {
              console.log('💾 UnsavedChangesDialog: Save and Close button clicked', { context });
              e.stopPropagation(); // Prevent event bubbling
              onSaveAndClose();
            }}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium"
          >
            {texts.actionButton}
          </button>
        </div>
      </div>
    </div>
  );
};
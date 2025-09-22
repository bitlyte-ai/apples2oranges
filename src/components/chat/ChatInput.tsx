import React from 'react';
import { ModelTargetSelector } from '../ui/ModelTargetSelector';

interface ChatInputProps {
  prompt: string;
  target: 'A' | 'B' | 'Both';
  isLoading: boolean;
  isStopping: boolean;
  availableTargets: ('A' | 'B' | 'Both')[];
  onPromptChange: (value: string) => void;
  onTargetChange: (target: 'A' | 'B' | 'Both') => void;
  onSendPrompt: () => Promise<void>;
  onStopGeneration: () => Promise<void>;
}

/**
 * ChatInput Component
 * 
 * Comprehensive chat input form with responsive design and full functionality:
 * - Multi-line textarea with proper validation
 * - Model target selector with availability checking
 * - Send/Stop button states with loading indicators
 * - Responsive design and accessibility features
 * - Form submission handling and keyboard shortcuts
 */
export const ChatInput: React.FC<ChatInputProps> = ({
  prompt,
  target,
  isLoading,
  isStopping,
  availableTargets,
  onPromptChange,
  onTargetChange,
  onSendPrompt,
  onStopGeneration
}) => {
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoading && prompt.trim()) {
      await onSendPrompt();
    }
  };

  const handleStopClick = async () => {
    if (isLoading && !isStopping) {
      await onStopGeneration();
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <form onSubmit={handleSubmit}>
        <div className="flex gap-3">
          {/* Main textarea input - responsive and accessible */}
          <textarea
            value={prompt}
            onChange={(e) => onPromptChange(e.target.value)}
            placeholder="Enter your prompt here..."
            className="flex-1 p-3 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
            rows={3}
            aria-label="Chat prompt input"
            onKeyDown={(e) => {
              // Allow Ctrl/Cmd + Enter to submit
              if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
          />
          
          {/* Control column - responsive layout */}
          <div className="flex flex-col gap-2 min-w-0">
            {/* Model target selector */}
            <ModelTargetSelector
              value={target}
              onChange={onTargetChange}
              availableTargets={availableTargets}
              disabled={isLoading}
            />
            
            {/* Dynamic action button - Send or Stop */}
            {isLoading ? (
              <button
                type="button"
                onClick={handleStopClick}
                disabled={isStopping}
                className="px-6 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium flex items-center justify-center gap-2 transition-colors min-w-0"
                aria-label={isStopping ? "Stopping generation" : "Stop generation"}
              >
                {isStopping ? (
                  <>
                    <svg 
                      className="w-4 h-4 animate-spin" 
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    <span className="hidden sm:inline">Stopping...</span>
                  </>
                ) : (
                  <>
                    <svg 
                      className="w-4 h-4" 
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 6h12v12H6z" />
                    </svg>
                    <span className="hidden sm:inline">Stop</span>
                  </>
                )}
              </button>
            ) : (
              <button
                type="submit"
                disabled={isLoading || !prompt.trim()}
                className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium transition-colors"
                aria-label="Send message"
              >
                <span className="flex items-center justify-center gap-2">
                  <svg 
                    className="w-4 h-4" 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                  <span className="hidden sm:inline">Send</span>
                </span>
              </button>
            )}
          </div>
        </div>
        
        {/* Accessibility hint for keyboard users */}
        <div className="mt-2 text-xs text-gray-500">
          <span className="hidden sm:inline">Press Ctrl+Enter to send • </span>
          {!prompt.trim() && 'Enter a message to continue'}
        </div>
      </form>
    </div>
  );
};

export default ChatInput;
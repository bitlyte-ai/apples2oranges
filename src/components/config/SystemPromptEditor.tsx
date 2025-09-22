import React from 'react';

interface SystemPromptEditorProps {
  systemPrompt: string;
  systemPromptTokenCount: number | null;
  onSystemPromptChange: (prompt: string) => void;
  disabled?: boolean;
  className?: string;
}

/**
 * SystemPromptEditor Component
 * 
 * Dedicated system prompt configuration interface with:
 * - Real-time token counting display
 * - Proper accessibility features and labeling
 * - Responsive design with clean visual hierarchy
 * - Integration with modelStore for state management
 * - Validation and placeholder text for user guidance
 */
export const SystemPromptEditor: React.FC<SystemPromptEditorProps> = ({
  systemPrompt,
  systemPromptTokenCount,
  onSystemPromptChange,
  disabled = false,
  className = ""
}) => {
  return (
    <div className={`space-y-2 ${className}`}>
      {/* Header with label and token count */}
      <div className="flex items-center justify-between">
        <label 
          className="block text-sm font-medium text-gray-700"
          htmlFor="system-prompt-textarea"
        >
          System Prompt
        </label>
        {systemPromptTokenCount !== null && (
          <span 
            className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded"
            title={`System prompt uses ${systemPromptTokenCount} tokens`}
            aria-label={`System prompt token count: ${systemPromptTokenCount}`}
          >
            {systemPromptTokenCount} tokens
          </span>
        )}
      </div>
      
      {/* System prompt textarea */}
      <textarea
        id="system-prompt-textarea"
        value={systemPrompt}
        onChange={(e) => onSystemPromptChange(e.target.value)}
        placeholder="Optional system prompt..."
        disabled={disabled}
        className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-500 resize-none transition-colors"
        rows={3}
        aria-describedby="system-prompt-help"
      />
      
      {/* Help text */}
      <div 
        id="system-prompt-help"
        className="text-xs text-gray-500"
      >
        Add a system prompt to provide context and instructions to both models.
      </div>
    </div>
  );
};

export default SystemPromptEditor;
import React from 'react';

interface MessageEditorProps {
  content: string;
  isUser: boolean;
  onContentChange: (content: string) => void;
  onSave: () => void;
  onCancel: () => void;
}

/**
 * MessageEditor Component
 * 
 * Dedicated message editing interface with clean separation of concerns:
 * - Handles only the editing UI (textarea, buttons)
 * - Integrates with chatStore for state management
 * - Maintains consistent styling with MessageItem
 * - Provides proper accessibility features
 * - Supports both user and assistant message contexts
 */
export const MessageEditor: React.FC<MessageEditorProps> = ({
  content,
  isUser,
  onContentChange,
  onSave,
  onCancel
}) => {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Allow Ctrl/Cmd + Enter to save
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      onSave();
    }
    // Allow Escape to cancel
    if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
    }
  };

  return (
    <div className="space-y-2">
      {/* Edit textarea with consistent styling */}
      <textarea
        value={content}
        onChange={(e) => onContentChange(e.target.value)}
        onKeyDown={handleKeyDown}
        className={`w-full p-2 rounded border resize-none focus:outline-none focus:ring-2 ${
          isUser
            ? "bg-blue-400 text-white border-blue-300 focus:ring-blue-300 placeholder-blue-200"
            : "bg-white text-gray-800 border-gray-300 focus:ring-blue-500"
        }`}
        rows={3}
        placeholder="Edit your message..."
        autoFocus
        aria-label="Edit message content"
      />
      
      {/* Action buttons */}
      <div className="flex gap-2">
        <button
          onClick={onSave}
          disabled={!content.trim()}
          className={`px-3 py-1 rounded text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
            isUser
              ? "bg-blue-400 hover:bg-blue-300 text-white"
              : "bg-green-500 hover:bg-green-600 text-white"
          }`}
          title="Save changes (Ctrl+Enter)"
          aria-label="Save message changes"
        >
          Save
        </button>
        <button
          onClick={onCancel}
          className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
            isUser
              ? "bg-blue-400 hover:bg-blue-300 text-white"
              : "bg-gray-500 hover:bg-gray-600 text-white"
          }`}
          title="Cancel editing (Escape)"
          aria-label="Cancel message editing"
        >
          Cancel
        </button>
      </div>
      
      {/* Accessibility hint */}
      <div className="text-xs text-gray-500 mt-1">
        <span className="opacity-75">Ctrl+Enter to save • Escape to cancel</span>
      </div>
    </div>
  );
};

export default MessageEditor;
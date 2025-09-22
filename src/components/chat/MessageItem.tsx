import React from 'react';
import { MessageEditor } from './MessageEditor';

export interface Message {
  id: string;
  role: string;
  content: string;
  model?: string;
  isEditing?: boolean;
  ttft_ms?: number;
  avg_tps?: number;
  token_count?: number;
  generation_time_ms?: number;
}

interface MessageItemProps {
  message: Message;
  editingMessageId: string | null;
  editingContent: string;
  isLoading: boolean;
  onStartEditingMessage: (messageId: string, content: string) => void;
  onSaveEditedMessage: (messageId: string, newContent: string) => void;
  onCancelEditingMessage: () => void;
  onDeleteMessage: (messageId: string) => void;
  onRerunFromMessage: (messageId: string) => void;
  onEditingContentChange: (content: string) => void;
}

/**
 * MessageItem Component
 * 
 * Individual message bubble with comprehensive interactive features:
 * - Edit/save/cancel functionality for user messages
 * - Delete and re-run capabilities
 * - Performance metrics display (TTFT, TPS, token counts)
 * - Responsive design with hover interactions
 * - Proper accessibility features
 */
export const MessageItem: React.FC<MessageItemProps> = ({
  message,
  editingMessageId,
  editingContent,
  isLoading,
  onStartEditingMessage,
  onSaveEditedMessage,
  onCancelEditingMessage,
  onDeleteMessage,
  onRerunFromMessage,
  onEditingContentChange
}) => {
  const isUser = message.role === "user";
  const modelLabel = message.model ? ` (Model ${message.model})` : "";
  const hasMetrics = (message.token_count !== undefined) || (!isUser && (message.ttft_ms || message.avg_tps));
  const isEditing = editingMessageId === message.id;

  return (
    <div className={`mb-4 ${isUser ? "text-right" : "text-left"} group`}>
      {/* Inline container to group bubble and token count together */}
      <div className="inline-block relative">
        <div className={`relative inline-block p-3 rounded-lg max-w-3xl ${
          isUser 
            ? "bg-blue-500 text-white" 
            : message.model === "A" 
              ? "bg-green-100 text-green-800 border border-green-200"
              : message.model === "B"
                ? "bg-purple-100 text-purple-800 border border-purple-200"
                : "bg-gray-100 text-gray-800"
        }`}>
          {!isUser && (
            <div className="text-xs font-semibold mb-1">
              {isUser ? "You" : `Assistant${modelLabel}`}
            </div>
          )}
          
          {/* Message content or edit form */}
          {isEditing ? (
            <MessageEditor
              content={editingContent}
              isUser={isUser}
              onContentChange={onEditingContentChange}
              onSave={() => onSaveEditedMessage(message.id, editingContent)}
              onCancel={onCancelEditingMessage}
            />
          ) : (
            <div className="whitespace-pre-wrap">{message.content}</div>
          )}
          
          {/* Edit controls - only show for user messages and when not editing */}
          {isUser && !isEditing && (
            <div className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
              <button
                onClick={() => onRerunFromMessage(message.id)}
                disabled={isLoading}
                className="w-6 h-6 bg-white border border-blue-300 rounded-full hover:bg-blue-50 flex items-center justify-center shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                title="Re-run from here"
                aria-label="Re-run from here"
              >
                <svg className="w-3 h-3 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
              <button
                onClick={() => onStartEditingMessage(message.id, message.content)}
                className="w-6 h-6 bg-white border border-gray-300 rounded-full hover:bg-gray-50 flex items-center justify-center shadow-sm"
                title="Edit message"
                aria-label="Edit message"
              >
                <svg className="w-3 h-3 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
              <button
                onClick={() => onDeleteMessage(message.id)}
                className="w-6 h-6 bg-white border border-red-300 rounded-full hover:bg-red-50 flex items-center justify-center shadow-sm"
                title="Delete message"
                aria-label="Delete message"
              >
                <svg className="w-3 h-3 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          )}
          
          {/* Performance metrics widgets - small and unobtrusive in top-right corner */}
          {hasMetrics && (
            <div className="absolute top-1 right-1 flex flex-col items-end space-y-0.5">
              {/* TTFT (Time to First Token) widget */}
              {message.ttft_ms && (
                <div className={`px-1.5 py-0.5 rounded text-[10px] font-medium opacity-70 ${
                  message.model === "A" 
                    ? "bg-green-200 text-green-900" 
                    : message.model === "B"
                      ? "bg-purple-200 text-purple-900"
                      : "bg-gray-200 text-gray-900"
                }`}>
                  {message.ttft_ms}ms
                </div>
              )}
              
              {/* TPS (Tokens Per Second) widget */}
              {message.avg_tps && (
                <div className={`px-1.5 py-0.5 rounded text-[10px] font-medium opacity-70 ${
                  message.model === "A" 
                    ? "bg-green-200 text-green-900" 
                    : message.model === "B"
                      ? "bg-purple-200 text-purple-900"
                      : "bg-gray-200 text-gray-900"
                }`}>
                  {message.avg_tps.toFixed(1)}/s
                </div>
              )}
            </div>
          )}
        </div>
        
        {/* Generation time and token count as single caption with pipe separator */}
        {(message.token_count !== undefined || message.generation_time_ms !== undefined) && (
          <div className="text-right mt-1">
            <span className="text-xs text-gray-600">
              {message.generation_time_ms !== undefined && (
                `${(message.generation_time_ms / 1000).toFixed(1)}s`
              )}
              {message.generation_time_ms !== undefined && message.token_count !== undefined && " | "}
              {message.token_count !== undefined && (
                `${message.token_count} tokens`
              )}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default MessageItem;
import React from 'react';
import { MessageListContainer } from './MessageList';
import { ChatInput } from './ChatInput';
import { type Message } from './MessageItem';
import { useModelStore } from '../../stores/modelStore';
import { InfoIcon } from '../ui/InfoIcon';

interface ChatViewProps {
  // Chat state
  chatHistory: Message[];
  prompt: string;
  target: 'A' | 'B' | 'Both';
  isLoading: boolean;
  isStopping: boolean;
  viewMode: 'single' | 'dual';
  
  // Editing state
  editingMessageId: string | null;
  editingContent: string;
  streamingResponses: Record<string, string>;
  
  // Event handlers
  onPromptChange: (prompt: string) => void;
  onTargetChange: (target: 'A' | 'B' | 'Both') => void;
  onSendPrompt: () => Promise<void>;
  onStopGeneration: () => Promise<void>;
  onStartEditingMessage: (messageId: string, content: string) => void;
  onSaveEditedMessage: (messageId: string, newContent: string) => void;
  onCancelEditingMessage: () => void;
  onDeleteMessage: (messageId: string) => void;
  onRerunFromMessage: (messageId: string) => Promise<void>;
  onEditingContentChange: (content: string) => void;
  onClearMessages: () => void;
  
  // Helper functions
  getAvailableTargets: () => ('A' | 'B' | 'Both')[];
}

/**
 * ChatView Component
 * 
 * Orchestrates the chat interface by composing MessageListContainer and ChatInput:
 * - Handles the complete chat mode layout and functionality
 * - Maintains clean separation of concerns between message display and input
 * - Provides proper responsive layout with flex-based sizing
 * - Passes through all necessary props and event handlers
 * - Extracted from App.tsx for better modularity and maintainability
 */
export const ChatView: React.FC<ChatViewProps> = ({
  chatHistory,
  prompt,
  target,
  isLoading,
  isStopping,
  viewMode,
  editingMessageId,
  editingContent,
  streamingResponses,
  onPromptChange,
  onTargetChange,
  onSendPrompt,
  onStopGeneration,
  onStartEditingMessage,
  onSaveEditedMessage,
  onCancelEditingMessage,
  onDeleteMessage,
  onRerunFromMessage,
  onEditingContentChange,
  onClearMessages,
  getAvailableTargets
}) => {
  const { inputTokenCounts, outputTokenCounts, modelA, modelB } = useModelStore();

  const formatContext = (model: 'A' | 'B') => {
    const used = (inputTokenCounts[model] ?? 0) + (outputTokenCounts[model] ?? 0);
    const ctxSize = (model === 'A' ? modelA.n_ctx : modelB.n_ctx) ?? 2048;
    const pct = ctxSize > 0 ? Math.min(100, Math.round((used / ctxSize) * 1000) / 10) : 0;
    return { label: `${used} / ${ctxSize} | ${pct}%` };
  };

  const A = formatContext('A');
  const B = formatContext('B');

  return (
    <div className="flex-1 flex flex-col p-6 min-h-0">
      {/* Message Display Area */}
      <div className="flex-1 min-h-0">
        <MessageListContainer
          messages={chatHistory}
          streamingResponses={streamingResponses}
          target={target}
          viewMode={viewMode}
          editingMessageId={editingMessageId}
          editingContent={editingContent}
          isLoading={isLoading}
          onStartEditingMessage={onStartEditingMessage}
          onSaveEditedMessage={onSaveEditedMessage}
          onCancelEditingMessage={onCancelEditingMessage}
          onDeleteMessage={onDeleteMessage}
          onRerunFromMessage={onRerunFromMessage}
          onEditingContentChange={onEditingContentChange}
          onClearMessages={onClearMessages}
        />
      </div>

      {/* Context utilization bar under chat panels */}
      {viewMode === 'dual' ? (
        <div className="px-6 mt-2 mb-4 grid grid-cols-2 gap-6 text-xs text-gray-500">
          <div className="flex justify-end">
            <span className="flex items-center gap-1">
              {A.label}
              <InfoIcon
                title="Context window utilization"
                description={"This count includes the model’s chat-template tokens (role tags, separators, BOS/assistant prefix).\n\nTherefore it may not exactly match the sum of the message token counts shown in the bubbles."}
                position="top"
              />
            </span>
          </div>
          <div className="flex justify-end">
            <span className="flex items-center gap-1">
              {B.label}
              <InfoIcon
                title="Context window utilization"
                description={"This count includes the model’s chat-template tokens (role tags, separators, BOS/assistant prefix).\n\nTherefore it may not exactly match the sum of the message token counts shown in the bubbles."}
                position="top"
              />
            </span>
          </div>
        </div>
      ) : (
        <div className="px-6 mt-2 mb-4 text-xs text-gray-500 flex justify-end">
          <span className="flex items-center gap-1">
            {(target === 'A' ? A.label : target === 'B' ? B.label : (A.label))}
            <InfoIcon
              title="Context window utilization"
              description={"This count includes the model’s chat-template tokens (role tags, separators, BOS/assistant prefix).\n\nTherefore it may not exactly match the sum of the message token counts shown in the bubbles."}
              position="top"
            />
          </span>
        </div>
      )}
      
      {/* Chat Input */}
      <ChatInput
        prompt={prompt}
        target={target}
        isLoading={isLoading}
        isStopping={isStopping}
        availableTargets={getAvailableTargets()}
        onPromptChange={onPromptChange}
        onTargetChange={onTargetChange}
        onSendPrompt={onSendPrompt}
        onStopGeneration={onStopGeneration}
      />
    </div>
  );
};

export default ChatView;
import React from 'react';
import { MessageItem, type Message } from './MessageItem';
import { StreamingResponseContainer, ModelStreamingResponse } from './StreamingResponse';

// Shared message event handler props interface (DRY principle)
interface MessageEventHandlers {
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

// Header component with clear functionality (DRY design)
interface MessageListHeaderProps {
  title: string;
  titleClassName?: string;
  showClearButton: boolean;
  onClearMessages: () => void;
  clearButtonSize?: 'sm' | 'md';
  rightInfo?: React.ReactNode;
}

const MessageListHeader: React.FC<MessageListHeaderProps> = ({
  title,
  titleClassName = "text-lg font-medium text-gray-700",
  showClearButton,
  onClearMessages,
  clearButtonSize = 'md',
  rightInfo,
}) => {
  const buttonSizeClasses = clearButtonSize === 'sm' 
    ? "px-2 py-1 text-xs"
    : "px-3 py-1 text-sm";
    
  const iconSizeClasses = clearButtonSize === 'sm' 
    ? "w-3 h-3" 
    : "w-4 h-4";

  return (
    <div className="flex items-center justify-between mb-4">
      <h2 className={titleClassName}>{title}</h2>
      <div className="flex items-center gap-3">
        {rightInfo && (
          <span className="text-xs text-gray-500 whitespace-nowrap">{rightInfo}</span>
        )}
        {showClearButton && (
          <button
            onClick={onClearMessages}
            className={`${buttonSizeClasses} text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors flex items-center gap-1`}
            title="Clear all messages"
            aria-label="Clear all messages"
          >
            <svg 
              className={iconSizeClasses} 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" 
              />
            </svg>
            Clear
          </button>
        )}
      </div>
    </div>
  );
};

// Single MessageList component for unified view
interface SingleMessageListProps extends MessageEventHandlers {
  messages: Message[];
  streamingResponses: { A?: string; B?: string };
  target: 'A' | 'B' | 'Both';
  onClearMessages: () => void;
  className?: string;
}

export const SingleMessageList: React.FC<SingleMessageListProps> = ({
  messages,
  streamingResponses,
  target,
  isLoading,
  onClearMessages,
  className = "",
  ...messageHandlers
}) => {

  return (
    <div className={`bg-white rounded-lg shadow p-6 h-full overflow-y-auto relative ${className}`}>
      <MessageListHeader
        title="Conversation"
        showClearButton={messages.length > 0}
        onClearMessages={onClearMessages}
      />
      
      {messages.length === 0 && !isLoading ? (
        <div className="flex items-center justify-center h-32">
          <p className="text-gray-500 italic text-center">
            Start a conversation by entering a prompt below
          </p>
        </div>
      ) : (
        <>
          {/* Render all messages */}
          {messages.map((message) => (
            <MessageItem
              key={message.id}
              message={message}
              isLoading={isLoading}
              {...messageHandlers}
            />
          ))}
          
          {/* Streaming responses for current target */}
          <StreamingResponseContainer
            streamingResponses={streamingResponses}
            targetModel={target}
            isLoading={isLoading}
          />
        </>
      )}
    </div>
  );
};

// Model-specific MessageList for dual view
interface ModelMessageListProps extends MessageEventHandlers {
  model: 'A' | 'B';
  messages: Message[];
  streamingResponses: { A?: string; B?: string };
  onClearMessages: () => void;
  className?: string;
}

export const ModelMessageList: React.FC<ModelMessageListProps> = ({
  model,
  messages,
  streamingResponses,
  isLoading,
  onClearMessages,
  className = "",
  ...messageHandlers
}) => {

  // Filter messages for this specific model (user messages + model-specific responses)
  const filteredMessages = messages.filter(m => 
    m.role === "user" || m.model === model
  );

  // Model-specific styling
  const modelConfig = {
    A: {
      title: "Model A",
      titleClassName: "text-lg font-medium text-green-700"
    },
    B: {
      title: "Model B", 
      titleClassName: "text-lg font-medium text-purple-700"
    }
  };

  const config = modelConfig[model];

  return (
    <div className={`bg-white rounded-lg shadow p-6 overflow-y-auto relative ${className}`}>
      <MessageListHeader
        title={config.title}
        titleClassName={config.titleClassName}
        showClearButton={messages.length > 0}
        onClearMessages={onClearMessages}
        clearButtonSize="sm"
      />
      
      {/* Render filtered messages for this model */}
      {filteredMessages.map((message) => (
        <MessageItem
          key={message.id}
          message={message}
          isLoading={isLoading}
          {...messageHandlers}
        />
      ))}
      
      {/* Model-specific streaming response */}
      <ModelStreamingResponse
        model={model}
        streamingResponses={streamingResponses}
        isLoading={isLoading}
      />
    </div>
  );
};

// Dual MessageList container component
interface DualMessageListProps extends MessageEventHandlers {
  messages: Message[];
  streamingResponses: { A?: string; B?: string };
  onClearMessages: () => void;
  className?: string;
}

export const DualMessageList: React.FC<DualMessageListProps> = ({
  messages,
  streamingResponses,
  onClearMessages,
  className = "",
  ...messageHandlers
}) => {
  return (
    <div className={`grid grid-cols-2 gap-6 h-full ${className}`}>
      <ModelMessageList
        model="A"
        messages={messages}
        streamingResponses={streamingResponses}
        onClearMessages={onClearMessages}
        {...messageHandlers}
      />
      <ModelMessageList
        model="B"
        messages={messages}
        streamingResponses={streamingResponses}
        onClearMessages={onClearMessages}
        {...messageHandlers}
      />
    </div>
  );
};

// Main MessageList container that handles view mode switching
interface MessageListContainerProps extends MessageEventHandlers {
  messages: Message[];
  streamingResponses: { A?: string; B?: string };
  target: 'A' | 'B' | 'Both';
  viewMode: 'single' | 'dual';
  onClearMessages: () => void;
  className?: string;
}

export const MessageListContainer: React.FC<MessageListContainerProps> = ({
  messages,
  streamingResponses,
  target,
  viewMode,
  onClearMessages,
  className = "",
  ...messageHandlers
}) => {
  if (viewMode === 'dual') {
    return (
      <DualMessageList
        messages={messages}
        streamingResponses={streamingResponses}
        onClearMessages={onClearMessages}
        className={className}
        {...messageHandlers}
      />
    );
  }

  return (
    <SingleMessageList
      messages={messages}
      streamingResponses={streamingResponses}
      target={target}
      onClearMessages={onClearMessages}
      className={className}
      {...messageHandlers}
    />
  );
};

export default MessageListContainer;
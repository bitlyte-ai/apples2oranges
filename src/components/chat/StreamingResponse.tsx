import React from 'react';

interface StreamingResponseProps {
  model: 'A' | 'B';
  response: string;
  className?: string;
}

/**
 * StreamingResponse Component
 * 
 * Displays real-time streaming responses from AI models with visual feedback:
 * - Model-specific color coding (A=green, B=purple)
 * - Animated cursor indicator for active streaming
 * - Responsive design matching MessageItem styling
 * - Proper text formatting with whitespace preservation
 * - Null-safe rendering with conditional display
 */
export const StreamingResponse: React.FC<StreamingResponseProps> = ({
  model,
  response,
  className = ""
}) => {
  // Return null if no response to stream
  if (!response) {
    return null;
  }

  // Model-specific styling configuration
  const modelStyles = {
    A: {
      bubble: "bg-green-100 text-green-800 border border-green-200",
      label: "text-green-800"
    },
    B: {
      bubble: "bg-purple-100 text-purple-800 border border-purple-200", 
      label: "text-purple-800"
    }
  };

  const styles = modelStyles[model];

  return (
    <div className={`mb-4 text-left ${className}`}>
      <div className={`inline-block p-3 rounded-lg max-w-3xl ${styles.bubble}`}>
        {/* Model identifier header */}
        <div className={`text-xs font-semibold mb-1 ${styles.label}`}>
          Assistant (Model {model})
        </div>
        
        {/* Streaming response content with preserved formatting */}
        <div className="whitespace-pre-wrap">
          {response}
        </div>
        
        {/* Animated streaming cursor - indicates active generation */}
        <div className="animate-pulse inline-block ml-1" aria-label="Generating response">
          ▋
        </div>
      </div>
    </div>
  );
};

/**
 * StreamingResponseContainer Component
 * 
 * Container component that handles conditional rendering of streaming responses.
 * Used to manage multiple models and provide consistent API.
 */
interface StreamingResponseContainerProps {
  streamingResponses: { A?: string; B?: string };
  targetModel?: 'A' | 'B' | 'Both';
  isLoading: boolean;
  className?: string;
}

export const StreamingResponseContainer: React.FC<StreamingResponseContainerProps> = ({
  streamingResponses,
  targetModel,
  isLoading,
  className = ""
}) => {
  // Don't render anything if not loading
  if (!isLoading) {
    return null;
  }

  // Render based on target model configuration
  return (
    <div className={className}>
      {/* Single view mode - render for target model(s) */}
      {targetModel === 'A' && streamingResponses.A && (
        <StreamingResponse model="A" response={streamingResponses.A} />
      )}
      {targetModel === 'B' && streamingResponses.B && (
        <StreamingResponse model="B" response={streamingResponses.B} />
      )}
      {targetModel === 'Both' && (
        <>
          {streamingResponses.A && (
            <StreamingResponse model="A" response={streamingResponses.A} />
          )}
          {streamingResponses.B && (
            <StreamingResponse model="B" response={streamingResponses.B} />
          )}
        </>
      )}
    </div>
  );
};

/**
 * Individual model streaming response for dual view layouts
 */
interface ModelStreamingResponseProps {
  model: 'A' | 'B';
  streamingResponses: { A?: string; B?: string };
  isLoading: boolean;
  className?: string;
}

export const ModelStreamingResponse: React.FC<ModelStreamingResponseProps> = ({
  model,
  streamingResponses,
  isLoading,
  className = ""
}) => {
  if (!isLoading || !streamingResponses[model]) {
    return null;
  }

  return (
    <StreamingResponse 
      model={model} 
      response={streamingResponses[model]} 
      className={className}
    />
  );
};

export default StreamingResponse;
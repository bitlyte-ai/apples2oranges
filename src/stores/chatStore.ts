import { create } from 'zustand';

// Import interfaces from App.tsx that will be moved to types later
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

export interface ChatState {
  // Chat state
  chatHistory: Message[];
  prompt: string;
  isLoading: boolean;
  isStopping: boolean;
  target: 'A' | 'B' | 'Both';
  streamingResponses: { A?: string; B?: string };

  // Message editing state
  editingMessageId: string | null;
  editingContent: string;

  // Actions
  setChatHistory: (history: Message[]) => void;
  setPrompt: (prompt: string) => void;
  setIsLoading: (loading: boolean) => void;
  setIsStopping: (stopping: boolean) => void;
  setTarget: (target: 'A' | 'B' | 'Both') => void;
  setStreamingResponses: (responses: { A?: string; B?: string }) => void;
  setEditingMessageId: (id: string | null) => void;
  setEditingContent: (content: string) => void;
  
  // Helper actions
  updateMessageTokenCount: (role: 'user' | 'assistant', model: string | undefined, count: number) => void;
  updateMessageGenerationTime: (model: string, generationTimeMs: number) => void;
  addMessage: (message: Message) => void;
  updateMessage: (id: string, updates: Partial<Message>) => void;
  startEditingMessage: (messageId: string, content: string) => void;
  saveMessageEdit: () => void;
  cancelMessageEdit: () => void;
  
  // Streaming helpers
  addTokenToStreaming: (model: 'A' | 'B', token: string) => void;
  clearStreamingForModel: (model: 'A' | 'B') => void;
  finishStreamingForModel: (model: 'A' | 'B', summaryStats: any, generateMessageId: () => string) => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  // Initial state
  chatHistory: [],
  prompt: '',
  isLoading: false,
  isStopping: false,
  target: 'A',
  streamingResponses: {},
  editingMessageId: null,
  editingContent: '',

  // Basic setters
  setChatHistory: (history) => set({ chatHistory: history }),
  setPrompt: (prompt) => set({ prompt }),
  setIsLoading: (loading) => set({ isLoading: loading }),
  setIsStopping: (stopping) => set({ isStopping: stopping }),
  setTarget: (target) => set({ target }),
  setStreamingResponses: (responses) => set({ streamingResponses: responses }),
  setEditingMessageId: (id) => set({ editingMessageId: id }),
  setEditingContent: (content) => set({ editingContent: content }),

  // Helper actions
  updateMessageTokenCount: (role: 'user' | 'assistant', model: string | undefined, count: number) => {
    const { chatHistory } = get();
    if (chatHistory.length === 0) return;
    
    if (role === 'user') {
      // For user messages, update the most recent user message
      const lastMessage = chatHistory[chatHistory.length - 1];
      if (lastMessage.role === 'user' && lastMessage.token_count === undefined) {
        const updatedHistory = [...chatHistory];
        updatedHistory[updatedHistory.length - 1] = {
          ...lastMessage,
          token_count: count
        };
        console.log(`📊 Updated user message token count: ${count}`);
        set({ chatHistory: updatedHistory });
      }
    } else if (role === 'assistant' && model) {
      // For assistant messages, find the most recent assistant message from this specific model
      for (let i = chatHistory.length - 1; i >= 0; i--) {
        const message = chatHistory[i];
        if (message.role === 'assistant' && message.model === model && message.token_count === undefined) {
          const updatedHistory = [...chatHistory];
          updatedHistory[i] = {
            ...message,
            token_count: count
          };
          console.log(`📊 Updated assistant message (Model ${model}) token count: ${count}`);
          set({ chatHistory: updatedHistory });
          break;
        }
      }
    }
  },

  updateMessageGenerationTime: (model: string, generationTimeMs: number) => {
    const { chatHistory } = get();
    if (chatHistory.length === 0) return;
    
    // Find the most recent assistant message from this specific model
    for (let i = chatHistory.length - 1; i >= 0; i--) {
      const message = chatHistory[i];
      if (message.role === 'assistant' && message.model === model && message.generation_time_ms === undefined) {
        const updatedHistory = [...chatHistory];
        updatedHistory[i] = {
          ...message,
          generation_time_ms: generationTimeMs
        };
        console.log(`⏱️ Updated assistant message (Model ${model}) generation time: ${generationTimeMs}ms`);
        set({ chatHistory: updatedHistory });
        break;
      }
    }
  },

  addMessage: (message) => {
    const { chatHistory } = get();
    set({ chatHistory: [...chatHistory, message] });
  },

  updateMessage: (id, updates) => {
    const { chatHistory } = get();
    const updatedHistory = chatHistory.map(msg => 
      msg.id === id ? { ...msg, ...updates } : msg
    );
    set({ chatHistory: updatedHistory });
  },

  startEditingMessage: (messageId, content) => {
    set({ editingMessageId: messageId, editingContent: content });
  },

  saveMessageEdit: () => {
    const { editingMessageId, editingContent, chatHistory } = get();
    if (!editingMessageId) return;

    const updatedHistory = chatHistory.map(msg => 
      msg.id === editingMessageId 
        ? { ...msg, content: editingContent, isEditing: false }
        : msg
    );
    
    set({ 
      chatHistory: updatedHistory,
      editingMessageId: null,
      editingContent: ''
    });
  },

  cancelMessageEdit: () => {
    set({ editingMessageId: null, editingContent: '' });
  },

  // Streaming helpers
  addTokenToStreaming: (model: 'A' | 'B', token: string) => {
    const { streamingResponses } = get();
    const currentResponse = streamingResponses[model] || '';
    const newResponse = currentResponse + token;
    set({ 
      streamingResponses: {
        ...streamingResponses,
        [model]: newResponse
      }
    });
  },

  clearStreamingForModel: (model: 'A' | 'B') => {
    const { streamingResponses } = get();
    set({ 
      streamingResponses: {
        ...streamingResponses,
        [model]: ''
      }
    });
  },

  finishStreamingForModel: (model: 'A' | 'B', summaryStats: any, generateMessageId: () => string) => {
    const { streamingResponses, chatHistory } = get();
    const finalResponse = streamingResponses[model] || '';
    
    if (finalResponse) {
      const assistantMessage: Message = {
        id: generateMessageId(),
        role: 'assistant',
        content: finalResponse,
        model: model,
        ttft_ms: summaryStats[model]?.ttft_ms,
        avg_tps: summaryStats[model]?.avg_tps
      };
      
      set({ 
        chatHistory: [...chatHistory, assistantMessage],
        streamingResponses: {
          ...streamingResponses,
          [model]: ''
        }
      });
    } else {
      // Just clear the streaming if no response
      set({ 
        streamingResponses: {
          ...streamingResponses,
          [model]: ''
        }
      });
    }
  },
}));

import { useEffect, useRef, useCallback, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { AnalysisDashboard } from './components/charts/analysis/AnalysisDashboard';
import { SessionSaveDialog } from './components/ui/SessionSaveDialog';
import { UnsavedChangesDialog } from './components/ui/UnsavedChangesDialog';
import { subscribeToSessions, getAllSessions, sessionStorage } from './utils/sessionStorage';
import { SessionPersistence } from './services/sessionPersistence';
import { useSessionState } from './hooks/useSessionState';
import { useOverlayTelemetry } from './hooks/useOverlayTelemetry';
import { useTauriEventListeners } from './hooks/useTauriEventListeners';
import { useWindowEventHandlers } from './hooks/useWindowEventHandlers';
import { useChatHandlers } from './hooks/useChatHandlers';
import { LeftSidebar } from './components/layout/LeftSidebar';
import { AppHeader } from './components/layout/AppHeader';
import { RightSidebar } from './components/layout/RightSidebar';
import { ChatView } from './components/chat/ChatView';
import { useChatStore } from './stores/chatStore';
import { useModelStore, type ModelConfig } from './stores/modelStore';
import { useTelemetryStore } from './stores/telemetryStore';
import { useUIStore } from './stores/uiStore';
import "./App.css";



function App() {
  // Chat state from Zustand store
  const {
    chatHistory, setChatHistory,
    prompt, setPrompt,
    isLoading, setIsLoading,
    isStopping, setIsStopping,
    target, setTarget,
    streamingResponses, setStreamingResponses,
    editingMessageId,
    editingContent, setEditingContent,
    updateMessageTokenCount,
    updateMessageGenerationTime,
    startEditingMessage,
    saveMessageEdit,
    cancelMessageEdit,
    addTokenToStreaming,
    clearStreamingForModel,
    finishStreamingForModel
  } = useChatStore();
  
  // Model configuration state from Zustand store
  const {
    appMode, setAppMode,
    modelA, setModelA,
    modelB, setModelB,
    systemPrompt, setSystemPrompt,
    telemetry_sampling_hz, setTelemetrySamplingHz,
    run_without_telemetry, setRunWithoutTelemetry,
    chart_refresh_ms, setChartRefreshMs,
    inputTokenCounts: _inputTokenCounts,  // Aggregate per-model token counts for analytics
    outputTokenCounts: _outputTokenCounts, // Aggregate per-model token counts for analytics
    systemPromptTokenCount, setSystemPromptTokenCount,
    resetTokenCounts,
    updateInputTokenCount,
    updateOutputTokenCount,
    getFilenameFromPath,
    // New sync actions from store (Phase 7.2)
    syncModelBToA,
    syncModelAToB
  } = useModelStore();
  
  // Telemetry state from Zustand store
  const {
    telemetryData,
    summaryStats,
    addTelemetryData,
    clearTelemetryData,
    clearSummaryStats,
    getLatestTelemetry,
    transformTelemetryData,
    updateSummaryStats,
    setTelemetryData,
    setSummaryStats,
    // Session management state
    telemetrySessions, setTelemetrySessions,
    sessionSaveDialogOpen, setSessionSaveDialogOpen,
    unsavedChangesDialogOpen, setUnsavedChangesDialogOpen,
    pendingCloseAction, setPendingCloseAction,
    dialogContext, setDialogContext,
  } = useTelemetryStore();
  
  // UI layout state from Zustand store
  const {
    viewMode, setViewMode,
    activeTab, setActiveTab,
    rightSidebarWidth, setRightSidebarWidth,
    isRightSidebarCollapsed, setRightSidebarCollapsed,
    // Model path input focus states (for display vs edit modes)
    modelAPathFocused, setModelAPathFocused,
    modelBPathFocused, setModelBPathFocused
  } = useUIStore();
  
  // Context validation warning state
  const [contextValidationWarnings, setContextValidationWarnings] = useState<{
    modelA: boolean;
    modelB: boolean;
  }>({ modelA: false, modelB: false });
  
  // Helper function to clear warnings when context is set
  const clearWarningIfContextSet = (modelId: 'A' | 'B', config: ModelConfig) => {
    if (config.n_ctx && contextValidationWarnings[`model${modelId}`]) {
      setContextValidationWarnings((prev: { modelA: boolean; modelB: boolean }) => ({
        ...prev,
        [`model${modelId}`]: false
      }));
    }
  };
  
  // Wrapper functions that clear warnings when context is set
  const handleModelAChange = (config: ModelConfig) => {
    setModelA(config);
    clearWarningIfContextSet('A', config);
  };
  
  const handleModelBChange = (config: ModelConfig) => {
    setModelB(config);
    clearWarningIfContextSet('B', config);
  };
  
  
  // Overlay telemetry management
  const overlayTelemetry = useOverlayTelemetry({
    onSessionStart: (_model, _sessionId) => {},
    onSessionEnd: (_model, _sessionId) => {},
  });


  // Use ref to stabilize overlay telemetry methods for event listeners
  const overlayTelemetryRef = useRef(overlayTelemetry);
  overlayTelemetryRef.current = overlayTelemetry;
  
  // Session state management
  const sessionState = useSessionState({
    chatHistory,
    telemetryData: transformTelemetryData(),
    systemPrompt,
    modelAPath: modelA.model_path,
    modelBPath: modelB.model_path,
    modelAContextSize: modelA.n_ctx || 0, // Use 0 for undefined to indicate not set
    modelBContextSize: modelB.n_ctx || 0, // Use 0 for undefined to indicate not set
  });

  // Defer-baseline state for session restoration
  const [isRestoringSession, setIsRestoringSession] = useState(false);
  const [pendingBaseline, setPendingBaseline] = useState<{
    uuid: string;
    expectedChatLen: number;
    expectedTelemetryLen: number;
  } | null>(null);

  // Initial hydration: if past session exists, populate model configs from SQLite, else leave empty
  useEffect(() => {
    const hydrateFromLastSession = async () => {
      try {
        const sessions = await SessionPersistence.getSavedSessions();
        if (Array.isArray(sessions) && sessions.length > 0) {
          const latest = sessions[0]; // ordered by updated_at DESC
          const cfg = (latest as any).session_data?.configuration;
          if (cfg?.model_a) { setModelA(cfg.model_a); }
          if (cfg?.model_b) { setModelB(cfg.model_b); }
          if (cfg?.system_prompt !== undefined) { setSystemPrompt(cfg.system_prompt); }
          if (cfg?.telemetry_sampling_hz) { setTelemetrySamplingHz(cfg.telemetry_sampling_hz); }
        }
      } catch (err) {
        console.warn('Initial model hydration skipped (no past session or DB unavailable):', err);
      }
    };
    hydrateFromLastSession();
  }, []);
  
  
  // Helper function to generate unique message IDs
  const generateMessageId = (): string => {
    return `msg_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
  };
  
  
  // Use chatStore methods for consistency
  const cancelEditingMessage = cancelMessageEdit;
  const saveEditedMessage = (_messageId: string, newContent: string) => {
    if (!newContent.trim()) return;
    // Update the content in the editing state, then save
    setEditingContent(newContent.trim());
    saveMessageEdit();
  };
  
  const deleteMessage = (messageId: string) => {
    const updatedHistory = chatHistory.filter(message => message.id !== messageId);
    setChatHistory(updatedHistory);
  };
  
  // Data validation function
  const validateSessionData = (sessionData: any): string[] => {
    const errors: string[] = [];

    if (!sessionData.chat_history?.length && !sessionData.telemetry_data?.length) {
      errors.push("Session must contain either chat messages or telemetry data");
    }

    if (sessionData.configuration?.model_a?.model_path === "") {
      errors.push("Model A path cannot be empty");
    }

    if (sessionData.configuration?.model_b?.model_path === "") {
      errors.push("Model B path cannot be empty");
    }

    return errors;
  };

  // Handle session saving with database integration
  const handleSessionSave = async (sessionName: string) => {
    console.log('💾 Saving session to database:', sessionName);

    try {
      // Capture complete current state with data filtering
      const cleanChatHistory = chatHistory.map(msg => ({
        id: msg.id,
        role: msg.role,
        content: msg.content,
        model: msg.model,
        ttft_ms: msg.ttft_ms,
        avg_tps: msg.avg_tps,
        token_count: msg.token_count,
        generation_time_ms: msg.generation_time_ms
        // Explicitly exclude: isEditing
      }));

      const completeSessionData = {
        schema_version: 1,
        session_metadata: {
          saved_at: Date.now(),
          app_version: "1.0.0",
          target: target,
          saved_during_inference: isLoading,
        },
        chat_history: cleanChatHistory,
          configuration: {
          model_a: modelA,
          model_b: modelB,
          system_prompt: systemPrompt,
          telemetry_sampling_hz,
          wait_for_cpu_baseline_between_models: (modelA as any).wait_for_cpu_baseline_between_models || (modelB as any).wait_for_cpu_baseline_between_models || false,
          wait_for_cpu_baseline_margin_c: (modelA as any).wait_for_cpu_baseline_margin_c ?? (modelB as any).wait_for_cpu_baseline_margin_c ?? 2.0,
          run_without_telemetry,
        },
        telemetry_data: transformTelemetryData(),
        summary_stats: summaryStats,
      };

      // Validate before save
      const validationErrors = validateSessionData(completeSessionData);
      if (validationErrors.length > 0) {
        console.error('❌ Session validation failed:', validationErrors);
        // Show validation error to user
        return;
      }

      // Save to database
      const savedSession = await SessionPersistence.saveCurrentSession(
        sessionName,
        completeSessionData
      );

      // Mark as saved in session state
      sessionState.markAsSaved(savedSession.uuid);
      console.log('💾 Session saved successfully:', savedSession.uuid);
      
      // Create a telemetry session for analysis mode
      try {
        const telemetryDataForAnalysis = transformTelemetryData();
        if (telemetryDataForAnalysis.length > 0) {
          console.log('📊 Creating telemetry session for analysis mode...');
          
          // Calculate summary stats for analysis
          const duration = telemetryDataForAnalysis.length > 1 
            ? telemetryDataForAnalysis[telemetryDataForAnalysis.length - 1].timestamp - telemetryDataForAnalysis[0].timestamp 
            : 0;
          
          const validTpsValues = telemetryDataForAnalysis
            .map(d => d.tps)
            .filter(tps => tps !== null && tps > 0) as number[];
          
          const avgTps = validTpsValues.length > 0 
            ? validTpsValues.reduce((sum, tps) => sum + tps, 0) / validTpsValues.length 
            : 0;
          
          const validCpuTemps = telemetryDataForAnalysis
            .map(d => d.cpu_temp_avg || d.cpu_temp)
            .filter(temp => temp !== null) as number[];
          
          const peakCpuTemp = validCpuTemps.length > 0 ? Math.max(...validCpuTemps) : 0;
          
          // Create model performance from summary stats
          const modelPerformance: { [model: string]: { ttft_ms: number; avg_tps: number } } = {};
          if (summaryStats.A) {
            modelPerformance['A'] = {
              ttft_ms: summaryStats.A.ttft_ms || 0,
              avg_tps: summaryStats.A.avg_tps || 0
            };
          }
          if (summaryStats.B) {
            modelPerformance['B'] = {
              ttft_ms: summaryStats.B.ttft_ms || 0,
              avg_tps: summaryStats.B.avg_tps || 0
            };
          }
          
          // Create TelemetrySession for analysis
            const analysisSession: any = {
              id: savedSession.uuid,
              name: sessionName,
              timestamp: Date.now(),
              model_info: {
                model_a: modelA.model_path,
                model_b: modelB.model_path,
              },
                config: {
                  telemetry_sampling_hz,
                  wait_for_cpu_baseline_between_models: (modelA as any).wait_for_cpu_baseline_between_models || (modelB as any).wait_for_cpu_baseline_between_models || false,
                  wait_for_cpu_baseline_margin_c: (modelA as any).wait_for_cpu_baseline_margin_c ?? (modelB as any).wait_for_cpu_baseline_margin_c ?? 2.0,
                  run_without_telemetry,
                },
              data: telemetryDataForAnalysis,
              summary: {
              duration_ms: duration,
              total_tokens: validTpsValues.reduce((sum, tps, index) => {
                const nextIndex = index + 1;
                if (nextIndex < telemetryDataForAnalysis.length) {
                  const timeInterval = (telemetryDataForAnalysis[nextIndex].timestamp - telemetryDataForAnalysis[index].timestamp) / 1000;
                  return sum + (tps * timeInterval);
                }
                return sum;
              }, 0),
              avg_tps: avgTps,
              peak_cpu_temp: peakCpuTemp,
              avg_power_consumption: 0,
              model_performance: modelPerformance
            },
            chat_history: cleanChatHistory,
            system_prompt: systemPrompt
          };
          
          // Add to both Zustand store and in-memory sessionStorage
          sessionStorage.addSession(analysisSession);
          const currentSessions = [...telemetrySessions];
          const existingIndex = currentSessions.findIndex(s => s.id === analysisSession.id);
          if (existingIndex >= 0) {
            currentSessions[existingIndex] = analysisSession;
          } else {
            currentSessions.push(analysisSession);
          }
          setTelemetrySessions(currentSessions);
          
          console.log('✅ Telemetry session created for analysis mode');
        }
      } catch (error) {
        console.error('⚠️ Failed to create analysis session:', error);
        // Continue even if analysis session creation fails
      }

      // Handle pending close action if exists
      if (pendingCloseAction) {
        setSessionSaveDialogOpen(false);
        setTimeout(() => {
          pendingCloseAction();
          setPendingCloseAction(null);
        }, 50);
      }

    } catch (error) {
      console.error('❌ Failed to save session:', error);
      // Show error notification to user
      // TODO: Add error toast/notification
    }
  };

  // Helper function for telemetry decompression
  const decompressTelemetryData = async (compressedData: any): Promise<any[]> => {
    try {
      console.log('🔄 Decompressing telemetry data:', compressedData);
      
      // Call the Tauri command to decompress the data
      const decompressed = await invoke('decompress_telemetry', { 
        compressedData: compressedData 
      });
      
      console.log('✅ Telemetry decompression successful, points:', Array.isArray(decompressed) ? decompressed.length : 0);
      return decompressed as any[];
    } catch (error) {
      console.error('❌ Failed to decompress telemetry data:', error);
      // Fallback: try to handle the data as-is if it's already an array
      if (Array.isArray(compressedData)) {
        console.log('📄 Falling back to treating data as already decompressed array');
        return compressedData;
      }
      // Another fallback: extract data field if it exists
      if (compressedData && compressedData.data) {
        console.log('📄 Falling back to extracting data field');
        return compressedData.data;
      }
      throw error;
    }
  };

// Session loading function
  const handleSessionLoad = async (sessionUuid: string) => {
    const txnId = `load_${sessionUuid}_${Date.now()}`;
    try {
      const savedSession = await SessionPersistence.loadSession(sessionUuid);
      if (!savedSession) {
        console.error(`[${txnId}] ❌ Session not found`);
        return;
      }

      const sessionData = savedSession.session_data;

      // Prepare expected baseline targets
      let expectedChatLen = Array.isArray(sessionData.chat_history) ? sessionData.chat_history.length : 0;
      let expectedTelemetryLen = 0;

      // Validate loaded session data
      if (!sessionData.schema_version) {
        // legacy session data detected
      }

      // Clear current state first
      setChatHistory([]);
      clearTelemetryData();
      clearSummaryStats();
      setStreamingResponses({});

      // Restore all state from saved session
      if (sessionData.chat_history) {
        setChatHistory(sessionData.chat_history);
        expectedChatLen = sessionData.chat_history.length;
      }

      if (sessionData.configuration) {
        const config = sessionData.configuration;
        if (config.model_a) { setModelA(config.model_a); }
        if (config.model_b) { setModelB(config.model_b); }
        if (config.system_prompt !== undefined) { setSystemPrompt(config.system_prompt); }
        if (config.telemetry_sampling_hz) { setTelemetrySamplingHz(config.telemetry_sampling_hz); }
      }

      // Restore target from metadata
      if (sessionData.session_metadata?.target) {
        setTarget(sessionData.session_metadata.target);
      }

      // Restore telemetry data if present
      if (sessionData.telemetry_data) {
        try {
          let telemetryData: any[];
          
          // Check if data is in compressed format or raw array format
          if (sessionData.telemetry_data.compressed !== undefined) {
            // New compressed format: {compressed: boolean, original_length: number, data: string}
            telemetryData = await decompressTelemetryData(sessionData.telemetry_data);
          } else if (Array.isArray(sessionData.telemetry_data)) {
            // Raw array format (legacy or uncompressed)
            telemetryData = sessionData.telemetry_data;
          } else {
            // Try to decompress in case it's an unknown compressed format
            telemetryData = await decompressTelemetryData(sessionData.telemetry_data);
          }

          // Validate and restore telemetry data
          if (Array.isArray(telemetryData) && telemetryData.length > 0) {
            setTelemetryData(telemetryData);
            expectedTelemetryLen = telemetryData.length;
          } else {
            expectedTelemetryLen = 0;
          }
        } catch (error) {
          console.error(`[${txnId}] ❌ Failed to restore telemetry data:`, error);
          // Continue loading other session data even if telemetry fails
        }
      } else {
        expectedTelemetryLen = 0;
      }

      // Restore summary stats
      if (sessionData.summary_stats) {
        setSummaryStats(sessionData.summary_stats);
      }

      // Defer baseline snapshot until post-render stabilization
      setIsRestoringSession(true);
      setPendingBaseline({
        uuid: savedSession.uuid,
        expectedChatLen,
        expectedTelemetryLen,
      });
      
      // Create telemetry session for analysis mode when loading
      try {
        if (sessionData.telemetry_data) {
          // Get the telemetry data that was already processed above
          let telemetryDataForAnalysis: any[] = [];
          if (sessionData.telemetry_data.compressed !== undefined) {
            telemetryDataForAnalysis = await decompressTelemetryData(sessionData.telemetry_data);
          } else if (Array.isArray(sessionData.telemetry_data)) {
            telemetryDataForAnalysis = sessionData.telemetry_data;
          }
          
          if (telemetryDataForAnalysis.length > 0) {
            // Calculate summary stats
            const duration = telemetryDataForAnalysis.length > 1 
              ? telemetryDataForAnalysis[telemetryDataForAnalysis.length - 1].timestamp - telemetryDataForAnalysis[0].timestamp 
              : 0;
            
            const validTpsValues = telemetryDataForAnalysis
              .map(d => d.tps)
              .filter(tps => tps !== null && tps > 0) as number[];
            
            const avgTps = validTpsValues.length > 0 
              ? validTpsValues.reduce((sum, tps) => sum + tps, 0) / validTpsValues.length 
              : 0;
            
            const validCpuTemps = telemetryDataForAnalysis
              .map(d => d.cpu_temp_avg || d.cpu_temp)
              .filter(temp => temp !== null) as number[];
            
            const peakCpuTemp = validCpuTemps.length > 0 ? Math.max(...validCpuTemps) : 0;
            
            // Create model performance from saved summary stats
            const modelPerformance: { [model: string]: { ttft_ms: number; avg_tps: number } } = {};
            if (sessionData.summary_stats) {
              Object.entries(sessionData.summary_stats).forEach(([model, stats]: [string, any]) => {
                if (stats.ttft_ms !== undefined && stats.avg_tps !== undefined) {
                  modelPerformance[model] = {
                    ttft_ms: stats.ttft_ms,
                    avg_tps: stats.avg_tps
                  };
                }
              });
            }
            
            // Create TelemetrySession for analysis
            const analysisSession: any = {
                id: savedSession.uuid,
                name: savedSession.name,
                timestamp: savedSession.created_at * 1000, // Convert to milliseconds
                model_info: {
                  model_a: sessionData.configuration?.model_a?.model_path,
                  model_b: sessionData.configuration?.model_b?.model_path,
                },
                config: {
                  telemetry_sampling_hz: sessionData.configuration?.telemetry_sampling_hz,
                  wait_for_cpu_baseline_between_models: sessionData.configuration?.wait_for_cpu_baseline_between_models || false,
                  wait_for_cpu_baseline_margin_c: sessionData.configuration?.wait_for_cpu_baseline_margin_c ?? 2.0,
                  run_without_telemetry: sessionData.configuration?.run_without_telemetry || false,
                },
                data: telemetryDataForAnalysis,
              summary: {
                duration_ms: duration,
                total_tokens: validTpsValues.reduce((sum, tps, index) => {
                  const nextIndex = index + 1;
                  if (nextIndex < telemetryDataForAnalysis.length) {
                    const timeInterval = (telemetryDataForAnalysis[nextIndex].timestamp - telemetryDataForAnalysis[index].timestamp) / 1000;
                    return sum + (tps * timeInterval);
                  }
                  return sum;
                }, 0),
                avg_tps: avgTps,
                peak_cpu_temp: peakCpuTemp,
                avg_power_consumption: 0,
                model_performance: modelPerformance
              },
              chat_history: sessionData.chat_history,
              system_prompt: sessionData.configuration?.system_prompt
            };
            
            // Add to both in-memory sessionStorage and Zustand store
            sessionStorage.addSession(analysisSession);
            const currentSessions = [...telemetrySessions];
            const existingIndex = currentSessions.findIndex(s => s.id === analysisSession.id);
            if (existingIndex >= 0) {
              currentSessions[existingIndex] = analysisSession;
            } else {
              currentSessions.push(analysisSession);
            }
            setTelemetrySessions(currentSessions);
          }
        }
      } catch (error) {
        console.error(`[${txnId}] ⚠️ Failed to create analysis session from loaded data:`, error);
        // Continue even if analysis session creation fails
      }


    } catch (error) {
      console.error(`[${txnId}] ❌ Failed to load session:`, error);
      // Show error notification
    }
  };
  
  
  // Set up Tauri event listeners using the extracted utility hook
  useTauriEventListeners({
    // Store action methods (not state) - follows existing pattern
    addTokenToStreaming,
    finishStreamingForModel,
    clearStreamingForModel,
    updateMessageTokenCount,
    updateMessageGenerationTime,
    updateInputTokenCount,
    updateOutputTokenCount,
    setSystemPromptTokenCount,
    addTelemetryData,
    updateSummaryStats,
    overlayTelemetryRef,
    // Additional dependencies
    streamingResponses,
    chatHistory,
    setChatHistory,
    setIsLoading,
    setIsStopping,
    summaryStats,
    telemetryData,
    generateMessageId,
  });
  
  // Load sessions from SQLite database for analysis mode
  useEffect(() => {
    const loadSavedSessionsForAnalysis = async () => {
      try {
        const savedSessions = await SessionPersistence.getSavedSessions();
        
        // Convert SQLite sessions to TelemetrySession format for analysis
        const telemetrySessions = await Promise.all(
          savedSessions.map(async (savedSession) => {
            try {
              // Extract telemetry data from session
              const sessionData = savedSession.session_data;
              let telemetryData: any[] = [];
              
              if (sessionData.telemetry_data) {
                // Handle different telemetry data formats
                if (sessionData.telemetry_data.compressed !== undefined) {
                  // Compressed format
                  telemetryData = await decompressTelemetryData(sessionData.telemetry_data);
                } else if (Array.isArray(sessionData.telemetry_data)) {
                  // Raw array format
                  telemetryData = sessionData.telemetry_data;
                }
              }
              
              // Skip sessions without telemetry data
              if (telemetryData.length === 0) {
                return null;
              }
              
              // Calculate summary stats from telemetry data
              const duration = telemetryData.length > 1 
                ? telemetryData[telemetryData.length - 1].timestamp - telemetryData[0].timestamp 
                : 0;
              
              const validTpsValues = telemetryData
                .map(d => d.tps)
                .filter(tps => tps !== null && tps > 0) as number[];
              
              const avgTps = validTpsValues.length > 0 
                ? validTpsValues.reduce((sum, tps) => sum + tps, 0) / validTpsValues.length 
                : 0;
              
              const validCpuTemps = telemetryData
                .map(d => d.cpu_temp_avg || d.cpu_temp)
                .filter(temp => temp !== null) as number[];
              
              const peakCpuTemp = validCpuTemps.length > 0 ? Math.max(...validCpuTemps) : 0;
              
              // Calculate model performance
              const modelPerformance: { [model: string]: { ttft_ms: number; avg_tps: number } } = {};
              
              // Use summary stats if available, otherwise calculate from telemetry
              if (sessionData.summary_stats) {
                Object.entries(sessionData.summary_stats).forEach(([model, stats]: [string, any]) => {
                  if (stats.ttft_ms !== undefined && stats.avg_tps !== undefined) {
                    modelPerformance[model] = {
                      ttft_ms: stats.ttft_ms,
                      avg_tps: stats.avg_tps
                    };
                  }
                });
              }
              
              // Create TelemetrySession object for analysis
              const telemetrySession: any = {
                id: savedSession.uuid,
                name: savedSession.name,
                timestamp: savedSession.created_at * 1000, // Convert to milliseconds
                model_info: {
                  model_a: sessionData.configuration?.model_a?.model_path,
                  model_b: sessionData.configuration?.model_b?.model_path,
                },
                config: {
                  telemetry_sampling_hz: sessionData.configuration?.telemetry_sampling_hz,
                  wait_for_cpu_baseline_between_models: sessionData.configuration?.wait_for_cpu_baseline_between_models || false,
                  wait_for_cpu_baseline_margin_c: sessionData.configuration?.wait_for_cpu_baseline_margin_c ?? 2.0,
                },
                data: telemetryData,
                summary: {
                  duration_ms: duration,
                  total_tokens: validTpsValues.reduce((sum, tps, index) => {
                    const nextIndex = index + 1;
                    if (nextIndex < telemetryData.length) {
                      const timeInterval = (telemetryData[nextIndex].timestamp - telemetryData[index].timestamp) / 1000;
                      return sum + (tps * timeInterval);
                    }
                    return sum;
                  }, 0),
                  avg_tps: avgTps,
                  peak_cpu_temp: peakCpuTemp,
                  avg_power_consumption: 0, // Could be calculated if needed
                  model_performance: modelPerformance
                },
                chat_history: sessionData.chat_history,
                system_prompt: sessionData.configuration?.system_prompt
              };
              
              return telemetrySession;
            } catch (error) {
              console.error('❌ Error processing session', savedSession.name, ':', error);
              return null;
            }
          })
        );
        
        // Filter out null sessions and set the telemetry sessions
        const validSessions = telemetrySessions.filter(session => session !== null);
        setTelemetrySessions(validSessions);
        
        // Also populate the in-memory sessionStorage for compatibility
        validSessions.forEach(session => {
          sessionStorage.addSession(session);
        });
        
      } catch (error) {
        console.error('❌ Failed to load saved sessions for analysis:', error);
        // Fallback to in-memory sessions if SQLite fails
        const unsubscribe = subscribeToSessions((sessions) => {
          setTelemetrySessions(sessions);
        });
        setTelemetrySessions(getAllSessions());
        return unsubscribe;
      }
    };
    
    loadSavedSessionsForAnalysis();
  }, []);
  
  // Unsaved changes dialog handlers
  const handleUnsavedChangesClose = () => {
    setUnsavedChangesDialogOpen(false);
    setPendingCloseAction(null);
  };
  
  const handleSaveAndClose = () => {
    setUnsavedChangesDialogOpen(false);
    setSessionSaveDialogOpen(true);
    // Keep the pending close action for after save
  };
  
  const handleCloseWithoutSaving = () => {
    // Close dialog immediately to prevent interference
    setUnsavedChangesDialogOpen(false);
    sessionState.clearSavedState();
    
    if (pendingCloseAction) {
      // Use setTimeout to ensure the dialog has time to close and remove event handlers
      setTimeout(() => {
        try {
          pendingCloseAction();
        } catch (error) {
          console.error('❌ handleCloseWithoutSaving: Error executing pendingCloseAction:', error);
        }
      }, 50);
    }
    setPendingCloseAction(null);
  };
  
  // Right sidebar resize handler
  const handleRightSidebarResize = useCallback((deltaX: number) => {
    const newWidth = rightSidebarWidth - deltaX;
    const minWidth = 280;
    const maxWidth = Math.max(600, window.innerWidth * 0.5);
    const clampedWidth = Math.min(Math.max(newWidth, minWidth), maxWidth);
    setRightSidebarWidth(clampedWidth);
  }, [rightSidebarWidth, setRightSidebarWidth]);

  // Helper to show unsaved changes dialog if needed
  const handlePotentialClose = useCallback((closeAction: () => void, _context: 'close' | 'clear' | 'switch-mode' | 'new-chat' = 'close') => {
    // During session restoration, suppress unsaved-changes gating
    if (isRestoringSession) {
      closeAction();
      return;
    }
    
    if (sessionState.hasUnsavedChanges) {
      setPendingCloseAction(() => {
        closeAction();
      });
      setDialogContext(_context);
      setUnsavedChangesDialogOpen(true);
    } else {
      closeAction();
    }
  }, [isRestoringSession, sessionState.hasUnsavedChanges, setPendingCloseAction, setDialogContext, setUnsavedChangesDialogOpen]);
  
  // Window event handling using utility hook
  useWindowEventHandlers(
    sessionState.hasUnsavedChanges,
    handlePotentialClose
  );
  
  // Clear conversation and telemetry data (preserve configuration)
  const clearSessionData = () => {
    setChatHistory([]);
    clearTelemetryData();
    clearSummaryStats(); // Clear performance summary in telemetry
    setStreamingResponses({}); // Clear any active streaming
    
    // Clear overlay telemetry data
    overlayTelemetry.clearAllTelemetry();
    
    // Clear editing state if active
    if (editingMessageId) {
      cancelEditingMessage();
    }
    
    // Clear token counts
    resetTokenCounts();
    
    // Don't clear system prompt - preserve configuration
    // Don't clear model configurations - preserve setup
    sessionState.clearSavedState();
  };
  
  // Initialize chat handlers
  const { handleSendPrompt, handleStopGeneration, rerunFromMessage } = useChatHandlers({ setContextValidationWarnings });

  // New Chat handler: stop inference immediately, then gate and clear session
  const handleNewChat = () => {
    if (isLoading) {
      // Fire and forget stop; UI will update via event listeners
      try {
        void handleStopGeneration();
      } catch (e) {
        console.error('Failed to stop generation on New Chat:', e);
      }
    }
    handlePotentialClose(clearSessionData, 'new-chat');
  };

  // Mode switching handlers
  const handleSwitchToChat = () => {
    setAppMode('chat');
  };
  
  const handleSwitchToAnalysis = () => {
    setAppMode('analysis');
  };

// Monitor telemetry data changes (removed noisy logs)
  // useEffect(() => {
  // }, [telemetryData]);

  // Monitor unsaved changes state transitions (removed noisy logs)
  // useEffect(() => {
  // }, [sessionState.hasUnsavedChanges, sessionState.currentSessionId, sessionState.lastSavedAt]);

  // Post-render baseline effect: wait until restored state matches expectations
  useEffect(() => {
    if (!isRestoringSession || !pendingBaseline) return;
    const currentChatLen = chatHistory.length;
    const currentTelemetryLen = telemetryData.length;
    const ready =
      currentChatLen === pendingBaseline.expectedChatLen &&
      currentTelemetryLen === pendingBaseline.expectedTelemetryLen;

    if (ready) {
      sessionState.markAsSaved(pendingBaseline.uuid);
      setIsRestoringSession(false);
      setPendingBaseline(null);
    }
  }, [isRestoringSession, pendingBaseline, chatHistory.length, telemetryData.length]);



  const getAvailableTargets = (): ('A' | 'B' | 'Both')[] => {
    const targets: ('A' | 'B' | 'Both')[] = [];
    if (modelA.model_path) targets.push("A");
    if (modelB.model_path) targets.push("B");
    if (modelA.model_path && modelB.model_path) targets.push("Both");
    return targets;
  };

  // Bidirectional synchronization between target and viewMode
  const handleTargetChange = (newTarget: "A" | "B" | "Both") => {
    setTarget(newTarget);
    
    // Sync view mode based on target
    if (newTarget === "Both") {
      setViewMode("dual");
    } else {
      setViewMode("single");
    }
  };

  const handleViewModeChange = (newViewMode: "single" | "dual") => {
    setViewMode(newViewMode);
    
    // Sync target based on view mode
    if (newViewMode === "dual") {
      // Only switch to Both if both models are available
      const availableTargets = getAvailableTargets();
      if (availableTargets.includes("Both")) {
        setTarget("Both");
      }
    } else if (newViewMode === "single") {
      // If coming from Both, default to A (or B if A not available)
      if (target === "Both") {
        const availableTargets = getAvailableTargets();
        if (availableTargets.includes("A")) {
          setTarget("A");
        } else if (availableTargets.includes("B")) {
          setTarget("B");
        }
      }
      // If already A or B, keep the current selection
    }
  };



  return (
    <div className="flex h-screen bg-gray-100 w-full max-w-full overflow-hidden">
      {/* Left Sidebar */}
      <LeftSidebar 
        onLoadSession={handleSessionLoad}
        onSwitchToChat={handleSwitchToChat}
        onSwitchToAnalysis={handleSwitchToAnalysis}
        onHandlePotentialClose={handlePotentialClose}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <AppHeader
          onClearSession={clearSessionData}
          onHandlePotentialClose={handlePotentialClose}
          onHandleTargetChange={handleTargetChange}
          onHandleViewModeChange={handleViewModeChange}
          sessionState={isRestoringSession ? {
            ...sessionState,
            hasUnsavedChanges: false,
            canSave: false,
          } : sessionState}
          onNewChat={handleNewChat}
        />

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0 min-h-0">
          {appMode === 'chat' ? (
            // Chat Mode
            <ChatView
              chatHistory={chatHistory}
              prompt={prompt}
              target={target}
              isLoading={isLoading}
              isStopping={isStopping}
              viewMode={viewMode}
              editingMessageId={editingMessageId}
              editingContent={editingContent}
              streamingResponses={streamingResponses}
              onPromptChange={setPrompt}
              onTargetChange={handleTargetChange}
              onSendPrompt={handleSendPrompt}
              onStopGeneration={handleStopGeneration}
              onStartEditingMessage={startEditingMessage}
              onSaveEditedMessage={saveEditedMessage}
              onCancelEditingMessage={cancelEditingMessage}
              onDeleteMessage={deleteMessage}
              onRerunFromMessage={rerunFromMessage}
              onEditingContentChange={setEditingContent}
              onClearMessages={() => handlePotentialClose(clearSessionData, 'clear')}
              getAvailableTargets={getAvailableTargets}
            />
          ) : (
            // Analysis Mode
            <div className="flex-1 overflow-hidden">
              <AnalysisDashboard sessions={telemetrySessions} />
            </div>
          )}
        </div>
      </div>

      {/* Right Sidebar - Only visible in chat mode */}
      {appMode === 'chat' && (
        isRightSidebarCollapsed ? (
          <div
            className="bg-white border-l flex-shrink-0 relative"
            style={{ width: 24 }}
          >
            <button
              onClick={() => setRightSidebarCollapsed(false)}
              aria-label="Expand right sidebar"
              title="Expand settings & telemetry"
              className="absolute left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20 w-5 h-5 rounded-full bg-white border border-gray-300 shadow-sm flex items-center justify-center text-gray-600 hover:bg-gray-50 hover:border-gray-400"
            >
              {/* Chevron-left icon */}
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          </div>
        ) : (
          <RightSidebar
            rightSidebarWidth={rightSidebarWidth}
            activeTab={activeTab}
            systemPrompt={systemPrompt}
            systemPromptTokenCount={systemPromptTokenCount}
            modelA={modelA}
            modelB={modelB}
            modelAPathFocused={modelAPathFocused}
            modelBPathFocused={modelBPathFocused}
            isLoading={isLoading}
            telemetrySamplingHz={telemetry_sampling_hz}
            runWithoutTelemetry={run_without_telemetry}
            onRunWithoutTelemetryChange={setRunWithoutTelemetry}
            chartRefreshMs={chart_refresh_ms}
            onChartRefreshMsChange={setChartRefreshMs}
            telemetryData={telemetryData}
            summaryStats={summaryStats}
            contextValidationWarnings={contextValidationWarnings}
            onResize={handleRightSidebarResize}
            onActiveTabChange={setActiveTab}
            onCollapse={() => setRightSidebarCollapsed(true)}
            onSystemPromptChange={setSystemPrompt}
            onModelAChange={handleModelAChange}
            onModelBChange={handleModelBChange}
            onModelAPathFocusChange={setModelAPathFocused}
            onModelBPathFocusChange={setModelBPathFocused}
            onTelemetrySamplingHzChange={setTelemetrySamplingHz}
            onAddTelemetryData={addTelemetryData}
            onClearSessionData={clearSessionData}
            onHandlePotentialClose={handlePotentialClose}
            overlayTelemetry={overlayTelemetry}
            getLatestTelemetry={getLatestTelemetry}
            getFilenameFromPath={getFilenameFromPath}
            // New sync handlers from store (Phase 7.2)
            onSyncModelBToA={syncModelBToA}
            onSyncModelAToB={syncModelAToB}
          />
        )
      )}
      
      {/* Session Save Dialog */}
      <SessionSaveDialog
        isOpen={sessionSaveDialogOpen}
        onClose={() => setSessionSaveDialogOpen(false)}
        onSave={handleSessionSave}
        telemetryData={transformTelemetryData()}
        chatHistory={chatHistory}
        systemPrompt={systemPrompt}
        systemPromptTokenCount={systemPromptTokenCount}
        modelInfo={{
          model_a: target === 'A' || target === 'Both' ? modelA.model_path : undefined,
          model_b: target === 'B' || target === 'Both' ? modelB.model_path : undefined,
        }}
      />
      
      {/* Unsaved Changes Dialog */}
      <UnsavedChangesDialog
        isOpen={unsavedChangesDialogOpen}
        onClose={handleUnsavedChangesClose}
        onSaveAndClose={handleSaveAndClose}
        onCloseWithoutSaving={handleCloseWithoutSaving}
        chatHistory={chatHistory}
        telemetryData={transformTelemetryData()}
        systemPrompt={systemPrompt}
        systemPromptTokenCount={systemPromptTokenCount}
        modelInfo={{
          model_a: target === 'A' || target === 'Both' ? modelA.model_path : undefined,
          model_b: target === 'B' || target === 'Both' ? modelB.model_path : undefined,
        }}
        context={dialogContext}
      />
    </div>
  );
}

export default App;

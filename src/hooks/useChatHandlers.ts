import { invoke } from "@tauri-apps/api/core";
import type React from "react";
import type { Message } from "../components/chat/MessageItem";
import { useChatStore } from "../stores/chatStore";
import { useModelStore } from "../stores/modelStore";
import { useTelemetryStore } from "../stores/telemetryStore";
import { useUIStore } from "../stores/uiStore";
import { useShallow } from "zustand/react/shallow";

interface ContextWarnings {
  modelA: boolean;
  modelB: boolean;
}

export const useChatHandlers = (options?: {
  setContextValidationWarnings?: React.Dispatch<React.SetStateAction<ContextWarnings>>;
}) => {
  // Chat store
  const {
    chatHistory,
    setChatHistory,
    prompt,
    setPrompt,
    isLoading,
    setIsLoading,
    setIsStopping,
    target,
    setStreamingResponses,
    editingMessageId,
    cancelMessageEdit,
  } = useChatStore(useShallow((s: any) => ({
    chatHistory: s.chatHistory,
    setChatHistory: s.setChatHistory,
    prompt: s.prompt,
    setPrompt: s.setPrompt,
    isLoading: s.isLoading,
    setIsLoading: s.setIsLoading,
    setIsStopping: s.setIsStopping,
    target: s.target,
    setStreamingResponses: s.setStreamingResponses,
    editingMessageId: s.editingMessageId,
    cancelMessageEdit: s.cancelMessageEdit,
  })));

  // Model store
  const {
    modelA,
    modelB,
    systemPrompt,
    telemetry_sampling_hz,
    run_without_telemetry,
    resetTokenCounts,
  } = useModelStore(useShallow((s) => ({
    modelA: s.modelA,
    modelB: s.modelB,
    systemPrompt: s.systemPrompt,
    telemetry_sampling_hz: s.telemetry_sampling_hz,
    run_without_telemetry: s.run_without_telemetry,
    resetTokenCounts: s.resetTokenCounts,
  })));

  // Telemetry store
  const {
    clearSummaryStats,
    setCooldownActive,
    setCooldownStatus,
    clearCooldownPoints,
  } = useTelemetryStore(useShallow((s) => ({
    clearSummaryStats: s.clearSummaryStats,
    setCooldownActive: s.setCooldownActive,
    setCooldownStatus: s.setCooldownStatus,
    clearCooldownPoints: s.clearCooldownPoints,
  })));

  // UI store
  const { activeTab, setActiveTab } = useUIStore(useShallow((s) => ({
    activeTab: s.activeTab,
    setActiveTab: s.setActiveTab,
  })));

  const generateMessageId = (): string => {
    return `msg_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
  };

  const handleStopGeneration = async () => {
    if (!isLoading) return;

    setIsStopping(true);
    try {
      await invoke("stop_generation");
    } catch (error) {
      console.error("Failed to stop generation:", error);
    }
    // Note: we don't setIsStopping(false) here - let the event handlers do it
  };

  const rerunFromMessage = async (messageId: string) => {
    // Find the message index
    const messageIndex = chatHistory.findIndex((msg: Message) => msg.id === messageId);
    if (messageIndex === -1) return;

    const message = chatHistory[messageIndex];
    if (message.role !== "user") return;

    // Truncate chat history to only include messages up to (and including) the selected user message
    const truncatedHistory = chatHistory.slice(0, messageIndex + 1);
    setChatHistory(truncatedHistory);

    // Clear any streaming responses
    setStreamingResponses({});
    setIsLoading(true);
    clearSummaryStats();

    // Clear token counts for new turn
    resetTokenCounts();

    // Determine cooldown enablement for this run
    const waitForCooldown =
      (modelA as any).wait_for_cpu_baseline_between_models ||
      (modelB as any).wait_for_cpu_baseline_between_models ||
      false;
    // If telemetry is disabled or cooldown is not enabled, reset cooldown panel state to avoid stale display
    if (run_without_telemetry || !waitForCooldown) {
      setCooldownStatus(null);
      setCooldownActive(false);
      clearCooldownPoints();
    }

    const config: any = {
      chat_history: truncatedHistory,
      target,
      system_prompt: systemPrompt || undefined,
      telemetry_sampling_hz,
      wait_for_cpu_baseline_between_models:
        (modelA as any).wait_for_cpu_baseline_between_models ||
        (modelB as any).wait_for_cpu_baseline_between_models ||
        false,
      wait_for_cpu_baseline_margin_c:
        (modelA as any).wait_for_cpu_baseline_margin_c ??
        (modelB as any).wait_for_cpu_baseline_margin_c ??
        2.0,
      run_without_telemetry,
    };

    // Add model configurations based on target
    if (target === "A" || target === "Both") {
      (config as any).model_a = modelA;
    }
    if (target === "B" || target === "Both") {
      (config as any).model_b = modelB;
    }

    try {
      await invoke("run_generation_turn", { config });
    } catch (error) {
      console.error("Re-run generation error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendPrompt = async () => {
    if (!prompt.trim()) return;

    // Clear previous warnings when send is attempted
    options?.setContextValidationWarnings?.({ modelA: false, modelB: false });

    // Validate context lengths are set
    let hasValidationError = false;
    const warnings: ContextWarnings = { modelA: false, modelB: false };

    if (target === "A" || target === "Both") {
      if (!modelA.n_ctx) {
        warnings.modelA = true;
        hasValidationError = true;
      }
    }
    if (target === "B" || target === "Both") {
      if (!modelB.n_ctx) {
        warnings.modelB = true;
        hasValidationError = true;
      }
    }

    if (hasValidationError) {
      options?.setContextValidationWarnings?.(warnings);
      return;
    }

    // If currently on config tab, switch to telemetry for live metrics during generation
    // BUT do not switch when running without telemetry
    if (activeTab === "config" && !run_without_telemetry) {
      setActiveTab("telemetry");
    }

    // Cancel any ongoing message editing
    if (editingMessageId) {
      cancelMessageEdit();
    }

    setIsLoading(true);
    setStreamingResponses({});
    // Don't clear telemetry data - let it accumulate across runs
    // clearTelemetryData();
    clearSummaryStats();

    // Clear token counts for new turn to ensure accurate per-turn tracking
    resetTokenCounts();

    // Determine cooldown enablement for this run
    const waitForCooldown =
      (modelA as any).wait_for_cpu_baseline_between_models ||
      (modelB as any).wait_for_cpu_baseline_between_models ||
      false;
    // If telemetry is disabled or cooldown is not enabled, reset cooldown panel state to avoid stale display
    if (run_without_telemetry || !waitForCooldown) {
      setCooldownStatus(null);
      setCooldownActive(false);
      clearCooldownPoints();
    }

    const userMessage: Message = {
      id: generateMessageId(),
      role: "user",
      content: prompt,
      // token_count will be set when input_tokens event is received
    };
    const newHistory = [...chatHistory, userMessage];
    setChatHistory(newHistory);

    // Clear the input immediately so user can start typing next prompt
    setPrompt("");

    const config: any = {
      chat_history: newHistory,
      target,
      system_prompt: systemPrompt || undefined,
      telemetry_sampling_hz,
      wait_for_cpu_baseline_between_models:
        (modelA as any).wait_for_cpu_baseline_between_models ||
        (modelB as any).wait_for_cpu_baseline_between_models ||
        false,
      wait_for_cpu_baseline_margin_c:
        (modelA as any).wait_for_cpu_baseline_margin_c ??
        (modelB as any).wait_for_cpu_baseline_margin_c ??
        2.0,
      run_without_telemetry,
    };

    // Add model configurations based on target
    if (target === "A" || target === "Both") {
      (config as any).model_a = modelA;
    }
    if (target === "B" || target === "Both") {
      (config as any).model_b = modelB;
    }

    try {
      await invoke("run_generation_turn", { config });
    } catch (error) {
      console.error("Generation error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    handleSendPrompt,
    handleStopGeneration,
    rerunFromMessage,
  };
};
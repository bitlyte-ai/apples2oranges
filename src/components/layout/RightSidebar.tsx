import React from 'react';
import { ResizeHandle } from '../ui/ResizeHandle';
import { SystemPromptEditor } from '../config/SystemPromptEditor';
import { ModelConfigPanel } from '../config/ModelConfigPanel';
import { TelemetryConfigPanel } from '../config/TelemetryConfigPanel';
import { TelemetryDashboard } from '../telemetry/TelemetryDashboard';
import { type ModelConfig } from '../../stores/modelStore';
import { type TelemetryData } from '../../stores/telemetryStore';
import type { TelemetryDataPoint, TelemetryDataPointWithRelativeTime } from '../../types/telemetry';

interface RightSidebarProps {
  // Layout state
  rightSidebarWidth: number;
  activeTab: 'config' | 'telemetry';
  
  // System prompt state  
  systemPrompt: string;
  systemPromptTokenCount: number | null;
  
  // Model configuration state
  modelA: ModelConfig;
  modelB: ModelConfig;
  modelAPathFocused: boolean;
  modelBPathFocused: boolean;
  isLoading: boolean;
  
  // Telemetry configuration state
  telemetrySamplingHz: number;
  runWithoutTelemetry: boolean;
  onRunWithoutTelemetryChange: (checked: boolean) => void;
  // Live chart refresh
  chartRefreshMs: number;
  onChartRefreshMsChange: (ms: number) => void;
  
  // Telemetry state
  telemetryData: TelemetryData[];
  summaryStats: {
    A?: { ttft_ms?: number; avg_tps?: number; energy_per_token_wh?: number };
    B?: { ttft_ms?: number; avg_tps?: number; energy_per_token_wh?: number };
  };
  
  // Context validation state
  contextValidationWarnings: {
    modelA: boolean;
    modelB: boolean;
  };
  
  // Event handlers - Layout
  onResize: (deltaX: number) => void;
  onActiveTabChange: (tab: 'config' | 'telemetry') => void;
  onCollapse?: () => void;
  
  // Event handlers - Configuration  
  onSystemPromptChange: (prompt: string) => void;
  onModelAChange: (config: ModelConfig) => void;
  onModelBChange: (config: ModelConfig) => void;
  onModelAPathFocusChange: (focused: boolean) => void;
  onModelBPathFocusChange: (focused: boolean) => void;
  onTelemetrySamplingHzChange: (hz: number) => void;
  
  // New sync action handlers (Phase 7.1)
  onSyncModelBToA: () => void;
  onSyncModelAToB: () => void;
  
  // Event handlers - Telemetry
  onAddTelemetryData: (data: TelemetryData) => void;
  onClearSessionData: () => void;
  onHandlePotentialClose: (closeAction: () => void, context: 'close' | 'clear' | 'switch-mode') => void;
  
  // Dependencies and utilities
  overlayTelemetry: {
    getOverlayChartData: () => {
      modelA: TelemetryDataPointWithRelativeTime[];
      modelB: TelemetryDataPointWithRelativeTime[];
    };
    getLatestSessionData: () => {
      modelA: TelemetryDataPointWithRelativeTime[];
      modelB: TelemetryDataPointWithRelativeTime[];
    };
    startModelSession: (model: 'A' | 'B') => void;
    addTelemetryPoint: (data: TelemetryDataPoint) => void;
    clearAllTelemetry: () => void;
  };
  getLatestTelemetry: () => TelemetryData | null;
  getFilenameFromPath: (path: string) => string;
  
  // Visibility
  isVisible?: boolean;
}

/**
 * RightSidebar Component
 * 
 * Main container for the right sidebar with:
 * - Responsive resizing via ResizeHandle
 * - Tab-based interface (Configuration/Telemetry)
 * - Configuration panel with SystemPromptEditor and dual ModelConfigPanels
 * - Comprehensive TelemetryDashboard with 15+ live charts
 * - Proper state management and event handler forwarding
 * - Conditional visibility based on app mode
 * - Clean separation of concerns between components
 * - Preservation of all interactive features and responsive design
 */
export const RightSidebar: React.FC<RightSidebarProps> = ({
  rightSidebarWidth,
  activeTab,
  systemPrompt,
  systemPromptTokenCount,
  modelA,
  modelB,
  modelAPathFocused,
  modelBPathFocused,
  isLoading,
  telemetrySamplingHz,
  telemetryData,
  summaryStats,
  contextValidationWarnings,
  onResize,
  onActiveTabChange,
  onCollapse,
  onSystemPromptChange,
  onModelAChange,
  onModelBChange,
  onModelAPathFocusChange,
  onModelBPathFocusChange,
  onTelemetrySamplingHzChange,
  runWithoutTelemetry,
  onRunWithoutTelemetryChange,
  chartRefreshMs,
  onChartRefreshMsChange,
  onAddTelemetryData,
  onClearSessionData,
  onHandlePotentialClose,
  overlayTelemetry,
  getLatestTelemetry,
  getFilenameFromPath,
  // New sync action handlers (Phase 7.1)
  onSyncModelBToA,
  onSyncModelAToB,
  isVisible = true
}) => {

  if (!isVisible) {
    return null;
  }

  return (
    <div 
      className="bg-white border-l flex flex-row flex-shrink-0 min-w-0 relative" 
      style={{ width: rightSidebarWidth }}
    >
      {/* Resize Handle */}
      <ResizeHandle onResize={onResize} />

      {/* Collapse button that straddles the left border, vertically centered */}
      {onCollapse && (
        <button
          onClick={onCollapse}
          aria-label="Collapse right sidebar"
          title="Collapse sidebar"
          className="absolute left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20 w-5 h-5 rounded-full bg-white border border-gray-300 shadow-sm flex items-center justify-center text-gray-600 hover:bg-gray-50 hover:border-gray-400"
        >
          {/* Chevron-right icon */}
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      )}
      
      {/* Main Sidebar Content */}
      <div className="flex flex-col flex-1 min-w-0">
        {/* Tab Headers */}
        <div className="flex border-b relative">
          <button
            onClick={() => onActiveTabChange("config")}
            className={`flex-1 py-3 px-4 text-sm font-medium transition-colors ${
              activeTab === "config" 
                ? "bg-blue-50 text-blue-600 border-b-2 border-blue-600" 
                : "text-gray-600 hover:text-gray-800"
            }`}
          >
            Configuration
          </button>
          <button
            onClick={() => onActiveTabChange("telemetry")}
            className={`flex-1 py-3 px-4 text-sm font-medium transition-colors ${
              activeTab === "telemetry" 
                ? "bg-blue-50 text-blue-600 border-b-2 border-blue-600" 
                : "text-gray-600 hover:text-gray-800"
            }`}
          >
            Telemetry
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 p-4 overflow-y-auto overflow-x-hidden">
          {activeTab === "config" ? (
            /* Configuration Panel */
            <div className="space-y-6">
              {/* System Prompt Editor */}
              <SystemPromptEditor
                systemPrompt={systemPrompt}
                systemPromptTokenCount={systemPromptTokenCount}
                onSystemPromptChange={onSystemPromptChange}
                disabled={isLoading}
              />

              {/* Telemetry Configuration */}
              <TelemetryConfigPanel
                telemetrySamplingHz={telemetrySamplingHz}
                onTelemetrySamplingHzChange={onTelemetrySamplingHzChange}
                isLoading={isLoading}
                runWithoutTelemetry={runWithoutTelemetry}
                onRunWithoutTelemetryChange={onRunWithoutTelemetryChange}
                chartRefreshMs={chartRefreshMs}
                onChartRefreshMsChange={onChartRefreshMsChange}
                waitForCpuBaselineBetweenModels={modelA.wait_for_cpu_baseline_between_models === true || modelB.wait_for_cpu_baseline_between_models === true ? true : false}
                onWaitForCpuBaselineBetweenModelsChange={(checked) => {
                  // Mirror to both model configs for simplicity of persistence
                  const updatedA = { ...modelA, wait_for_cpu_baseline_between_models: checked } as any;
                  const updatedB = { ...modelB, wait_for_cpu_baseline_between_models: checked } as any;
                  onModelAChange(updatedA);
                  onModelBChange(updatedB);
                }}
                cpuBaselineToleranceC={
                  (modelA as any).wait_for_cpu_baseline_margin_c ??
                  (modelB as any).wait_for_cpu_baseline_margin_c ?? 2.0
                }
                onCpuBaselineToleranceCChange={(val) => {
                  const updatedA = { ...modelA, wait_for_cpu_baseline_margin_c: val } as any;
                  const updatedB = { ...modelB, wait_for_cpu_baseline_margin_c: val } as any;
                  onModelAChange(updatedA);
                  onModelBChange(updatedB);
                }}
              />

              {/* Model A Configuration */}
              <ModelConfigPanel
                modelId="A"
                modelConfig={modelA}
                isPathFocused={modelAPathFocused}
                isLoading={isLoading}
                hasContextValidationWarning={contextValidationWarnings.modelA}
                onModelChange={onModelAChange}
                onPathFocus={onModelAPathFocusChange}
                getFilenameFromPath={getFilenameFromPath}
                // New props for sync functionality (Phase 7.1)
                onSyncFromOther={onSyncModelBToA}
                showSyncButton={!!modelB.model_path}  // Only show if Model B is configured
                otherModelId="B"
              />

              {/* Model B Configuration */}
              <ModelConfigPanel
                modelId="B"
                modelConfig={modelB}
                isPathFocused={modelBPathFocused}
                isLoading={isLoading}
                hasContextValidationWarning={contextValidationWarnings.modelB}
                onModelChange={onModelBChange}
                onPathFocus={onModelBPathFocusChange}
                getFilenameFromPath={getFilenameFromPath}
                // New props for sync functionality (Phase 7.1)
                onSyncFromOther={onSyncModelAToB}
                showSyncButton={!!modelA.model_path}  // Only show if Model A is configured
                otherModelId="A"
              />
            </div>
          ) : (
            /* Telemetry Dashboard */
            <TelemetryDashboard
              telemetryData={telemetryData}
              summaryStats={summaryStats}
              overlayTelemetry={overlayTelemetry}
              getLatestTelemetry={getLatestTelemetry}
              addTelemetryData={onAddTelemetryData}
              clearSessionData={onClearSessionData}
              handlePotentialClose={onHandlePotentialClose}
              chartRefreshMs={chartRefreshMs}
              isLoading={isLoading}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default RightSidebar;
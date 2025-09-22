import { create } from 'zustand';

export interface UIState {
  // Layout state
  viewMode: 'single' | 'dual';
  activeTab: 'config' | 'telemetry';
  rightSidebarWidth: number;
  isRightSidebarCollapsed: boolean;
  
  // Model path input focus states (for display vs edit modes)
  modelAPathFocused: boolean;
  modelBPathFocused: boolean;

  // Actions
  setViewMode: (mode: 'single' | 'dual') => void;
  setActiveTab: (tab: 'config' | 'telemetry') => void;
  setRightSidebarWidth: (width: number) => void;
  setRightSidebarCollapsed: (collapsed: boolean) => void;
  setModelAPathFocused: (focused: boolean) => void;
  setModelBPathFocused: (focused: boolean) => void;

  // Helper actions
  handleViewModeChange: (newViewMode: 'single' | 'dual', getAvailableTargets: () => ('A' | 'B' | 'Both')[], setTarget: (target: 'A' | 'B' | 'Both') => void) => void;
  handleTargetChange: (newTarget: 'A' | 'B' | 'Both') => void;
}

export const useUIStore = create<UIState>((set) => ({
  // Initial state
  viewMode: 'single',
  activeTab: 'config',
  rightSidebarWidth: 320,
  isRightSidebarCollapsed: false,
  modelAPathFocused: false,
  modelBPathFocused: false,

  // Basic setters
  setViewMode: (mode) => set({ viewMode: mode }),
  setActiveTab: (tab) => set({ activeTab: tab }),
  setRightSidebarWidth: (width) => set({ rightSidebarWidth: width }),
  setRightSidebarCollapsed: (collapsed) => set({ isRightSidebarCollapsed: collapsed }),
  setModelAPathFocused: (focused) => set({ modelAPathFocused: focused }),
  setModelBPathFocused: (focused) => set({ modelBPathFocused: focused }),

  // Helper actions
  handleViewModeChange: (newViewMode, getAvailableTargets, setTarget) => {
    set({ viewMode: newViewMode });
    
    // If switching to single view and we're currently targeting "Both", 
    // change to the first available single target
    if (newViewMode === 'single') {
      const availableTargets = getAvailableTargets();
      if (availableTargets.length > 0) {
        // Filter out "Both" and take the first single target
        const singleTargets = availableTargets.filter(t => t !== 'Both') as ('A' | 'B')[];
        if (singleTargets.length > 0) {
          setTarget(singleTargets[0]);
        }
      }
    } else if (newViewMode === 'dual') {
      // If switching to dual view, check if we have both models available
      const availableTargets = getAvailableTargets();
      if (availableTargets.includes('Both')) {
        setTarget('Both');
      }
    }
  },

  handleTargetChange: (newTarget) => {
    // This will be implemented by the consumer since it needs access to other stores
    console.log('Target changed to:', newTarget);
  },
}));

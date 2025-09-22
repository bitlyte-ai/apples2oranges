import { useEffect, useRef } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';

/**
 * Hook for handling window close events with unsaved changes detection
 * 
 * This hook provides platform-specific window close handling:
 * - Tauri window close listener (primary)
 * - Browser beforeunload fallback (for development/non-Tauri environments)
 * 
 * This is a UTILITY for platform-specific event handling that follows
 * the same pattern as existing useSessionState and useOverlayTelemetry hooks.
 * Pure utility - delegates to callback pattern, contains no business logic.
 */
export const useWindowEventHandlers = (
  hasUnsavedChanges: boolean,
  onPotentialClose: (action: () => void, context?: 'close' | 'clear' | 'switch-mode') => void
) => {
  // Use callback ref to always have access to latest callback
  const onPotentialCloseRef = useRef(onPotentialClose);
  onPotentialCloseRef.current = onPotentialClose;
  
  // Keep ref for fallback handler
  const hasUnsavedChangesRef = useRef(hasUnsavedChanges);
  hasUnsavedChangesRef.current = hasUnsavedChanges;
  
  useEffect(() => {
    let unlistenCloseRequested: (() => void) | null = null;

    const setupCloseListener = async () => {
      try {
        const currentWindow = getCurrentWindow();
        unlistenCloseRequested = await currentWindow.onCloseRequested((event) => {
          // Always prevent the close initially and delegate to onPotentialClose
          // This ensures we use the same state checking logic as mode switching
          console.log('🧟 useWindowEventHandlers: Window close requested, preventing default');
          event.preventDefault();
          
          // Use the callback to handle the close logic (which will check hasUnsavedChanges)
          console.log('🧟 useWindowEventHandlers: Calling onPotentialClose with close action');
          onPotentialCloseRef.current(async () => {
            // User chose to close without saving - now we need to close programmatically
            console.log('🧟 useWindowEventHandlers: CLOSE ACTION FUNCTION CALLED - Starting window destruction');
            console.log('🧟 useWindowEventHandlers: About to get current window');
            console.log('🧟 useWindowEventHandlers: getCurrentWindow function:', getCurrentWindow);
            try {
              console.log('🧟 useWindowEventHandlers: Calling getCurrentWindow()...');
              const windowToClose = getCurrentWindow();
              console.log('🧟 useWindowEventHandlers: Successfully got current window:', windowToClose);
              console.log('🧟 useWindowEventHandlers: Window object type:', typeof windowToClose);
              console.log('🧟 useWindowEventHandlers: Window object keys:', Object.keys(windowToClose || {}));
              console.log('🧟 useWindowEventHandlers: About to call windowToClose.destroy()');
              const destroyResult = await windowToClose.destroy();
              console.log('🧟 useWindowEventHandlers: Window destroy() completed successfully! Result:', destroyResult);
            } catch (error) {
              console.error('❌ useWindowEventHandlers: ERROR in close action:', error);
              console.error('❌ useWindowEventHandlers: Error stack:', (error as any)?.stack);
              console.error('❌ useWindowEventHandlers: Error type:', typeof error);
              console.error('❌ useWindowEventHandlers: Error message:', (error as any)?.message);
            }
            console.log('🧟 useWindowEventHandlers: Close action function completed');
          }, 'close');
          console.log('🧟 useWindowEventHandlers: onPotentialClose called');
        });
      } catch (error) {
        console.warn('Failed to setup Tauri close listener, falling back to beforeunload:', error);
        
        // Fallback for development or non-Tauri environments
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
          if (hasUnsavedChangesRef.current) {
            e.preventDefault();
            e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
            return 'You have unsaved changes. Are you sure you want to leave?';
          }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
      }
    };

    setupCloseListener();

    return () => {
      if (unlistenCloseRequested) {
        unlistenCloseRequested();
      }
    };
  }, []); // Empty dependency array - only set up once
};
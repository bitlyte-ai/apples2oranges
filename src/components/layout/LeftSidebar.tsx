import React, { useState, useEffect } from 'react';
import { SessionPersistence } from '../../services/sessionPersistence';
import { DeleteConfirmationDialog } from '../ui/DeleteConfirmationDialog';
import { useModelStore } from '../../stores/modelStore';
import { DeleteAllSessionsDialog } from '../ui/DeleteAllSessionsDialog';

interface SessionHistoryPanelProps {
  onLoadSession: (uuid: string) => void;
  onSwitchToChat: () => void;
  onSwitchToAnalysis: () => void;
  onHandlePotentialClose: (
    closeAction: () => void,
    context?: 'close' | 'clear' | 'switch-mode' | 'new-chat'
  ) => void;
}

const SessionHistoryPanel: React.FC<SessionHistoryPanelProps> = ({ onLoadSession, onSwitchToChat, onSwitchToAnalysis, onHandlePotentialClose }) => {
  const [sessions, setSessions] = useState<Array<{
    uuid: string;
    name: string;
    created_at: number;
    original_size?: number;
  }>>([]);
  const [loading, setLoading] = useState(false);
  const [expandedSidebar, setExpandedSidebar] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    open: boolean;
    sessionUuid: string;
    sessionName: string;
  }>({ open: false, sessionUuid: '', sessionName: '' });
  const [menuOpen, setMenuOpen] = useState(false);
  const [deleteAllOpen, setDeleteAllOpen] = useState(false);

  const { appMode } = useModelStore();

  const loadSessions = async () => {
    setLoading(true);
    try {
      const sessionList = await SessionPersistence.getSessionList();
      setSessions(sessionList);
    } catch (error) {
      console.error('Failed to load session list:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSessions();
  }, []);

  const handleDeleteClick = (uuid: string, sessionName: string, event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation(); // Prevent triggering load
    
    console.log('🗑️ Delete button clicked for session:', uuid);
    
    // Open confirmation dialog
    setDeleteConfirmation({
      open: true,
      sessionUuid: uuid,
      sessionName: sessionName
    });
  };

  const handleConfirmDelete = async () => {
    const { sessionUuid } = deleteConfirmation;
    console.log('🗑️ User confirmed deletion, proceeding...');
    
    try {
      const deleted = await SessionPersistence.deleteSession(sessionUuid);
      console.log('🗑️ Delete result:', deleted);
      
      if (deleted) {
        setSessions(prev => prev.filter(s => s.uuid !== sessionUuid));
        console.log('🗑️ Session deleted successfully from UI');
      } else {
        console.error('🗑️ Session was not found or could not be deleted');
      }
    } catch (error) {
      console.error('🗑️ Failed to delete session:', error);
    } finally {
      setDeleteConfirmation({ open: false, sessionUuid: '', sessionName: '' });
    }
  };

  const handleCancelDelete = () => {
    console.log('🗑️ Delete cancelled by user');
    setDeleteConfirmation({ open: false, sessionUuid: '', sessionName: '' });
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  };

  return (
    <div className={`bg-gray-800 text-white transition-all duration-200 ${
      expandedSidebar ? 'w-80' : 'w-16'
    }`}>
      {/* App Branding */}
      <div className="p-4 border-b border-gray-700">
        <div className="w-8 h-8 rounded flex items-center justify-center">
          <img 
            src="/app-icon.png" 
            alt="App Logo" 
            className="w-8 h-8 rounded"
          />
        </div>
      </div>

      {/* App Mode Toggle (moved from header) */}
      <div className="p-4 border-b border-gray-700">
        <div className="flex flex-col gap-2">
          {/* Chat Mode Button */}
          <button
            onClick={() => onHandlePotentialClose(onSwitchToChat, 'switch-mode')}
            disabled={appMode === 'chat'}
            aria-label="Chat Mode"
            title="Chat Mode"
            className={`w-8 h-8 rounded flex items-center justify-center transition-colors ${
              appMode === 'chat' 
                ? 'bg-blue-500 text-white' 
                : 'bg-gray-600 text-gray-200 hover:bg-gray-500'
            }`}
          >
            {/* Chat bubble icon */}
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h6m5 8l-4-4H7a4 4 0 01-4-4V7a4 4 0 014-4h10a4 4 0 014 4v5a4 4 0 01-4 4z" />
            </svg>
          </button>

          {/* Analysis Mode Button */}
          <button
            onClick={() => onHandlePotentialClose(onSwitchToAnalysis, 'switch-mode')}
            disabled={appMode === 'analysis'}
            aria-label="Analysis Mode"
            title="Analysis Mode"
            className={`w-8 h-8 rounded flex items-center justify-center transition-colors ${
              appMode === 'analysis' 
                ? 'bg-purple-500 text-white' 
                : 'bg-gray-600 text-gray-200 hover:bg-gray-500'
            }`}
          >
            {/* Chart icon */}
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3v18h18M9 17V9m4 8V5m4 12v-6" />
            </svg>
          </button>
        </div>
      </div>
      
      {/* History Toggle Button */}
      <div className="p-4 border-b border-gray-700">
        <button
          onClick={() => setExpandedSidebar(!expandedSidebar)}
          className="w-8 h-8 bg-gray-600 rounded flex items-center justify-center hover:bg-gray-500 transition-colors"
          title={expandedSidebar ? "Collapse sidebar" : "Expand session history"}
        >
          {expandedSidebar ? (
            // Left arrow for collapse
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          ) : (
            // History icon for expand
            <svg className="w-5 h-5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          )}
        </button>
      </div>

      {expandedSidebar && (
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-4 border-b border-gray-700">
            <div className="flex justify-between items-center mb-2 relative">
              <h3 className="text-lg font-semibold">Saved Sessions</h3>
              <div className="flex items-center gap-1">
                <button
                  onClick={loadSessions}
                  disabled={loading}
                  className="p-1 text-gray-400 hover:text-white transition-colors"
                  title="Refresh session list"
                >
                  {loading ? '⟳' : '↻'}
                </button>
                {/* Kebab menu */}
                <button
                  onClick={() => setMenuOpen((v) => !v)}
                  className="p-1 text-gray-400 hover:text-white transition-colors"
                  title="More options"
                  aria-haspopup="menu"
                  aria-expanded={menuOpen}
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M12 5a1.5 1.5 0 110-3 1.5 1.5 0 010 3zm0 8a1.5 1.5 0 110-3 1.5 1.5 0 010 3zm0 8a1.5 1.5 0 110-3 1.5 1.5 0 010 3z" />
                  </svg>
                </button>
                {menuOpen && (
                  <div className="absolute right-0 top-8 bg-white text-gray-800 rounded shadow-lg z-10 w-40">
                    <button
                      onClick={() => { setDeleteAllOpen(true); setMenuOpen(false); }}
                      className="w-full text-left px-4 py-2 hover:bg-gray-100 text-red-600"
                    >
                      Delete ALL
                    </button>
                  </div>
                )}
              </div>
            </div>
            <p className="text-sm text-gray-400">
              {sessions.length} session{sessions.length !== 1 ? 's' : ''}
            </p>
          </div>

          {/* Session List */}
          <div className="flex-1 overflow-y-auto">
            {sessions.length === 0 ? (
              <div className="p-4 text-center text-gray-400">
                <p>No saved sessions</p>
                <p className="text-xs mt-1">Save a session to see it here</p>
              </div>
            ) : (
              <div className="space-y-1 p-2">
{sessions.map((session) => (
  <div
    key={session.uuid}
onClick={() => onLoadSession(session.uuid)}
    className="group bg-gray-700 hover:bg-gray-600 rounded p-3 cursor-pointer transition-colors"
  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium truncate text-sm">
                          {session.name}
                        </h4>
                        <div className="flex items-center gap-2 mt-1">
                          <p className="text-xs text-gray-300">
                            {new Date(session.created_at * 1000).toLocaleDateString()}
                          </p>
                          {session.original_size && (
                            <span className="text-xs text-gray-400">
                              {formatFileSize(session.original_size)}
                            </span>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={(e) => handleDeleteClick(session.uuid, session.name, e)}
                        className="opacity-0 group-hover:opacity-100 p-1 text-red-400 hover:text-red-300 transition-all"
                        title="Delete session"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmationDialog
        isOpen={deleteConfirmation.open}
        onClose={handleCancelDelete}
        onConfirm={handleConfirmDelete}
        itemName={deleteConfirmation.sessionName}
        itemType="Session"
        description="All conversation history and telemetry data will be permanently removed."
      />

      {/* Delete ALL Sessions Dialog (styled like UnsavedChangesDialog) */}
      <DeleteAllSessionsDialog
        isOpen={deleteAllOpen}
        onClose={() => setDeleteAllOpen(false)}
        onConfirm={async () => {
          try {
            setLoading(true);
            const list = await SessionPersistence.getSessionList();
            await Promise.all(list.map(item => SessionPersistence.deleteSession(item.uuid)));
            setSessions([]);
          } catch (error) {
            console.error('🗑️ Failed to delete all sessions:', error);
          } finally {
            setLoading(false);
            setDeleteAllOpen(false);
          }
        }}
        count={sessions.length}
      />

    </div>
  );
};

export const LeftSidebar: React.FC<{
  onLoadSession: (uuid: string) => void;
  onSwitchToChat: () => void;
  onSwitchToAnalysis: () => void;
  onHandlePotentialClose: (
    closeAction: () => void,
    context?: 'close' | 'clear' | 'switch-mode' | 'new-chat'
  ) => void;
}> = ({ onLoadSession, onSwitchToChat, onSwitchToAnalysis, onHandlePotentialClose }) => {
  return (
    <SessionHistoryPanel 
      onLoadSession={onLoadSession}
      onSwitchToChat={onSwitchToChat}
      onSwitchToAnalysis={onSwitchToAnalysis}
      onHandlePotentialClose={onHandlePotentialClose}
    />
  );
};

export default LeftSidebar;

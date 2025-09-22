import React from 'react';

interface DeleteAllSessionsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  count?: number;
}

/**
 * DeleteAllSessionsDialog
 *
 * Confirmation dialog styled similarly to UnsavedChangesDialog (yellow warning theme),
 * but with deletion semantics for removing ALL saved sessions.
 */
export const DeleteAllSessionsDialog: React.FC<DeleteAllSessionsDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  count = 0,
}) => {
  if (!isOpen) return null;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-gray-900 bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50"
      onKeyDown={handleKeyDown}
    >
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.314 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-medium text-gray-900">Delete All Saved Sessions?</h3>
              <p className="text-sm text-gray-500">
                This action cannot be undone.
              </p>
            </div>
          </div>
        </div>

        <div className="px-6 py-4">
          <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <h4 className="text-sm font-medium text-yellow-800 mb-2">You are about to delete:</h4>
            <div className="space-y-1 text-xs text-yellow-700">
              <div className="flex items-center gap-2">
                <span>🗑️</span>
                <span>{count} saved session{count !== 1 ? 's' : ''}</span>
              </div>
            </div>
          </div>

          <p className="text-sm text-gray-600">
            Are you sure you want to permanently delete all saved sessions?
          </p>
        </div>

        <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            autoFocus
          >
            Cancel
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onConfirm();
            }}
            className="px-4 py-2 text-white bg-red-500 rounded-lg hover:bg-red-600 transition-colors font-medium"
          >
            Delete ALL
          </button>
        </div>
      </div>
    </div>
  );
};

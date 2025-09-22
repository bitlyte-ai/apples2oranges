import React, { useCallback, useEffect, useState } from 'react';

interface ResizeHandleProps {
  onResize: (deltaX: number) => void;
  className?: string;
}

export const ResizeHandle: React.FC<ResizeHandleProps> = ({ 
  onResize, 
  className = '' 
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    setStartX(e.clientX);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return;
    
    const deltaX = e.clientX - startX;
    onResize(deltaX);
    setStartX(e.clientX);
  }, [isDragging, startX, onResize]);

  const handleMouseUp = useCallback(() => {
    if (!isDragging) return;
    
    setIsDragging(false);
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  }, [isDragging]);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  return (
    <div
      className={`w-1 bg-gray-200 hover:bg-blue-400 cursor-col-resize transition-colors duration-200 relative group ${className}`}
      onMouseDown={handleMouseDown}
      style={{ minHeight: '100%' }}
    >
      {/* Visual indicator on hover */}
      <div className="absolute inset-0 w-2 -left-0.5 bg-transparent group-hover:bg-blue-400 group-hover:opacity-50 transition-all duration-200" />
      
      {/* Drag hint when dragging */}
      {isDragging && (
        <div
          className="absolute bg-blue-500 text-white text-xs px-2 py-1 rounded shadow-lg pointer-events-none whitespace-nowrap"
          style={{ top: 'calc(50% + 14px)', left: '50%', transform: 'translate(-50%, 0)' }}
        >
          Drag to resize
        </div>
      )}
    </div>
  );
};
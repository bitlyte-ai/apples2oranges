import React, { useState, useRef, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom';

interface SmartTooltipProps {
  title: string;
  description: string;
  children: React.ReactNode;
  className?: string;
  preferredPosition?: 'top' | 'bottom' | 'left' | 'right';
}

/**
 * SmartTooltip Component
 * 
 * An enhanced tooltip that automatically adjusts its position to prevent viewport overflow.
 * Uses React Portal to render outside of parent container constraints.
 * 
 * Features:
 * - Dynamic positioning based on available viewport space
 * - Portal rendering to escape parent overflow constraints
 * - Smooth transitions and animations
 * - Responsive to viewport changes
 * - Maintains visual consistency with existing tooltips
 */
export const SmartTooltip: React.FC<SmartTooltipProps> = ({
  title,
  description,
  children,
  className = '',
  preferredPosition = 'top'
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [position, setPosition] = useState<'top' | 'bottom' | 'left' | 'right'>(preferredPosition);
  const [tooltipStyle, setTooltipStyle] = useState<React.CSSProperties>({});
  const triggerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const calculatePosition = useCallback(() => {
    if (!triggerRef.current || !isHovered) return;

    const triggerRect = triggerRef.current.getBoundingClientRect();
    const tooltipWidth = 320; // w-80 = 20rem = 320px
    const tooltipHeight = 100; // Approximate height
    const padding = 8; // Space between trigger and tooltip
    
    const viewport = {
      width: window.innerWidth,
      height: window.innerHeight
    };

    // Calculate available space in each direction
    const spaceTop = triggerRect.top;
    const spaceBottom = viewport.height - triggerRect.bottom;
    const spaceLeft = triggerRect.left;
    const spaceRight = viewport.width - triggerRect.right;

    // Determine best position based on available space
    let bestPosition = preferredPosition;
    const style: React.CSSProperties = {
      position: 'fixed',
      zIndex: 9999, // High z-index to ensure it's on top
    };

    // Try preferred position first, then fallback to best available space
    const tryPositions = [
      preferredPosition,
      'left',
      'right',
      'top',
      'bottom'
    ];

    for (const pos of tryPositions) {
      let fits = false;

      switch (pos) {
        case 'top':
          if (spaceTop >= tooltipHeight + padding) {
            style.left = Math.min(
              Math.max(padding, triggerRect.left + triggerRect.width / 2 - tooltipWidth / 2),
              viewport.width - tooltipWidth - padding
            );
            style.bottom = viewport.height - triggerRect.top + padding;
            fits = true;
          }
          break;

        case 'bottom':
          if (spaceBottom >= tooltipHeight + padding) {
            style.left = Math.min(
              Math.max(padding, triggerRect.left + triggerRect.width / 2 - tooltipWidth / 2),
              viewport.width - tooltipWidth - padding
            );
            style.top = triggerRect.bottom + padding;
            fits = true;
          }
          break;

        case 'left':
          if (spaceLeft >= tooltipWidth + padding) {
            style.right = viewport.width - triggerRect.left + padding;
            style.top = Math.min(
              Math.max(padding, triggerRect.top + triggerRect.height / 2 - tooltipHeight / 2),
              viewport.height - tooltipHeight - padding
            );
            fits = true;
          }
          break;

        case 'right':
          if (spaceRight >= tooltipWidth + padding) {
            style.left = triggerRect.right + padding;
            style.top = Math.min(
              Math.max(padding, triggerRect.top + triggerRect.height / 2 - tooltipHeight / 2),
              viewport.height - tooltipHeight - padding
            );
            fits = true;
          }
          break;
      }

      if (fits) {
        bestPosition = pos as typeof position;
        break;
      }
    }

    // If no position fits perfectly, use the position with most space and allow scrolling
    if (!style.left && !style.right && !style.top && !style.bottom) {
      if (spaceLeft > spaceRight) {
        style.right = viewport.width - triggerRect.left + padding;
        style.top = triggerRect.top;
        bestPosition = 'left';
      } else {
        style.left = triggerRect.right + padding;
        style.top = triggerRect.top;
        bestPosition = 'right';
      }
    }

    setPosition(bestPosition);
    setTooltipStyle(style);
  }, [isHovered, preferredPosition]);

  useEffect(() => {
    calculatePosition();
    
    if (isHovered) {
      const handleResize = () => calculatePosition();
      const handleScroll = () => calculatePosition();
      
      window.addEventListener('resize', handleResize);
      window.addEventListener('scroll', handleScroll, true);
      
      return () => {
        window.removeEventListener('resize', handleResize);
        window.removeEventListener('scroll', handleScroll, true);
      };
    }
  }, [isHovered, calculatePosition]);

  const handleMouseEnter = () => {
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
  };

  const handleFocus = () => {
    setIsHovered(true);
  };

  const handleBlur = () => {
    setIsHovered(false);
  };

  // Arrow positioning based on actual position
  const getArrowStyle = (): React.CSSProperties => {
    if (!triggerRef.current) return {};
    
    const triggerRect = triggerRef.current.getBoundingClientRect();
    const arrowSize = 6;
    const style: React.CSSProperties = {
      position: 'fixed',
      width: 0,
      height: 0,
      borderStyle: 'solid',
      zIndex: 9999,
    };

    switch (position) {
      case 'top':
        style.left = triggerRect.left + triggerRect.width / 2 - arrowSize;
        style.top = triggerRect.top - arrowSize - 2;
        style.borderWidth = `${arrowSize}px ${arrowSize}px 0`;
        style.borderColor = '#111827 transparent transparent'; // gray-900
        break;

      case 'bottom':
        style.left = triggerRect.left + triggerRect.width / 2 - arrowSize;
        style.bottom = window.innerHeight - triggerRect.bottom + arrowSize + 2;
        style.borderWidth = `0 ${arrowSize}px ${arrowSize}px`;
        style.borderColor = 'transparent transparent #111827'; // gray-900
        break;

      case 'left':
        style.left = triggerRect.left - arrowSize - 2;
        style.top = triggerRect.top + triggerRect.height / 2 - arrowSize;
        style.borderWidth = `${arrowSize}px 0 ${arrowSize}px ${arrowSize}px`;
        style.borderColor = 'transparent transparent transparent #111827'; // gray-900
        break;

      case 'right':
        style.right = window.innerWidth - triggerRect.right + arrowSize + 2;
        style.top = triggerRect.top + triggerRect.height / 2 - arrowSize;
        style.borderWidth = `${arrowSize}px ${arrowSize}px ${arrowSize}px 0`;
        style.borderColor = 'transparent #111827 transparent transparent'; // gray-900
        break;
    }

    return style;
  };

  const tooltipContent = isHovered ? (
    ReactDOM.createPortal(
      <>
        {/* Tooltip body */}
        <div
          ref={tooltipRef}
          id="smart-tooltip"
          role="tooltip"
          className="w-80 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg shadow-lg transition-opacity duration-200"
          style={{
            ...tooltipStyle,
            opacity: isHovered ? 1 : 0,
            pointerEvents: 'none',
          }}
        >
          <div className="font-medium mb-1">{title}</div>
          <div className="text-gray-300 leading-relaxed whitespace-pre-wrap">
            {description}
          </div>
        </div>
        
        {/* Arrow */}
        <div
          style={{
            ...getArrowStyle(),
            opacity: isHovered ? 1 : 0,
            transition: 'opacity 200ms',
            pointerEvents: 'none',
          }}
        />
      </>,
      document.body
    )
  ) : null;

  return (
    <>
      <div
        ref={triggerRef}
        className={`inline-block ${className}`}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onFocus={handleFocus}
        onBlur={handleBlur}
        aria-describedby={isHovered ? 'smart-tooltip' : undefined}
      >
        {children}
      </div>
      {tooltipContent}
    </>
  );
};

export default SmartTooltip;
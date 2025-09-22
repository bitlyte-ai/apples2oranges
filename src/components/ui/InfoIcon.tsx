import React from 'react';
import { SmartTooltip } from './SmartTooltip';

interface InfoIconProps {
  title: string;           // Tooltip title
  description: string;     // Detailed explanation
  position?: 'top' | 'bottom' | 'left' | 'right';  // Tooltip position
  className?: string;      // Additional CSS classes
}

/**
 * InfoIcon Component
 * 
 * Provides consistent educational tooltips throughout the application.
 * Used for parameter explanations, feature descriptions, and help text.
 * 
 * Design decisions:
 * - Uses SmartTooltip for intelligent positioning and overflow prevention
 * - Portal-based rendering to escape container constraints
 * - Maintains same SVG icon for consistency
 * - Responsive positioning adapts to viewport boundaries
 */
export const InfoIcon: React.FC<InfoIconProps> = ({
  title,
  description,
  position = 'top',
  className = ''
}) => {
  return (
    <SmartTooltip
      title={title}
      description={description}
      preferredPosition={position}
      className={className}
    >
      {/* Same SVG icon as TelemetryConfigPanel for consistency */}
      <svg className="w-4 h-4 text-gray-400 cursor-help" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
      </svg>
    </SmartTooltip>
  );
};

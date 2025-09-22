import React, { useState, useRef, useEffect } from 'react';

interface ModelTargetSelectorProps {
  value: 'A' | 'B' | 'Both';
  onChange: (target: 'A' | 'B' | 'Both') => void;
  availableTargets: string[];
  disabled?: boolean;
  className?: string;
}

interface DropdownPosition {
  openUpward: boolean;
  maxHeight: number;
}

const calculateDropdownPosition = (buttonElement: HTMLElement): DropdownPosition => {
  const buttonRect = buttonElement.getBoundingClientRect();
  const viewportHeight = window.innerHeight;
  
  // Calculate available space below and above the button
  const spaceBelow = viewportHeight - buttonRect.bottom;
  const spaceAbove = buttonRect.top;
  
  // Dropdown content height estimates (for 3 options max)
  const dropdownPadding = 8; // mt-1 = 4px + padding
  const minDropdownHeight = 80; // Minimum for 2-3 options
  const maxDropdownHeight = 160; // Reasonable max for model selector
  
  // Determine if we should open upward
  const shouldOpenUpward = spaceBelow < minDropdownHeight && spaceAbove > spaceBelow;
  
  // Calculate optimal max height
  const availableSpace = shouldOpenUpward ? spaceAbove : spaceBelow;
  const optimalMaxHeight = Math.min(
    Math.max(availableSpace - dropdownPadding - 20, minDropdownHeight), // 20px buffer for safety
    maxDropdownHeight
  );
  
  return {
    openUpward: shouldOpenUpward,
    maxHeight: optimalMaxHeight
  };
};

const TARGET_LABELS = {
  'A': 'Model A',
  'B': 'Model B', 
  'Both': 'Both Models'
};

const TARGET_ICONS = {
  'A': (
    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
  ),
  'B': (
    <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
  ),
  'Both': (
    <div className="flex space-x-1">
      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
      <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
    </div>
  )
};

export const ModelTargetSelector: React.FC<ModelTargetSelectorProps> = ({
  value,
  onChange,
  availableTargets,
  disabled = false,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState<DropdownPosition>({ openUpward: false, maxHeight: 160 });
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Update dropdown position when opening
  const updateDropdownPosition = () => {
    if (buttonRef.current) {
      const position = calculateDropdownPosition(buttonRef.current);
      setDropdownPosition(position);
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Update position on window resize/scroll
  useEffect(() => {
    const handleResize = () => {
      if (isOpen) {
        updateDropdownPosition();
      }
    };

    if (isOpen) {
      window.addEventListener('resize', handleResize);
      window.addEventListener('scroll', handleResize, true);
      return () => {
        window.removeEventListener('resize', handleResize);
        window.removeEventListener('scroll', handleResize, true);
      };
    }
  }, [isOpen]);

  const handleSelect = (target: string) => {
    onChange(target as 'A' | 'B' | 'Both');
    setIsOpen(false);
  };

  const handleToggleOpen = () => {
    if (!disabled) {
      const newIsOpen = !isOpen;
      setIsOpen(newIsOpen);
      if (newIsOpen) {
        // Calculate position when opening
        setTimeout(updateDropdownPosition, 0); // Use setTimeout to ensure DOM is updated
      }
    }
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Dropdown Button - Compact Design */}
      <button
        ref={buttonRef}
        type="button"
        onClick={handleToggleOpen}
        disabled={disabled}
        className={`px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
          disabled 
            ? 'bg-gray-100 text-gray-500 cursor-not-allowed' 
            : 'bg-white text-gray-900 hover:bg-gray-50 cursor-pointer'
        } ${isOpen ? 'border-blue-500 ring-2 ring-blue-500 ring-opacity-20' : 'border-gray-300'}`}
      >
        <div className="flex items-center justify-between min-w-[100px]">
          <div className="flex items-center space-x-2">
            {TARGET_ICONS[value]}
            <span className="font-medium">{TARGET_LABELS[value]}</span>
          </div>
          <svg 
            className={`w-4 h-4 text-gray-400 transition-transform duration-200 ml-2 ${
              isOpen ? (dropdownPosition.openUpward ? '' : 'rotate-180') : (dropdownPosition.openUpward ? 'rotate-180' : '')
            }`} 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div 
          className={`absolute z-50 w-full bg-white border border-gray-300 rounded-lg shadow-lg overflow-auto transition-all duration-200 ${
            dropdownPosition.openUpward ? 'bottom-full mb-1' : 'top-full mt-1'
          }`}
          style={{ maxHeight: `${dropdownPosition.maxHeight}px` }}
        >
          {availableTargets.map((target) => (
            <button
              key={target}
              type="button"
              onClick={() => handleSelect(target)}
              className={`w-full text-left px-3 py-2 text-sm hover:bg-blue-50 hover:text-blue-900 focus:bg-blue-50 focus:text-blue-900 focus:outline-none first:rounded-t-lg last:rounded-b-lg ${
                value === target ? 'bg-blue-50 text-blue-900' : 'text-gray-900'
              }`}
            >
              <div className="flex items-center space-x-2">
                {TARGET_ICONS[target as keyof typeof TARGET_ICONS]}
                <span className="font-medium">{TARGET_LABELS[target as keyof typeof TARGET_LABELS]}</span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
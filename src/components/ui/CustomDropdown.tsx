import React, { useState, useRef, useEffect } from 'react';
import type { TelemetrySession } from '../../types/telemetry';

export interface DropdownOption {
  id: string;
  label: string;
  subtitle?: string;
  data?: any;
  isCustomInput?: boolean;
}

interface CustomDropdownProps {
  label: string;
  placeholder: string;
  options: DropdownOption[];
  selectedOption: DropdownOption | null;
  onSelect: (option: DropdownOption | null) => void;
  disabled?: boolean;
  className?: string;
  // Custom input functionality
  allowCustomInput?: boolean;
  customInputPlaceholder?: string;
  customInputType?: 'text' | 'number';
  onCustomInput?: (value: string) => void;
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
  
  // Dropdown content height estimates (with padding)
  const dropdownPadding = 8; // mt-1 = 4px + padding
  const minDropdownHeight = 120; // Minimum reasonable height
  const maxDropdownHeight = 240; // max-h-60 = 240px
  
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

export const CustomDropdown: React.FC<CustomDropdownProps> = ({
  label,
  placeholder,
  options,
  selectedOption,
  onSelect,
  disabled = false,
  className = '',
  allowCustomInput = false,
  customInputPlaceholder = 'Enter custom value...',
  customInputType = 'text',
  onCustomInput,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isCustomMode, setIsCustomMode] = useState(false);
  const [customValue, setCustomValue] = useState('');
  const [dropdownPosition, setDropdownPosition] = useState<DropdownPosition>({ openUpward: false, maxHeight: 240 });
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
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
        setIsCustomMode(false);
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

  // Focus input when entering custom mode
  useEffect(() => {
    if (isCustomMode && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isCustomMode]);

  const handleOptionSelect = (option: DropdownOption) => {
    if (option.isCustomInput && allowCustomInput) {
      setIsCustomMode(true);
      setCustomValue('');
      // Don't close dropdown when selecting custom input option
    } else {
      onSelect(option);
      setIsOpen(false);
      setIsCustomMode(false);
    }
  };

  const handleCustomSubmit = () => {
    if (onCustomInput) {
      onCustomInput(customValue);
    }
    setIsOpen(false);
    setIsCustomMode(false);
  };

  const handleCustomCancel = () => {
    setIsCustomMode(false);
    setCustomValue('');
  };

  const handleCustomKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleCustomSubmit();
    } else if (e.key === 'Escape') {
      handleCustomCancel();
    }
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
      <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
      
      {/* Dropdown Button */}
      <button
        ref={buttonRef}
        type="button"
        onClick={handleToggleOpen}
        disabled={disabled}
        className={`w-full px-3 py-2 text-left border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
          disabled 
            ? 'bg-gray-100 text-gray-500 cursor-not-allowed' 
            : 'bg-white text-gray-900 hover:bg-gray-50 cursor-pointer'
        } ${isOpen ? 'border-blue-500 ring-2 ring-blue-500 ring-opacity-20' : 'border-gray-300'}`}
      >
        <div className="flex items-center justify-between">
          <span className={selectedOption ? 'text-gray-900' : 'text-gray-500'}>
            {selectedOption?.label || placeholder}
          </span>
          <svg 
            className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${
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
          className={`absolute z-50 w-full bg-white border border-gray-300 rounded-md shadow-lg overflow-auto transition-all duration-200 ${
            dropdownPosition.openUpward ? 'bottom-full mb-1' : 'top-full mt-1'
          }`}
          style={{ maxHeight: `${dropdownPosition.maxHeight}px` }}
        >
          {!isCustomMode ? (
            // Standard options
            options.length === 0 ? (
              <div className="px-3 py-2 text-sm text-gray-500">No options available</div>
            ) : (
              options.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => handleOptionSelect(option)}
                  className={`w-full text-left px-3 py-2 text-sm hover:bg-blue-50 hover:text-blue-900 focus:bg-blue-50 focus:text-blue-900 focus:outline-none ${
                    selectedOption?.id === option.id ? 'bg-blue-50 text-blue-900' : 'text-gray-900'
                  }`}
                >
                  <div>
                    <div className="font-medium">{option.label}</div>
                    {option.subtitle && (
                      <div className="text-xs text-gray-500 mt-1">{option.subtitle}</div>
                    )}
                  </div>
                </button>
              ))
            )
          ) : (
            // Custom input mode
            <div className="p-3">
              <div className="text-xs font-medium text-gray-700 mb-2">
                {customInputPlaceholder.includes('Enter') ? customInputPlaceholder : `Enter ${customInputPlaceholder}`}
              </div>
              <input
                ref={inputRef}
                type={customInputType}
                value={customValue}
                onChange={(e) => setCustomValue(e.target.value)}
                onKeyDown={handleCustomKeyDown}
                placeholder={customInputPlaceholder}
                className="w-full p-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                min={customInputType === 'number' ? '0.1' : undefined}
                max={customInputType === 'number' ? '50' : undefined}
                step={customInputType === 'number' ? '0.1' : undefined}
              />
              <div className="flex gap-2 mt-2">
                <button
                  type="button"
                  onClick={handleCustomSubmit}
                  className="flex-1 px-3 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  Apply
                </button>
                <button
                  type="button"
                  onClick={handleCustomCancel}
                  className="flex-1 px-3 py-1 bg-gray-500 text-white rounded text-xs hover:bg-gray-600 focus:outline-none focus:ring-1 focus:ring-gray-500"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

interface MultiSelectDropdownProps {
  label: string;
  placeholder: string;
  options: DropdownOption[];
  selectedOptions: DropdownOption[];
  onSelectionChange: (options: DropdownOption[]) => void;
  disabled?: boolean;
  maxSelections?: number;
  className?: string;
}

export const MultiSelectDropdown: React.FC<MultiSelectDropdownProps> = ({
  label,
  placeholder,
  options,
  selectedOptions,
  onSelectionChange,
  disabled = false,
  maxSelections = 7,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState<DropdownPosition>({ openUpward: false, maxHeight: 240 });
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

  const handleOptionToggle = (option: DropdownOption) => {
    const isSelected = selectedOptions.some(selected => selected.id === option.id);
    
    if (isSelected) {
      // Remove from selection
      onSelectionChange(selectedOptions.filter(selected => selected.id !== option.id));
    } else {
      // Add to selection if under limit
      if (selectedOptions.length < maxSelections) {
        onSelectionChange([...selectedOptions, option]);
      }
    }
  };

  const displayText = selectedOptions.length === 0 
    ? placeholder
    : selectedOptions.length === 1
      ? selectedOptions[0].label
      : `${selectedOptions.length} sessions selected`;

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
      <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
      
      {/* Dropdown Button */}
      <button
        ref={buttonRef}
        type="button"
        onClick={handleToggleOpen}
        disabled={disabled}
        className={`w-full px-3 py-2 text-left border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
          disabled 
            ? 'bg-gray-100 text-gray-500 cursor-not-allowed' 
            : 'bg-white text-gray-900 hover:bg-gray-50 cursor-pointer'
        } ${isOpen ? 'border-blue-500 ring-2 ring-blue-500 ring-opacity-20' : 'border-gray-300'}`}
      >
        <div className="flex items-center justify-between">
          <span className={selectedOptions.length > 0 ? 'text-gray-900' : 'text-gray-500'}>
            {displayText}
          </span>
          <div className="flex items-center space-x-2">
            {selectedOptions.length > 0 && (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                {selectedOptions.length}
              </span>
            )}
            <svg 
              className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${
                isOpen ? (dropdownPosition.openUpward ? '' : 'rotate-180') : (dropdownPosition.openUpward ? 'rotate-180' : '')
              }`} 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
      </button>

      {/* Selected Items Tags */}
      {selectedOptions.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {selectedOptions.map((option) => (
            <span
              key={option.id}
              className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-100 text-blue-800"
            >
              {option.label}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleOptionToggle(option);
                }}
                className="ml-1 inline-flex items-center justify-center w-4 h-4 rounded-full hover:bg-blue-200 focus:outline-none"
              >
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Dropdown Menu */}
      {isOpen && (
        <div 
          className={`absolute z-50 w-full bg-white border border-gray-300 rounded-md shadow-lg overflow-auto transition-all duration-200 ${
            dropdownPosition.openUpward ? 'bottom-full mb-1' : 'top-full mt-1'
          }`}
          style={{ maxHeight: `${dropdownPosition.maxHeight}px` }}
        >
          {options.length === 0 ? (
            <div className="px-3 py-2 text-sm text-gray-500">No options available</div>
          ) : (
            <>
              {/* Header with selection info */}
              <div className="px-3 py-2 bg-gray-50 border-b border-gray-200 text-xs text-gray-600">
                {selectedOptions.length} of {maxSelections} sessions selected
              </div>
              
              {options.map((option) => {
                const isSelected = selectedOptions.some(selected => selected.id === option.id);
                const isDisabled = !isSelected && selectedOptions.length >= maxSelections;
                
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => !isDisabled && handleOptionToggle(option)}
                    disabled={isDisabled}
                    className={`w-full text-left px-3 py-2 text-sm focus:outline-none ${
                      isDisabled
                        ? 'text-gray-400 cursor-not-allowed'
                        : isSelected
                          ? 'bg-blue-50 text-blue-900 hover:bg-blue-100'
                          : 'text-gray-900 hover:bg-blue-50 hover:text-blue-900'
                    }`}
                  >
                    <div className="flex items-center">
                      {/* Checkbox */}
                      <div className={`w-4 h-4 mr-3 border rounded flex items-center justify-center ${
                        isSelected ? 'bg-blue-500 border-blue-500' : 'border-gray-300'
                      }`}>
                        {isSelected && (
                          <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>
                      
                      <div className="flex-1">
                        <div className="font-medium">{option.label}</div>
                        {option.subtitle && (
                          <div className="text-xs text-gray-500 mt-1">{option.subtitle}</div>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </>
          )}
        </div>
      )}
    </div>
  );
};

// Helper function to convert TelemetrySession to DropdownOption
export const sessionToDropdownOption = (session: TelemetrySession): DropdownOption => ({
  id: session.id,
  label: session.name,
  subtitle: `${new Date(session.timestamp).toLocaleDateString()} • ${Math.round(session.summary.duration_ms / 1000)}s • ${session.summary.avg_tps.toFixed(1)} TPS`,
  data: session,
});
import React, { useState, useRef, useEffect } from 'react';

interface Option {
  id: string;
  label: string;
  value: string;
  disabled?: boolean;
}

interface MultiSelectDropdownProps {
  options: Option[];
  selectedIds: string[];
  onChange: (selectedIds: string[]) => void;
  placeholder?: string;
  maxSelections?: number;
  disabled?: boolean;
  className?: string;
  label?: string;
  emptyMessage?: string;
}

export const MultiSelectDropdown: React.FC<MultiSelectDropdownProps> = ({
  options,
  selectedIds,
  onChange,
  placeholder = 'Select items...',
  maxSelections = 5,
  disabled = false,
  className = '',
  label,
  emptyMessage = 'No options available',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

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

  const handleToggle = (optionId: string) => {
    if (selectedIds.includes(optionId)) {
      // Remove from selection
      onChange(selectedIds.filter(id => id !== optionId));
    } else {
      // Add to selection if under limit
      if (selectedIds.length < maxSelections) {
        onChange([...selectedIds, optionId]);
      }
    }
  };

  const handleClearAll = () => {
    onChange([]);
  };

  const selectedOptions = options.filter(option => selectedIds.includes(option.id));
  const availableOptions = options.filter(option => !option.disabled);
  const atMaxSelections = selectedIds.length >= maxSelections;

  const getDisplayText = () => {
    if (selectedIds.length === 0) {
      return placeholder;
    } else if (selectedIds.length === 1) {
      return selectedOptions[0]?.label || placeholder;
    } else {
      return `${selectedIds.length} sessions selected`;
    }
  };

  return (
    <div className={`relative ${className}`}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
      )}
      
      <div className="relative" ref={dropdownRef}>
        {/* Dropdown Button */}
        <button
          type="button"
          onClick={() => !disabled && setIsOpen(!isOpen)}
          disabled={disabled}
          className={`w-full px-3 py-2 text-left text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
            disabled 
              ? 'bg-gray-100 text-gray-500 cursor-not-allowed' 
              : 'bg-white text-gray-900 hover:bg-gray-50 cursor-pointer'
          } ${isOpen ? 'border-blue-500 ring-2 ring-blue-500 ring-opacity-20' : 'border-gray-300'}`}
        >
          <div className="flex items-center justify-between">
            <span className={selectedIds.length === 0 ? 'text-gray-500' : 'text-gray-900'}>
              {getDisplayText()}
            </span>
            <div className="flex items-center space-x-2">
              {selectedIds.length > 0 && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleClearAll();
                  }}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                  title="Clear all selections"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
              <svg 
                className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </button>

        {/* Dropdown Menu */}
        {isOpen && (
          <div className="absolute z-20 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
            {availableOptions.length === 0 ? (
              <div className="px-3 py-2 text-sm text-gray-500 text-center">
                {emptyMessage}
              </div>
            ) : (
              <>
                {/* Selection limit indicator */}
                {atMaxSelections && (
                  <div className="px-3 py-2 text-xs text-orange-600 bg-orange-50 border-b border-orange-200">
                    Maximum {maxSelections} selections reached
                  </div>
                )}
                
                {/* Options */}
                {availableOptions.map((option) => {
                  const isSelected = selectedIds.includes(option.id);
                  const isDisabledOption = option.disabled || (!isSelected && atMaxSelections);
                  
                  return (
                    <label
                      key={option.id}
                      className={`flex items-center px-3 py-2 text-sm cursor-pointer transition-colors ${
                        isDisabledOption
                          ? 'text-gray-400 cursor-not-allowed'
                          : 'text-gray-900 hover:bg-blue-50'
                      } ${isSelected ? 'bg-blue-50' : ''}`}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => !isDisabledOption && handleToggle(option.id)}
                        disabled={isDisabledOption}
                        className={`mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded transition-colors ${
                          isDisabledOption ? 'cursor-not-allowed' : 'cursor-pointer'
                        }`}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{option.label}</div>
                        {option.value && (
                          <div className="text-xs text-gray-500 truncate">{option.value}</div>
                        )}
                      </div>
                    </label>
                  );
                })}
              </>
            )}
          </div>
        )}
      </div>

      {/* Selected items display */}
      {selectedIds.length > 0 && (
        <div className="mt-2 space-y-1">
          <div className="text-xs text-gray-600">
            Selected ({selectedIds.length}/{maxSelections}):
          </div>
          <div className="flex flex-wrap gap-1">
            {selectedOptions.map((option) => (
              <span
                key={option.id}
                className="inline-flex items-center px-2 py-1 rounded text-xs bg-blue-100 text-blue-800"
              >
                <span className="truncate max-w-[120px]">{option.label}</span>
                <button
                  type="button"
                  onClick={() => handleToggle(option.id)}
                  className="ml-1 text-blue-600 hover:text-blue-800 transition-colors"
                  title={`Remove ${option.label}`}
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
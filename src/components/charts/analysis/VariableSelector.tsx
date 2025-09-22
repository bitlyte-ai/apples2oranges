import React from 'react';
import type { TelemetryVariable } from '../../../types/charts';
import { TELEMETRY_VARIABLES, getVariableConfig } from './utils';

interface VariableSelectorProps {
  selectedVariable: TelemetryVariable | '';
  onVariableChange: (variable: TelemetryVariable) => void;
  label: string;
  placeholder?: string;
  disabled?: boolean;
}

export const VariableSelector: React.FC<VariableSelectorProps> = ({
  selectedVariable,
  onVariableChange,
  label,
  placeholder = 'Select variable...',
  disabled = false,
}) => {
  return (
    <div className="flex flex-col space-y-2">
      <label className="text-sm font-medium text-gray-700">{label}</label>
      <select
        value={selectedVariable}
        onChange={(e) => onVariableChange(e.target.value as TelemetryVariable)}
        disabled={disabled}
        className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:text-gray-500"
      >
        <option value="">{placeholder}</option>
        {TELEMETRY_VARIABLES.map((variable) => (
          <option key={variable.key} value={variable.key}>
            {variable.label} ({variable.unit})
          </option>
        ))}
      </select>
    </div>
  );
};

interface MultiVariableSelectorProps {
  selectedVariables: TelemetryVariable[];
  onVariablesChange: (variables: TelemetryVariable[]) => void;
  label: string;
  maxSelections?: number;
  minSelections?: number;
  disabled?: boolean;
}

export const MultiVariableSelector: React.FC<MultiVariableSelectorProps> = ({
  selectedVariables,
  onVariablesChange,
  label,
  maxSelections,
  minSelections = 1,
  disabled = false,
}) => {
  const handleVariableToggle = (variable: TelemetryVariable) => {
    const isSelected = selectedVariables.includes(variable);
    
    if (isSelected) {
      // Remove if already selected (but respect minimum)
      if (selectedVariables.length > minSelections) {
        onVariablesChange(selectedVariables.filter(v => v !== variable));
      }
    } else {
      // Add if not selected (but respect maximum)
      if (!maxSelections || selectedVariables.length < maxSelections) {
        onVariablesChange([...selectedVariables, variable]);
      }
    }
  };

  return (
    <div className="flex flex-col space-y-2">
      <label className="text-sm font-medium text-gray-700">
        {label}
        {maxSelections && (
          <span className="text-gray-500 font-normal ml-2">
            ({selectedVariables.length}/{maxSelections} selected)
          </span>
        )}
      </label>
      
      <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto border border-gray-300 rounded-md p-2">
        {TELEMETRY_VARIABLES.map((variable) => {
          const isSelected = selectedVariables.includes(variable.key);
          const canSelect = !maxSelections || selectedVariables.length < maxSelections || isSelected;
          const canDeselect = selectedVariables.length > minSelections || !isSelected;
          const isDisabled = disabled || (!canSelect && !isSelected) || (!canDeselect && isSelected);

          return (
            <label
              key={variable.key}
              className={`flex items-center space-x-2 p-2 rounded cursor-pointer transition-colors ${
                isSelected 
                  ? 'bg-blue-50 border border-blue-200' 
                  : 'hover:bg-gray-50 border border-transparent'
              } ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => handleVariableToggle(variable.key)}
                disabled={isDisabled}
                className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
              />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-900 truncate">
                  {variable.label}
                </div>
                <div className="text-xs text-gray-500">
                  {variable.unit}
                </div>
              </div>
              <div
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: variable.color }}
                title={`Color: ${variable.color}`}
              />
            </label>
          );
        })}
      </div>
      
      {selectedVariables.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedVariables.map((variableKey) => {
            const config = getVariableConfig(variableKey);
            if (!config) return null;
            
            return (
              <span
                key={variableKey}
                className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800"
              >
                <div
                  className="w-2 h-2 rounded-full mr-1"
                  style={{ backgroundColor: config.color }}
                />
                {config.label}
                {selectedVariables.length > minSelections && (
                  <button
                    onClick={() => handleVariableToggle(variableKey)}
                    className="ml-1 text-blue-600 hover:text-blue-800 focus:outline-none"
                    disabled={disabled}
                  >
                    ×
                  </button>
                )}
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
};

interface AxisConfigProps {
  xVariable: TelemetryVariable | '';
  yVariable: TelemetryVariable | '';
  zVariable?: TelemetryVariable | '';
  onXChange: (variable: TelemetryVariable) => void;
  onYChange: (variable: TelemetryVariable) => void;
  onZChange?: (variable: TelemetryVariable) => void;
  disabled?: boolean;
}

export const AxisConfig: React.FC<AxisConfigProps> = ({
  xVariable,
  yVariable,
  zVariable,
  onXChange,
  onYChange,
  onZChange,
  disabled = false,
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <VariableSelector
        selectedVariable={xVariable}
        onVariableChange={onXChange}
        label="X-Axis"
        placeholder="Select X variable..."
        disabled={disabled}
      />
      
      <VariableSelector
        selectedVariable={yVariable}
        onVariableChange={onYChange}
        label="Y-Axis"
        placeholder="Select Y variable..."
        disabled={disabled}
      />
      
      {onZChange && (
        <VariableSelector
          selectedVariable={zVariable || ''}
          onVariableChange={onZChange}
          label="Z-Axis"
          placeholder="Select Z variable..."
          disabled={disabled}
        />
      )}
    </div>
  );
};

interface ChartConfigPanelProps {
  title: string;
  children: React.ReactNode;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export const ChartConfigPanel: React.FC<ChartConfigPanelProps> = ({
  title,
  children,
  isCollapsed = false,
  onToggleCollapse,
}) => {
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
      <div 
        className="px-4 py-3 border-b border-gray-200 flex items-center justify-between cursor-pointer"
        onClick={onToggleCollapse}
      >
        <h3 className="text-lg font-medium text-gray-900">{title}</h3>
        {onToggleCollapse && (
          <button className="text-gray-400 hover:text-gray-600">
            <svg
              className={`w-5 h-5 transition-transform ${isCollapsed ? '' : 'rotate-180'}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        )}
      </div>
      
      {!isCollapsed && (
        <div className="px-4 py-4">
          {children}
        </div>
      )}
    </div>
  );
};
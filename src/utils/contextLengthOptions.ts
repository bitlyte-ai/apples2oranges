import type { DropdownOption } from '../components/ui/CustomDropdown';

// Context length dropdown options with predefined common sizes
export const CONTEXT_LENGTH_OPTIONS: DropdownOption[] = [
  { id: '4k', label: '4,096 (4k)', data: 4096 },
  { id: '8k', label: '8,192 (8k)', data: 8192 },
  { id: '16k', label: '16,384 (16k)', data: 16384 },
  { id: '32k', label: '32,768 (32k)', data: 32768 },
  { id: '64k', label: '65,536 (64k)', data: 65536 },
  { id: '128k', label: '128,000 (128k)', data: 128000 },
  { id: '200k', label: '200,000 (200k)', data: 200000 },
  { id: '1m', label: '1,000,000 (1M)', data: 1000000 },
  { id: 'custom', label: 'Custom...', data: null, isCustomInput: true },
];

// Helper function to find option by value or create custom option
export const getContextLengthOption = (value: number | undefined): DropdownOption | null => {
  if (value === undefined) return null;
  
  // Check if value matches any predefined option
  const predefinedOption = CONTEXT_LENGTH_OPTIONS.find(option => 
    option.data === value && !option.isCustomInput
  );
  
  if (predefinedOption) {
    return predefinedOption;
  }
  
  // Create a custom option for non-standard values
  return {
    id: `custom-${value}`,
    label: `${value.toLocaleString()}`,
    data: value,
    isCustomInput: false
  };
};
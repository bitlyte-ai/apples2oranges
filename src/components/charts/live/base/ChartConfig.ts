/**
 * EXACT color configurations extracted from original chart implementations
 * Maintains 100% fidelity with existing chart styling
 */
export const CHART_COLORS = {
  // Model A colors (Green family)
  modelA: {
    primary: '#10b981',              // Used in Power CPU, TPS Avg
    secondary: '#22c55e',            // Used in Power GPU, Temperature CPU Avg, TPS Instant  
    tertiary: '#16a34a',             // Used in Temperature CPU Max
    quaternary: '#65a30d',           // Used in Temperature GPU
    primaryBg: 'rgba(16, 185, 129, 0.1)',  // Power CPU, TPS backgrounds
    secondaryBg: 'rgba(34, 197, 94, 0.1)',  // Power GPU, Temperature CPU, Memory
    tertiaryBg: 'rgba(22, 163, 74, 0.05)',  // Temperature CPU Max
    quaternaryBg: 'rgba(101, 163, 13, 0.1)', // Temperature GPU
  },
  
  // Model B colors (Purple family)  
  modelB: {
    primary: '#8b5cf6',              // Used in Power CPU, TPS Avg
    secondary: '#a855f7',            // Used in Power GPU, Temperature CPU Avg, Memory, TPS Instant
    tertiary: '#9333ea',             // Used in Temperature CPU Max
    quaternary: '#c026d3',           // Used in Temperature GPU
    primaryBg: 'rgba(139, 92, 246, 0.1)',   // Power CPU, TPS backgrounds
    secondaryBg: 'rgba(168, 85, 247, 0.1)', // Power GPU, Temperature CPU, Memory
    tertiaryBg: 'rgba(147, 51, 234, 0.05)', // Temperature CPU Max
    quaternaryBg: 'rgba(192, 38, 211, 0.1)', // Temperature GPU
  },
} as const;

/**
 * Common Chart.js registration imports
 */
export const CHART_JS_IMPORTS = [
  'Chart as ChartJS',
  'CategoryScale',
  'LinearScale', 
  'PointElement',
  'LineElement',
  'Title',
  'Tooltip',
  'Legend'
] as const;

/**
 * Base dataset configurations that match original implementations exactly
 */
export const DATASET_CONFIGS = {
  // Standard line chart dataset
  line: {
    tension: 0.1,
    pointRadius: 0,
    pointHoverRadius: 4,
  },
  
  // Area fill dataset (used in Memory)
  area: {
    tension: 0.1,
    pointRadius: 1,
    pointHoverRadius: 4,
    fill: true,
  },
  
  // Dashed line dataset (used for GPU, Max values)
  dashed: {
    tension: 0.1,
    pointRadius: 0,
    pointHoverRadius: 4,
  },
} as const;

/**
 * Exact borderDash patterns from original implementations
 */
export const BORDER_DASH_PATTERNS = {
  gpu: [3, 3],        // Used for GPU power lines
  max: [5, 5],        // Used for temperature max lines
  instant: [3, 3],    // Used for instantaneous TPS
} as const;

/**
 * Border width configurations from originals
 */
export const BORDER_WIDTHS = {
  primary: 2,         // Main metrics (CPU power, avg temps, avg TPS)
  secondary: 2,       // GPU metrics, memory
  dashed: 1,          // Max temps, instant TPS  
} as const;
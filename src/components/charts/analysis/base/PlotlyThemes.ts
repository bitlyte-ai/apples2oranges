/**
 * Unified Plotly themes and color schemes for analysis charts
 * Consolidates colors and styling patterns used across all analysis components
 */

// Primary color scheme for main session data
export const PRIMARY_COLORS = {
  main: '#8884d8',
  secondary: '#ff7300',
  accent: '#10b981',
  highlight: '#f56565',
  fill: 'rgba(136, 132, 216, 0.2)',
} as const;

// Comparison color scheme for secondary session data
export const COMPARISON_COLORS = {
  main: '#ff7300',
  secondary: '#8884d8', 
  accent: '#ed8936',
  highlight: '#ed64a6',
  fill: 'rgba(255, 115, 0, 0.2)',
} as const;

// Multi-session color palette for charts with multiple sessions
// Expanded to 14 distinct colors to support up to 14 model series across sessions
export const MULTI_SESSION_COLORS = [
  '#8884d8', '#ff7300', '#10b981', '#f56565', '#ed8936',
  '#9f7aea', '#38b2ac', '#4299e1', '#48bb78', '#ed64a6',
  '#f59e0b', '#06b6d4', '#0ea5e9', '#d946ef'
] as const;

// Variable-specific color mappings (from utils.ts)
export const VARIABLE_COLORS = {
  cpu_power: '#8884d8',
  gpu_power: '#ff7300', 
  ane_power: '#10b981',
  cpu_temp_avg: '#f56565',
  gpu_temp_avg: '#ed8936',
  ram_usage: '#9f7aea',
  tps: '#38b2ac',
  cpu_overall_utilization: '#4299e1',
  cpu_freq: '#48bb78',
  gpu_freq: '#ed64a6',
} as const;

// Generate colors for dynamic datasets
export const generateSessionColors = (count: number): string[] => {
  const colors = [];
  for (let i = 0; i < count; i++) {
    colors.push(MULTI_SESSION_COLORS[i % MULTI_SESSION_COLORS.length]);
  }
  return colors;
};

// Common marker configurations
export const MARKER_CONFIGS = {
  default: {
    size: 4,
    opacity: 0.8,
    line: { width: 0.5 }
  },
  large: {
    size: 8,
    opacity: 0.7,
    line: { width: 1 }
  },
  small: {
    size: 3,
    opacity: 0.9,
    line: { width: 0 }
  }
} as const;

// Common line configurations
export const LINE_CONFIGS = {
  solid: {
    width: 2,
    dash: undefined
  },
  dashed: {
    width: 1.5,
    dash: 'dash'
  },
  dotted: {
    width: 1.5, 
    dash: 'dot'
  }
} as const;

// Base layout configurations for different chart types
export const BASE_LAYOUTS = {
  standard: {
    showlegend: true,
    legend: {
      x: 1.02,
      y: 1,
      xanchor: 'left',
      yanchor: 'top',
      bgcolor: 'rgba(255,255,255,0.8)',
      bordercolor: 'rgba(0,0,0,0.1)',
      borderwidth: 1,
    },
    margin: { l: 80, r: 150, t: 60, b: 80 },
    plot_bgcolor: 'white',
    paper_bgcolor: 'white',
  },
  compact: {
    showlegend: true,
    legend: {
      x: 0,
      y: -0.1,
      xanchor: 'left',
      yanchor: 'top',
      orientation: 'h',
      bgcolor: 'rgba(255,255,255,0.9)',
    },
    margin: { l: 80, r: 50, t: 60, b: 100 },
    plot_bgcolor: 'white',
    paper_bgcolor: 'white',
  },
  fullscreen: {
    showlegend: true,
    legend: {
      x: 1.02,
      y: 0.5,
      xanchor: 'left',
      yanchor: 'middle',
      bgcolor: 'rgba(255,255,255,0.9)',
      bordercolor: 'rgba(0,0,0,0.1)',
      borderwidth: 1,
    },
    margin: { l: 80, r: 180, t: 80, b: 80 },
    plot_bgcolor: 'white',
    paper_bgcolor: 'white',
  }
} as const;

// Common Plotly config options
export const BASE_CONFIG = {
  displayModeBar: true,
  responsive: true,
  displaylogo: false,
  modeBarButtonsToRemove: ['lasso2d', 'select2d'],
  toImageButtonOptions: {
    format: 'png' as const,
    filename: 'analysis_chart',
    height: 800,
    width: 1200,
    scale: 2,
  },
} as const;

// Specialized configs for different chart types
export const CHART_CONFIGS = {
  scatter3d: {
    ...BASE_CONFIG,
    modeBarButtonsToRemove: ['pan2d', 'lasso2d', 'select2d'],
  },
  radar: {
    ...BASE_CONFIG,
    modeBarButtonsToRemove: [...BASE_CONFIG.modeBarButtonsToRemove, 'zoom2d', 'pan2d'],
  },
  parallel: {
    ...BASE_CONFIG,
    scrollZoom: true,
  },
  parcoords: {
    ...BASE_CONFIG,
    scrollZoom: true,
  },
  scatter: {
    ...BASE_CONFIG,
    modeBarButtonsToRemove: ['lasso2d', 'select2d'],
  },
  polar: {
    ...BASE_CONFIG,
    modeBarButtonsToRemove: [...BASE_CONFIG.modeBarButtonsToRemove, 'zoom2d', 'pan2d'],
  }
} as const;

export type LayoutVariant = keyof typeof BASE_LAYOUTS;
export type ChartConfigType = keyof typeof CHART_CONFIGS;
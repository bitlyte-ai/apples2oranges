import type { TelemetryVariable } from '../../../../types/charts';
import { getVariableConfig } from '../utils';
import { 
  BASE_LAYOUTS, 
  CHART_CONFIGS, 
  type LayoutVariant, 
  type ChartConfigType 
} from './PlotlyThemes';

/**
 * Shared Plotly configurations and layout builders
 * Provides common configuration patterns used across analysis charts
 */

// Standard axis configuration builder
export const createAxisConfig = (
  variable: TelemetryVariable | '',
  title?: string
) => {
  if (!variable) {
    return {
      title: title || 'Select Variable',
      titlefont: { size: 12 }
    };
  }

  const config = getVariableConfig(variable);
  return {
    title: config ? `${config.label} (${config.unit})` : title || variable,
    titlefont: { size: 12 },
    showgrid: true,
    zeroline: false,
  };
};

// 3D scene configuration for scatter plots
export const create3DScene = (
  xVariable: TelemetryVariable | '',
  yVariable: TelemetryVariable | '',
  zVariable: TelemetryVariable | ''
) => ({
  xaxis: createAxisConfig(xVariable, 'X-Axis'),
  yaxis: createAxisConfig(yVariable, 'Y-Axis'), 
  zaxis: createAxisConfig(zVariable, 'Z-Axis'),
  camera: {
    eye: { x: 1.5, y: 1.5, z: 1.5 }
  }
});

// Polar configuration for radar charts
export const createPolarConfig = () => ({
  radialaxis: {
    visible: true,
    range: [0, 1],
    tickmode: 'linear',
    tick0: 0,
    dtick: 0.2,
    tickformat: '.1f'
  },
  angularaxis: {
    tickfont: { size: 12 }
  }
});

// Complete polar layout for radar charts
export const createPolarLayout = (title?: string) => ({
  title: title ? {
    text: title,
    font: { size: 16 }
  } : undefined,
  polar: createPolarConfig(),
  showlegend: true,
  legend: {
    x: 1.1,
    y: 0.5,
    bgcolor: 'rgba(255,255,255,0.8)'
  },
  margin: { l: 80, r: 120, t: 60, b: 80 }
});

// Parallel coordinates layout
export const createParallelCoordsLayout = (title?: string) => ({
  title: title ? {
    text: title,
    font: { size: 16 },
    x: 0,           // left align title to avoid overlap with axes
    xanchor: 'left',
    y: 0.98,
  } : undefined,
  margin: { l: 80, r: 140, t: 90, b: 80 }, // extra top/right margin for title and colorbar
  showlegend: false, // Parallel coordinates don't use legends
  font: {
    size: 12
  }
});

// Bubble chart layout with 2D axes
export const createBubbleChartLayout = (
  title: string,
  xVariable: TelemetryVariable | '',
  yVariable: TelemetryVariable | ''
) => ({
  title: {
    text: title,
    font: { size: 16 }
  },
  ...create2DAxes(xVariable, yVariable),
  margin: { l: 80, r: 180, t: 60, b: 80 }, // extra right margin for external legend/colorbar
  showlegend: true,
  legend: {
    x: 1.02,            // place legend outside plot area on the right
    xanchor: 'left',
    y: 1,
    yanchor: 'top',
    bgcolor: 'rgba(255,255,255,0.8)',
    orientation: 'v'
  },
  hovermode: 'closest'
});

// Standard 2D axes configuration
export const create2DAxes = (
  xVariable: TelemetryVariable | '',
  yVariable: TelemetryVariable | ''
) => ({
  xaxis: {
    ...createAxisConfig(xVariable, 'X-Axis'),
    automargin: true,
    ticklabeloverflow: 'hide past domain' as const,
  },
  yaxis: {
    ...createAxisConfig(yVariable, 'Y-Axis'),
    automargin: true,
    ticklabeloverflow: 'hide past domain' as const,
  }
});

// Build complete layout configuration
export const buildLayout = (
  title: string,
  layoutVariant: LayoutVariant = 'standard',
  specificConfig?: any
) => ({
  title: {
    text: title,
    font: { size: 16 }
  },
  ...BASE_LAYOUTS[layoutVariant],
  ...specificConfig
});

// Get chart-specific config
export const getChartConfig = (
  chartType: ChartConfigType,
  customFilename?: string
) => {
  const config = { ...CHART_CONFIGS[chartType] };
  
  if (customFilename) {
    config.toImageButtonOptions = {
      ...config.toImageButtonOptions,
      filename: customFilename as any // Allow custom filenames
    };
  }
  
  return config;
};

// Common hover template builders
export const buildHoverTemplate = (
  sessionName: string,
  variableConfigs: Array<{ label: string; unit: string; key: string }>
) => {
  const variableLines = variableConfigs.map(config => 
    `${config.label}: %{customdata.${config.key}} ${config.unit}`
  ).join('<br/>');
  
  return `<b>${sessionName}</b><br/>Time: %{customdata.time}<br/>${variableLines}<extra></extra>`;
};

// Time-based hover template for time series data
export const buildTimeSeriesHoverTemplate = (
  label: string,
  unit: string,
  xLabel: string = 'Time'
) => `<b>${label}</b><br/>${xLabel}: %{x}<br/>Value: %{y} ${unit}<extra></extra>`;

// Multi-dimensional hover template for correlation charts
export const buildCorrelationHoverTemplate = (
  xConfig: { label: string; unit: string },
  yConfig: { label: string; unit: string },
  sessionName?: string
) => {
  const prefix = sessionName ? `<b>${sessionName}</b><br/>` : '';
  return `${prefix}${xConfig.label}: %{x} ${xConfig.unit}<br/>${yConfig.label}: %{y} ${yConfig.unit}<extra></extra>`;
};
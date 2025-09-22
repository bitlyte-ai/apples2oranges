import type { TelemetryDataPointWithRelativeTime } from '../../../../types/telemetry';
import type { ChartModalData } from '../../ChartModal';

export interface PlotlyTrace {
  x: number[];
  y: number[];
  type: string;
  mode: string;
  name: string;
  line?: any;
  marker?: any;
  hovertemplate: string;
}

/**
 * Abstract base class for Chart.js → Plotly data transformers
 * Provides common patterns for Model A/B data processing
 */
export abstract class BaseTransformer {
  protected chartData: ChartModalData;

  constructor(chartData: ChartModalData) {
    this.chartData = chartData;
  }

  /**
   * Main transform method - to be implemented by subclasses
   */
  abstract transform(): PlotlyTrace[];

  /**
   * Get unit suffix for the chart type
   */
  protected abstract getUnit(): string;

  /**
   * Common color scheme for Model A (Green variants)
   */
  protected get modelAColors() {
    return {
      primary: '#10b981',
      secondary: '#22c55e', 
      tertiary: '#65a30d',
    };
  }

  /**
   * Common color scheme for Model B (Purple variants)  
   */
  protected get modelBColors() {
    return {
      primary: '#8b5cf6',
      secondary: '#a855f7',
      tertiary: '#c026d3',
    };
  }

  /**
   * Create hover template with consistent formatting
   */
  protected createHoverTemplate(unit: string): string {
    return `%{fullData.name}<br>Time: %{x:.1f}s<br>Value: %{y:.2f}${unit}<extra></extra>`;
  }

  /**
   * Filter data points by non-null values for a given field
   */
  protected filterDataByField<T extends keyof TelemetryDataPointWithRelativeTime>(
    data: TelemetryDataPointWithRelativeTime[],
    field: T
  ): Array<{ x: number; y: NonNullable<TelemetryDataPointWithRelativeTime[T]> }> {
    return data
      .filter(d => d[field] !== null && d[field] !== undefined)
      .map(d => ({ 
        x: d.relative_time_seconds, 
        y: d[field]! as NonNullable<TelemetryDataPointWithRelativeTime[T]>
      }));
  }

  /**
   * Create a standard line trace with Model A styling
   */
  protected createModelATrace(
    data: Array<{ x: number; y: number }>,
    name: string,
    colorKey: 'primary' | 'secondary' | 'tertiary' = 'primary',
    options: Partial<PlotlyTrace> = {}
  ): PlotlyTrace {
    const color = this.modelAColors[colorKey];
    return {
      x: data.map(d => d.x),
      y: data.map(d => d.y),
      type: 'scatter',
      mode: 'lines+markers',
      name,
      line: { color, width: 2, ...options.line },
      marker: { size: 4, color, ...options.marker },
      hovertemplate: this.createHoverTemplate(this.getUnit()),
      ...options,
    };
  }

  /**
   * Create a standard line trace with Model B styling
   */
  protected createModelBTrace(
    data: Array<{ x: number; y: number }>,
    name: string,
    colorKey: 'primary' | 'secondary' | 'tertiary' = 'primary',
    options: Partial<PlotlyTrace> = {}
  ): PlotlyTrace {
    const color = this.modelBColors[colorKey];
    return {
      x: data.map(d => d.x),
      y: data.map(d => d.y),
      type: 'scatter',
      mode: 'lines+markers',
      name,
      line: { color, width: 2, ...options.line },
      marker: { size: 4, color, ...options.marker },
      hovertemplate: this.createHoverTemplate(this.getUnit()),
      ...options,
    };
  }
}
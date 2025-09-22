import { BaseTransformer, PlotlyTrace } from './BaseTransformer';
import type { TelemetryDataPointWithRelativeTime } from '../../../../types/telemetry';

/**
 * Correlation chart transformer - handles scatter plot correlation data conversion
 * Preserves exact original transformation logic from ChartModal
 */
export class CorrelationChartTransformer extends BaseTransformer {
  protected getUnit(): string {
    return ''; // No unit suffix for correlation charts as they have separate axes
  }

  /**
   * Get axis label for correlation chart axes
   */
  private getAxisLabel(axis: 'cpu_temp_avg' | 'cpu_power' | 'ram_usage' | 'tps'): string {
    switch (axis) {
      case 'cpu_temp_avg':
        return 'CPU Temperature (°C)';
      case 'cpu_power':
        return 'CPU Power (W)';
      case 'ram_usage':
        return 'Memory Usage (GB)';
      case 'tps':
        return 'TPS';
      default:
        return axis;
    }
  }

  /**
   * Extract correlation data for given axes
   */
  private getCorrelationData(
    data: TelemetryDataPointWithRelativeTime[]
  ): Array<{ x: number; y: number }> {
    if (!this.chartData.xAxis || !this.chartData.yAxis) {
      return [];
    }

    return data
      .filter(d => {
        const xValue = d[this.chartData.xAxis!];
        const yValue = d[this.chartData.yAxis!];
        return xValue !== null && yValue !== null;
      })
      .map(d => ({
        x: d[this.chartData.xAxis!]!,
        y: d[this.chartData.yAxis!]!
      }));
  }

  /**
   * Create custom hover template for correlation charts
   */
  private createCorrelationHoverTemplate(): string {
    const xLabel = this.getAxisLabel(this.chartData.xAxis!);
    const yLabel = this.getAxisLabel(this.chartData.yAxis!);
    return `%{fullData.name}<br>${xLabel}: %{x}<br>${yLabel}: %{y}<extra></extra>`;
  }

  transform(): PlotlyTrace[] {
    const traces: PlotlyTrace[] = [];
    const { modelAData, modelBData } = this.chartData;

    // Model A correlation scatter plot
    if (modelAData.length > 0) {
      const scatterData = this.getCorrelationData(modelAData);
      if (scatterData.length > 0) {
        traces.push({
          x: scatterData.map(d => d.x),
          y: scatterData.map(d => d.y),
          type: 'scatter',
          mode: 'markers',
          name: 'Model A',
          marker: {
            size: 8,
            color: this.modelAColors.primary,
            opacity: 0.7,
            line: {
              width: 1,
              color: '#059669' // Darker green border
            }
          },
          hovertemplate: this.createCorrelationHoverTemplate(),
        });
      }
    }

    // Model B correlation scatter plot  
    if (modelBData.length > 0) {
      const scatterData = this.getCorrelationData(modelBData);
      if (scatterData.length > 0) {
        traces.push({
          x: scatterData.map(d => d.x),
          y: scatterData.map(d => d.y),
          type: 'scatter',
          mode: 'markers',
          name: 'Model B',
          marker: {
            size: 8,
            color: this.modelBColors.primary,
            opacity: 0.7,
            line: {
              width: 1,
              color: '#7c3aed' // Darker purple border
            }
          },
          hovertemplate: this.createCorrelationHoverTemplate(),
        });
      }
    }

    return traces;
  }
}
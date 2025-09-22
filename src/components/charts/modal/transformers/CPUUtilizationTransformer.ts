import { BaseTransformer, PlotlyTrace } from './BaseTransformer';

/**
 * CPU Utilization chart transformer - handles complete CPU utilization data conversion
 * Includes Overall CPU, P-Cores Average, and E-Cores Average for both models
 * Preserves exact original transformation logic from LiveOverlayCPUUtilizationChart
 */
export class CPUUtilizationTransformer extends BaseTransformer {
  protected getUnit(): string {
    return '%';
  }

  /**
   * Calculate average from array of values
   */
  private calculateAverage(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((sum, val) => sum + val, 0) / values.length;
  }

  transform(): PlotlyTrace[] {
    const traces: PlotlyTrace[] = [];
    const { modelAData, modelBData } = this.chartData;

    // Model A traces
    if (modelAData.length > 0) {
      // Overall CPU utilization
      const overallData = this.filterDataByField(modelAData, 'cpu_overall_utilization');
      if (overallData.length > 0) {
        traces.push(this.createModelATrace(
          overallData,
          'Model A - Overall CPU',
          'primary',
          {
            line: { color: '#22c55e', width: 2 },
            marker: { size: 1, color: '#22c55e' },
          }
        ));
      }

      // P-Core Average
      const pCoreData = modelAData
        .filter(d => d.cpu_p_core_utilization && d.cpu_p_core_utilization.length > 0)
        .map(d => ({
          x: d.relative_time_seconds,
          y: this.calculateAverage(d.cpu_p_core_utilization!)
        }));

      if (pCoreData.length > 0) {
        traces.push({
          x: pCoreData.map(d => d.x),
          y: pCoreData.map(d => d.y),
          type: 'scatter',
          mode: 'lines+markers',
          name: 'Model A - P-Cores Avg',
          line: { color: '#16a34a', width: 1.5, dash: 'dot' },
          marker: { size: 0 },
          hovertemplate: this.createHoverTemplate(this.getUnit()),
        });
      }

      // E-Core Average
      const eCoreData = modelAData
        .filter(d => d.cpu_e_core_utilization && d.cpu_e_core_utilization.length > 0)
        .map(d => ({
          x: d.relative_time_seconds,
          y: this.calculateAverage(d.cpu_e_core_utilization!)
        }));

      if (eCoreData.length > 0) {
        traces.push({
          x: eCoreData.map(d => d.x),
          y: eCoreData.map(d => d.y),
          type: 'scatter',
          mode: 'lines+markers',
          name: 'Model A - E-Cores Avg',
          line: { color: '#65a30d', width: 1.5, dash: 'dashdot' },
          marker: { size: 0 },
          hovertemplate: this.createHoverTemplate(this.getUnit()),
        });
      }
    }

    // Model B traces  
    if (modelBData.length > 0) {
      // Overall CPU utilization
      const overallData = this.filterDataByField(modelBData, 'cpu_overall_utilization');
      if (overallData.length > 0) {
        traces.push(this.createModelBTrace(
          overallData,
          'Model B - Overall CPU',
          'primary',
          {
            line: { color: '#a855f7', width: 2 },
            marker: { size: 1, color: '#a855f7' },
          }
        ));
      }

      // P-Core Average
      const pCoreData = modelBData
        .filter(d => d.cpu_p_core_utilization && d.cpu_p_core_utilization.length > 0)
        .map(d => ({
          x: d.relative_time_seconds,
          y: this.calculateAverage(d.cpu_p_core_utilization!)
        }));

      if (pCoreData.length > 0) {
        traces.push({
          x: pCoreData.map(d => d.x),
          y: pCoreData.map(d => d.y),
          type: 'scatter',
          mode: 'lines+markers',
          name: 'Model B - P-Cores Avg',
          line: { color: '#9333ea', width: 1.5, dash: 'dot' },
          marker: { size: 0 },
          hovertemplate: this.createHoverTemplate(this.getUnit()),
        });
      }

      // E-Core Average
      const eCoreData = modelBData
        .filter(d => d.cpu_e_core_utilization && d.cpu_e_core_utilization.length > 0)
        .map(d => ({
          x: d.relative_time_seconds,
          y: this.calculateAverage(d.cpu_e_core_utilization!)
        }));

      if (eCoreData.length > 0) {
        traces.push({
          x: eCoreData.map(d => d.x),
          y: eCoreData.map(d => d.y),
          type: 'scatter',
          mode: 'lines+markers',
          name: 'Model B - E-Cores Avg',
          line: { color: '#c026d3', width: 1.5, dash: 'dashdot' },
          marker: { size: 0 },
          hovertemplate: this.createHoverTemplate(this.getUnit()),
        });
      }
    }

    return traces;
  }
}

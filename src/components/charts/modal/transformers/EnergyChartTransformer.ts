import { BaseTransformer, PlotlyTrace } from './BaseTransformer';

/**
 * Energy chart transformer - handles cumulative energy consumption data conversion
 * Supports Total, CPU, GPU, and ANE energy fields in Watt-hours (Wh)
 */
export class EnergyChartTransformer extends BaseTransformer {
  protected getUnit(): string {
    return 'Wh';
  }

  transform(): PlotlyTrace[] {
    const traces: PlotlyTrace[] = [];
    const { modelAData, modelBData } = this.chartData;

    // Model A traces
    if (modelAData.length > 0) {
      // Total Energy trace (primary line)
      const totalData = this.filterDataByField(modelAData, 'total_energy_wh');
      if (totalData.length > 0) {
        traces.push(this.createModelATrace(
          totalData,
          'Model A - Total Energy',
          'primary'
        ));
      }

      // CPU Energy trace (secondary dashed line)
      const cpuData = this.filterDataByField(modelAData, 'cpu_energy_wh');
      if (cpuData.length > 0) {
        traces.push(this.createModelATrace(
          cpuData,
          'Model A - CPU Energy',
          'secondary',
          {
            line: { dash: 'dot' }
          }
        ));
      }

      // GPU Energy trace (secondary dashed line)
      const gpuData = this.filterDataByField(modelAData, 'gpu_energy_wh');
      if (gpuData.length > 0) {
        traces.push(this.createModelATrace(
          gpuData,
          'Model A - GPU Energy',
          'tertiary',
          {
            line: { dash: 'dash' }
          }
        ));
      }

      // ANE Energy trace (tertiary dotted line)
      const aneData = this.filterDataByField(modelAData, 'ane_energy_wh');
      if (aneData.length > 0) {
        traces.push(this.createModelATrace(
          aneData,
          'Model A - ANE Energy',
          'tertiary',
          {
            line: { dash: 'dashdot' }
          }
        ));
      }
    }

    // Model B traces
    if (modelBData.length > 0) {
      // Total Energy trace (primary line)
      const totalData = this.filterDataByField(modelBData, 'total_energy_wh');
      if (totalData.length > 0) {
        traces.push(this.createModelBTrace(
          totalData,
          'Model B - Total Energy',
          'primary'
        ));
      }

      // CPU Energy trace (secondary dashed line)
      const cpuData = this.filterDataByField(modelBData, 'cpu_energy_wh');
      if (cpuData.length > 0) {
        traces.push(this.createModelBTrace(
          cpuData,
          'Model B - CPU Energy',
          'secondary',
          {
            line: { dash: 'dot' }
          }
        ));
      }

      // GPU Energy trace (secondary dashed line)
      const gpuData = this.filterDataByField(modelBData, 'gpu_energy_wh');
      if (gpuData.length > 0) {
        traces.push(this.createModelBTrace(
          gpuData,
          'Model B - GPU Energy',
          'tertiary',
          {
            line: { dash: 'dash' }
          }
        ));
      }

      // ANE Energy trace (tertiary dotted line)
      const aneData = this.filterDataByField(modelBData, 'ane_energy_wh');
      if (aneData.length > 0) {
        traces.push(this.createModelBTrace(
          aneData,
          'Model B - ANE Energy',
          'tertiary',
          {
            line: { dash: 'dashdot' }
          }
        ));
      }
    }

    return traces;
  }

  /**
   * Override hover template to show higher precision for energy values
   */
  protected createHoverTemplate(unit: string): string {
    return `%{fullData.name}<br>Time: %{x:.1f}s<br>Energy: %{y:.4f}${unit}<extra></extra>`;
  }
}
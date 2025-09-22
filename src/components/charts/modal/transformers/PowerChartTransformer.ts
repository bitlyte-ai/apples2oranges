import { BaseTransformer, PlotlyTrace } from './BaseTransformer';

/**
 * Power chart transformer - handles CPU and GPU power data conversion
 * Preserves exact original transformation logic from ChartModal
 */
export class PowerChartTransformer extends BaseTransformer {
  protected getUnit(): string {
    return 'W';
  }

  transform(): PlotlyTrace[] {
    const traces: PlotlyTrace[] = [];
    const { modelAData, modelBData } = this.chartData;

    // Model A traces
    if (modelAData.length > 0) {
      // CPU Power trace
      const cpuData = this.filterDataByField(modelAData, 'cpu_power');
      if (cpuData.length > 0) {
        traces.push(this.createModelATrace(
          cpuData,
          'Model A - CPU Power',
          'primary'
        ));
      }

      // GPU Power trace (dashed line)
      const gpuData = this.filterDataByField(modelAData, 'gpu_power');
      if (gpuData.length > 0) {
        traces.push(this.createModelATrace(
          gpuData,
          'Model A - GPU Power',
          'secondary',
          {
            line: { dash: 'dash' }
          }
        ));
      }
    }

    // Model B traces
    if (modelBData.length > 0) {
      // CPU Power trace
      const cpuData = this.filterDataByField(modelBData, 'cpu_power');
      if (cpuData.length > 0) {
        traces.push(this.createModelBTrace(
          cpuData,
          'Model B - CPU Power',
          'primary'
        ));
      }

      // GPU Power trace (dashed line)
      const gpuData = this.filterDataByField(modelBData, 'gpu_power');
      if (gpuData.length > 0) {
        traces.push(this.createModelBTrace(
          gpuData,
          'Model B - GPU Power',
          'secondary',
          {
            line: { dash: 'dash' }
          }
        ));
      }
    }

    return traces;
  }
}
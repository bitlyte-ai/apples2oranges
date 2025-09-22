import { BaseTransformer, PlotlyTrace } from './BaseTransformer';

/**
 * Temperature chart transformer - handles CPU and GPU temperature data conversion
 * Preserves exact original transformation logic from ChartModal
 */
export class TemperatureChartTransformer extends BaseTransformer {
  protected getUnit(): string {
    return '°C';
  }

  transform(): PlotlyTrace[] {
    const traces: PlotlyTrace[] = [];
    const { modelAData, modelBData } = this.chartData;

    // Model A traces
    if (modelAData.length > 0) {
      // CPU Temperature trace
      const cpuData = this.filterDataByField(modelAData, 'cpu_temp_avg');
      if (cpuData.length > 0) {
        traces.push(this.createModelATrace(
          cpuData,
          'Model A - CPU Temperature',
          'primary'
        ));
      }

      // GPU Temperature trace (dashed line)
      const gpuData = this.filterDataByField(modelAData, 'gpu_temp_avg');
      if (gpuData.length > 0) {
        traces.push(this.createModelATrace(
          gpuData,
          'Model A - GPU Temperature',
          'secondary',
          {
            line: { dash: 'dash' }
          }
        ));
      }
    }

    // Model B traces
    if (modelBData.length > 0) {
      // CPU Temperature trace
      const cpuData = this.filterDataByField(modelBData, 'cpu_temp_avg');
      if (cpuData.length > 0) {
        traces.push(this.createModelBTrace(
          cpuData,
          'Model B - CPU Temperature',
          'primary'
        ));
      }

      // GPU Temperature trace (dashed line)
      const gpuData = this.filterDataByField(modelBData, 'gpu_temp_avg');
      if (gpuData.length > 0) {
        traces.push(this.createModelBTrace(
          gpuData,
          'Model B - GPU Temperature',
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
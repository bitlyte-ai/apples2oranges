import { BaseTransformer, PlotlyTrace } from './BaseTransformer';

/**
 * Memory chart transformer - handles RAM usage data conversion
 * Preserves exact original transformation logic from ChartModal
 */
export class MemoryChartTransformer extends BaseTransformer {
  protected getUnit(): string {
    return 'GB';
  }

  transform(): PlotlyTrace[] {
    const traces: PlotlyTrace[] = [];
    const { modelAData, modelBData } = this.chartData;

    // Model A memory trace
    if (modelAData.length > 0) {
      const memoryData = this.filterDataByField(modelAData, 'ram_usage');
      if (memoryData.length > 0) {
        traces.push(this.createModelATrace(
          memoryData,
          `Model A - ${this.chartData.title.split(' ')[0]}`,
          'primary'
        ));
      }
    }

    // Model B memory trace  
    if (modelBData.length > 0) {
      const memoryData = this.filterDataByField(modelBData, 'ram_usage');
      if (memoryData.length > 0) {
        traces.push(this.createModelBTrace(
          memoryData,
          `Model B - ${this.chartData.title.split(' ')[0]}`,
          'primary'
        ));
      }
    }

    return traces;
  }
}
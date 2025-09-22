import { BaseTransformer, PlotlyTrace } from './BaseTransformer';

/**
 * TPS chart transformer - handles average and instantaneous TPS data conversion
 * Preserves exact original transformation logic from ChartModal
 */
export class TPSChartTransformer extends BaseTransformer {
  protected getUnit(): string {
    return ' TPS';
  }

  transform(): PlotlyTrace[] {
    const traces: PlotlyTrace[] = [];
    const { modelAData, modelBData } = this.chartData;

    // Model A traces
    if (modelAData.length > 0) {
      // Average TPS trace
      const avgData = this.filterDataByField(modelAData, 'tps');
      if (avgData.length > 0) {
        traces.push(this.createModelATrace(
          avgData,
          'Model A - TPS (Avg)',
          'primary'
        ));
      }

      // Instantaneous TPS trace (dashed line, smaller markers)
      const instantData = this.filterDataByField(modelAData, 'instantaneous_tps');
      if (instantData.length > 0) {
        traces.push(this.createModelATrace(
          instantData,
          'Model A - TPS (Instant)',
          'secondary',
          {
            line: { width: 1, dash: 'dash' },
            marker: { size: 3 }
          }
        ));
      }
    }

    // Model B traces
    if (modelBData.length > 0) {
      // Average TPS trace
      const avgData = this.filterDataByField(modelBData, 'tps');
      if (avgData.length > 0) {
        traces.push(this.createModelBTrace(
          avgData,
          'Model B - TPS (Avg)',
          'primary'
        ));
      }

      // Instantaneous TPS trace (dashed line, smaller markers)
      const instantData = this.filterDataByField(modelBData, 'instantaneous_tps');
      if (instantData.length > 0) {
        traces.push(this.createModelBTrace(
          instantData,
          'Model B - TPS (Instant)',
          'secondary',
          {
            line: { width: 1, dash: 'dash' },
            marker: { size: 3 }
          }
        ));
      }
    }

    return traces;
  }
}
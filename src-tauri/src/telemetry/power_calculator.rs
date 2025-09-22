// Power consumption calculation using trapezoidal rule integration
use serde::Serialize;
use crate::telemetry::types::TelemetryUpdate;

#[derive(Debug, Clone, Serialize)]
pub struct PowerConsumptionSummary {
    pub total_energy_wh: f64,
    pub cpu_energy_wh: f64,
    pub gpu_energy_wh: f64,
    pub ane_energy_wh: f64,
    pub average_power_watts: f64,
    pub peak_power_watts: f64,
    pub duration_seconds: f64,
    pub energy_per_token_wh: Option<f64>,
}

#[derive(Debug, Clone)]
pub struct PowerCalculator {
    previous_telemetry: Option<TelemetryUpdate>,
    cumulative_cpu_energy_wh: f64,
    cumulative_gpu_energy_wh: f64,
    cumulative_ane_energy_wh: f64,
    session_start_timestamp: Option<u64>,
}

impl PowerCalculator {
    /// Create a new PowerCalculator instance
    pub fn new() -> Self {
        Self {
            previous_telemetry: None,
            cumulative_cpu_energy_wh: 0.0,
            cumulative_gpu_energy_wh: 0.0,
            cumulative_ane_energy_wh: 0.0,
            session_start_timestamp: None,
        }
    }

    /// Calculate power consumption using trapezoidal rule
    /// Returns updated telemetry with cumulative energy values
    pub fn update_with_telemetry(&mut self, mut telemetry: TelemetryUpdate) -> TelemetryUpdate {
        // Initialize session start time
        if self.session_start_timestamp.is_none() {
            self.session_start_timestamp = Some(telemetry.timestamp_ms);
        }

        // Calculate energy consumption if we have previous reading
        if let Some(prev) = &self.previous_telemetry {
            let dt_hours = (telemetry.timestamp_ms - prev.timestamp_ms) as f64 / 3_600_000.0;

            // Trapezoidal rule integration: E = (P1 + P2) * dt / 2
            if let (Some(p1), Some(p2)) = (prev.cpu_power_watts, telemetry.cpu_power_watts) {
                self.cumulative_cpu_energy_wh += (p1 + p2) * dt_hours / 2.0;
            }

            if let (Some(p1), Some(p2)) = (prev.gpu_power_watts, telemetry.gpu_power_watts) {
                self.cumulative_gpu_energy_wh += (p1 + p2) * dt_hours / 2.0;
            }

            if let (Some(p1), Some(p2)) = (prev.ane_power_watts, telemetry.ane_power_watts) {
                self.cumulative_ane_energy_wh += (p1 + p2) * dt_hours / 2.0;
            }
        }

        // Update telemetry with cumulative energy values
        telemetry.total_energy_wh = Some(
            self.cumulative_cpu_energy_wh + self.cumulative_gpu_energy_wh + self.cumulative_ane_energy_wh
        );
        telemetry.cpu_energy_wh = Some(self.cumulative_cpu_energy_wh);
        telemetry.gpu_energy_wh = Some(self.cumulative_gpu_energy_wh);
        telemetry.ane_energy_wh = Some(self.cumulative_ane_energy_wh);

        // Store current telemetry for next calculation
        self.previous_telemetry = Some(telemetry.clone());

        telemetry
    }

    /// Reset the calculator state for a new session
    pub fn reset(&mut self) {
        self.previous_telemetry = None;
        self.cumulative_cpu_energy_wh = 0.0;
        self.cumulative_gpu_energy_wh = 0.0;
        self.cumulative_ane_energy_wh = 0.0;
        self.session_start_timestamp = None;
    }

    /// Get a summary of power consumption for the current session
    pub fn get_summary(&self, total_tokens: Option<usize>) -> PowerConsumptionSummary {
        let total_energy = self.cumulative_cpu_energy_wh + self.cumulative_gpu_energy_wh + self.cumulative_ane_energy_wh;
        let energy_per_token = total_tokens.map(|tokens| {
            if tokens > 0 { total_energy / tokens as f64 } else { 0.0 }
        });

        PowerConsumptionSummary {
            total_energy_wh: total_energy,
            cpu_energy_wh: self.cumulative_cpu_energy_wh,
            gpu_energy_wh: self.cumulative_gpu_energy_wh,
            ane_energy_wh: self.cumulative_ane_energy_wh,
            average_power_watts: 0.0, // TODO: Calculate from session duration
            peak_power_watts: 0.0,    // TODO: Track maximum power reading
            duration_seconds: 0.0,    // TODO: Calculate from timestamps
            energy_per_token_wh: energy_per_token,
        }
    }
}

impl Default for PowerCalculator {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn create_test_telemetry(timestamp_ms: u64, cpu_power: Option<f64>, gpu_power: Option<f64>, ane_power: Option<f64>) -> TelemetryUpdate {
        TelemetryUpdate {
            timestamp_ms,
            cpu_power_watts: cpu_power,
            gpu_power_watts: gpu_power,
            ane_power_watts: ane_power,
            cpu_temp_celsius: None,
            gpu_temp_celsius: None,
            cpu_freq_mhz: None,
            gpu_freq_mhz: None,
            ram_usage_gb: None,
            thermal_pressure: None,
            ttft_ms: None,
            current_tps: None,
            instantaneous_tps: None,
            generation_time_ms: None,
            model: None,
            cpu_temp_avg: None,
            cpu_temp_max: None,
            cpu_p_core_temps: None,
            cpu_e_core_temps: None,
            gpu_temp_avg: None,
            gpu_temp_max: None,
            gpu_cluster_temps: None,
            battery_temp_avg: None,
            cpu_p_core_utilization: None,
            cpu_e_core_utilization: None,
            cpu_overall_utilization: None,
            core_temperatures: None,
            total_energy_wh: None,
            cpu_energy_wh: None,
            gpu_energy_wh: None,
            ane_energy_wh: None,
            energy_rate_wh_per_token: None,
        }
    }

    #[test]
    fn test_new_calculator() {
        let calculator = PowerCalculator::new();
        assert_eq!(calculator.cumulative_cpu_energy_wh, 0.0);
        assert_eq!(calculator.cumulative_gpu_energy_wh, 0.0);
        assert_eq!(calculator.cumulative_ane_energy_wh, 0.0);
        assert!(calculator.session_start_timestamp.is_none());
        assert!(calculator.previous_telemetry.is_none());
    }

    #[test]
    fn test_first_telemetry_update() {
        let mut calculator = PowerCalculator::new();
        let telemetry = create_test_telemetry(1000, Some(10.0), Some(5.0), Some(2.0));
        
        let result = calculator.update_with_telemetry(telemetry);
        
        // First update should not calculate energy (no previous reading)
        assert_eq!(result.total_energy_wh, Some(0.0));
        assert_eq!(result.cpu_energy_wh, Some(0.0));
        assert_eq!(result.gpu_energy_wh, Some(0.0));
        assert_eq!(result.ane_energy_wh, Some(0.0));
        assert_eq!(calculator.session_start_timestamp, Some(1000));
    }

    #[test]
    fn test_trapezoidal_rule_calculation() {
        let mut calculator = PowerCalculator::new();
        
        // First reading: 10W CPU, 5W GPU, 2W ANE at t=0
        let telemetry1 = create_test_telemetry(0, Some(10.0), Some(5.0), Some(2.0));
        calculator.update_with_telemetry(telemetry1);
        
        // Second reading: 20W CPU, 10W GPU, 4W ANE at t=3600000ms (1 hour later)
        let telemetry2 = create_test_telemetry(3600000, Some(20.0), Some(10.0), Some(4.0));
        let result = calculator.update_with_telemetry(telemetry2);
        
        // Trapezoidal rule: E = (P1 + P2) * dt / 2
        // CPU: (10 + 20) * 1 / 2 = 15 Wh
        // GPU: (5 + 10) * 1 / 2 = 7.5 Wh
        // ANE: (2 + 4) * 1 / 2 = 3 Wh
        // Total: 25.5 Wh
        
        assert_eq!(result.cpu_energy_wh, Some(15.0));
        assert_eq!(result.gpu_energy_wh, Some(7.5));
        assert_eq!(result.ane_energy_wh, Some(3.0));
        assert_eq!(result.total_energy_wh, Some(25.5));
    }

    #[test]
    fn test_cumulative_energy_calculation() {
        let mut calculator = PowerCalculator::new();
        
        // First pair: 10W for 1 hour = 10 Wh
        let telemetry1 = create_test_telemetry(0, Some(10.0), None, None);
        calculator.update_with_telemetry(telemetry1);
        
        let telemetry2 = create_test_telemetry(3600000, Some(10.0), None, None);
        let result2 = calculator.update_with_telemetry(telemetry2);
        assert_eq!(result2.cpu_energy_wh, Some(10.0));
        
        // Second pair: 20W for 1 hour = 20 Wh additional, 30 Wh total
        let telemetry3 = create_test_telemetry(7200000, Some(20.0), None, None);
        let result3 = calculator.update_with_telemetry(telemetry3);
        assert_eq!(result3.cpu_energy_wh, Some(25.0)); // (10+20)*1/2 + 10 = 15 + 10 = 25
    }

    #[test]
    fn test_missing_power_data() {
        let mut calculator = PowerCalculator::new();
        
        // First reading with CPU power only
        let telemetry1 = create_test_telemetry(0, Some(10.0), None, None);
        calculator.update_with_telemetry(telemetry1);
        
        // Second reading with CPU power only
        let telemetry2 = create_test_telemetry(3600000, Some(20.0), None, None);
        let result = calculator.update_with_telemetry(telemetry2);
        
        // Only CPU energy should be calculated
        assert_eq!(result.cpu_energy_wh, Some(15.0));
        assert_eq!(result.gpu_energy_wh, Some(0.0));
        assert_eq!(result.ane_energy_wh, Some(0.0));
        assert_eq!(result.total_energy_wh, Some(15.0));
    }

    #[test]
    fn test_reset_functionality() {
        let mut calculator = PowerCalculator::new();
        
        // Add some readings
        let telemetry1 = create_test_telemetry(0, Some(10.0), Some(5.0), Some(2.0));
        calculator.update_with_telemetry(telemetry1);
        
        let telemetry2 = create_test_telemetry(3600000, Some(20.0), Some(10.0), Some(4.0));
        calculator.update_with_telemetry(telemetry2);
        
        // Reset
        calculator.reset();
        
        // Check that state is cleared
        assert_eq!(calculator.cumulative_cpu_energy_wh, 0.0);
        assert_eq!(calculator.cumulative_gpu_energy_wh, 0.0);
        assert_eq!(calculator.cumulative_ane_energy_wh, 0.0);
        assert!(calculator.session_start_timestamp.is_none());
        assert!(calculator.previous_telemetry.is_none());
    }

    #[test]
    fn test_get_summary() {
        let mut calculator = PowerCalculator::new();
        
        // Simulate some energy consumption
        calculator.cumulative_cpu_energy_wh = 10.0;
        calculator.cumulative_gpu_energy_wh = 5.0;
        calculator.cumulative_ane_energy_wh = 3.0;
        
        let summary = calculator.get_summary(Some(100));
        
        assert_eq!(summary.total_energy_wh, 18.0);
        assert_eq!(summary.cpu_energy_wh, 10.0);
        assert_eq!(summary.gpu_energy_wh, 5.0);
        assert_eq!(summary.ane_energy_wh, 3.0);
        assert_eq!(summary.energy_per_token_wh, Some(0.18));
    }

    #[test]
    fn test_energy_per_token_with_zero_tokens() {
        let calculator = PowerCalculator::new();
        let summary = calculator.get_summary(Some(0));
        assert_eq!(summary.energy_per_token_wh, Some(0.0));
    }

    #[test]
    fn test_energy_per_token_with_none_tokens() {
        let calculator = PowerCalculator::new();
        let summary = calculator.get_summary(None);
        assert!(summary.energy_per_token_wh.is_none());
    }

    #[test]
    fn test_short_time_interval_accuracy() {
        let mut calculator = PowerCalculator::new();
        
        // First reading at t=0
        let telemetry1 = create_test_telemetry(0, Some(10.0), None, None);
        calculator.update_with_telemetry(telemetry1);
        
        // Second reading at t=1000ms (1 second later)
        let telemetry2 = create_test_telemetry(1000, Some(20.0), None, None);
        let result = calculator.update_with_telemetry(telemetry2);
        
        // Expected energy: (10 + 20) * (1/3600) / 2 = 30/7200 = 0.004166... Wh
        let expected_energy = (10.0 + 20.0) * (1.0 / 3600.0) / 2.0;
        
        if let Some(actual_energy) = result.cpu_energy_wh {
            assert!((actual_energy - expected_energy).abs() < 1e-10);
        } else {
            panic!("Expected cpu_energy_wh to be Some, got None");
        }
    }
}
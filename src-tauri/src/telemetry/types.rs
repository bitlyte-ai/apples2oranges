// Contains all telemetry-related data structures, event types, and configuration structures

use std::sync::Arc;
use serde::{Deserialize, Serialize};
use tokio::sync::broadcast;

// Import from hardware temperature module for TelemetryUpdate
use crate::hardware::temperature::CoreTemperatureData;

// Configuration structures for model and generation settings
#[derive(Debug, Clone, Deserialize)]
#[allow(dead_code)]
pub struct ModelConfig {
    pub model_path: String,
    // Core sampling parameters - must match frontend ModelConfig exactly
    pub temperature: Option<f32>,      // f32 required by llama-cpp-2 API
    pub top_k: Option<i32>,           // i32 required by llama-cpp-2 API
    pub top_p: Option<f32>,           // f32 required by llama-cpp-2 API
    pub min_p: Option<f32>,           // f32 required by llama-cpp-2 API
    pub repeat_penalty: Option<f32>,   // f32 required by llama-cpp-2 API
    pub repeat_last_n: Option<i32>,   // i32 required by llama-cpp-2 API
    pub frequency_penalty: Option<f32>, // f32 required by llama-cpp-2 API
    pub presence_penalty: Option<f32>, // f32 required by llama-cpp-2 API
    // Context configuration
    pub n_ctx: Option<u32>,
    pub telemetry_sampling_hz: Option<f32>,  // Telemetry sampling frequency in Hz (e.g., 1.0 = 1Hz = every 1000ms)
}

impl Default for ModelConfig {
    fn default() -> Self {
        Self {
            model_path: String::new(),
            // Use research-backed defaults from specification
            temperature: Some(0.7),        // Balanced creativity/coherence
            top_k: Some(40),              // Standard llama.cpp default
            top_p: Some(0.95),            // Updated per user feedback
            min_p: Some(0.05),            // Stability threshold
            repeat_penalty: Some(1.0),     // Disabled by default per user feedback
            repeat_last_n: Some(64),      // Standard window size
            frequency_penalty: Some(0.0),  // Disabled by default
            presence_penalty: Some(0.0),   // Disabled by default
            n_ctx: Some(4096),            // Reasonable context size
            telemetry_sampling_hz: Some(1.0),
        }
    }
}

#[derive(Debug, Clone, Deserialize)]
#[allow(dead_code)]
pub struct Message {
    pub role: String,
    pub content: String,
    pub model: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
#[allow(dead_code)]
pub struct GenerationConfig {
    pub chat_history: Vec<Message>,
    pub target: String, // "A", "B", or "Both"
    pub model_a: Option<ModelConfig>,
    pub model_b: Option<ModelConfig>,
    pub system_prompt: Option<String>,
    pub telemetry_sampling_hz: Option<f32>,  // Global telemetry sampling frequency for this generation
    pub wait_for_cpu_baseline_between_models: Option<bool>, // New option to control cooldown between A and B
    pub wait_for_cpu_baseline_margin_c: Option<f64>, // Tolerance margin in °C above baseline
    pub run_without_telemetry: Option<bool>, // When true, skip starting telemetry collection/emission
}

// Event structures for token streaming and telemetry
#[derive(Clone, Serialize)]
pub struct TokenEvent {
    pub token: String,
    pub model: String, // "A" or "B"
    pub finished: bool,
}

// New event structures for hybrid tokenization
#[derive(Clone, Serialize)]
pub struct InputTokenEvent {
    pub count: usize,
    pub model: String,
    pub timestamp_ms: u64,
}

#[derive(Clone, Serialize)]
pub struct OutputTokenEvent {
    pub count: usize,
    pub model: String,
    pub timestamp_ms: u64,
}

#[derive(Clone, Serialize)]
pub struct SystemPromptTokenEvent {
    pub count: usize,
    pub timestamp_ms: u64,
}

#[derive(Clone, Serialize)]
pub struct GenerationTimeEvent {
    pub generation_time_ms: u64,
    pub model: String,
    pub timestamp_ms: u64,
}

#[derive(Clone, Serialize)]
pub struct PowerConsumptionSummaryEvent {
    pub total_energy_wh: f64,
    pub cpu_energy_wh: f64,
    pub gpu_energy_wh: f64,
    pub ane_energy_wh: f64,
    pub energy_per_token_wh: Option<f64>,
    pub model: String,
    pub timestamp_ms: u64,
}

// Primary telemetry data structure
#[derive(Clone, Serialize, Debug)]
pub struct TelemetryUpdate {
    pub timestamp_ms: u64,
    pub cpu_power_watts: Option<f64>,
    pub gpu_power_watts: Option<f64>,
    pub ane_power_watts: Option<f64>,       // Apple Neural Engine power
    pub cpu_temp_celsius: Option<f64>,      // Legacy field for backward compatibility
    pub gpu_temp_celsius: Option<f64>,      // Legacy field for backward compatibility
    pub cpu_freq_mhz: Option<f64>,
    pub gpu_freq_mhz: Option<f64>,
    pub ram_usage_gb: Option<f64>,
    pub thermal_pressure: Option<String>,   // Kept for backward compatibility
    pub ttft_ms: Option<u64>,
    pub current_tps: Option<f64>,
    pub instantaneous_tps: Option<f64>,
    pub generation_time_ms: Option<u64>,    // Total generation time from start to finish
    pub model: Option<String>,
    // Enhanced temperature data
    pub cpu_temp_avg: Option<f64>,          // CPU temperature average
    pub cpu_temp_max: Option<f64>,          // CPU temperature maximum
    pub cpu_p_core_temps: Option<Vec<f64>>, // P-core individual temperatures
    pub cpu_e_core_temps: Option<Vec<f64>>, // E-core individual temperatures
    pub gpu_temp_avg: Option<f64>,          // GPU temperature average
    pub gpu_temp_max: Option<f64>,          // GPU temperature maximum
    pub gpu_cluster_temps: Option<Vec<f64>>, // GPU cluster individual temperatures
    pub battery_temp_avg: Option<f64>,      // Battery temperature average
    // CPU utilization data
    pub cpu_p_core_utilization: Option<Vec<f64>>, // P-core utilization percentages
    pub cpu_e_core_utilization: Option<Vec<f64>>, // E-core utilization percentages
    pub cpu_overall_utilization: Option<f64>,     // Overall CPU utilization percentage
    pub core_temperatures: Option<CoreTemperatureData>,
    // Power consumption calculation fields
    pub total_energy_wh: Option<f64>,           // Total energy consumed (Watt-hours)
    pub cpu_energy_wh: Option<f64>,             // CPU energy consumed  
    pub gpu_energy_wh: Option<f64>,             // GPU energy consumed
    pub ane_energy_wh: Option<f64>,             // ANE energy consumed
    pub energy_rate_wh_per_token: Option<f64>,  // Energy per token (for efficiency metrics)
}

// Control commands for telemetry system
#[derive(Clone, Serialize, Debug)]
pub enum TelemetryCommand {
    ResetPowerCalculator,  // Reset cumulative energy calculation
}

// Type alias for telemetry broadcasting
pub type TelemetryBroadcaster = Arc<broadcast::Sender<TelemetryUpdate>>;

// Type alias for control commands
pub type TelemetryCommandBroadcaster = Arc<broadcast::Sender<TelemetryCommand>>;

impl TelemetryUpdate {
    // Helper function to merge telemetry data with inference metrics
    pub fn with_inference_data(&self, ttft_ms: Option<u64>, current_tps: Option<f64>, instantaneous_tps: Option<f64>, model: Option<String>) -> Self {
        TelemetryUpdate {
            timestamp_ms: std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_millis() as u64,
            cpu_power_watts: self.cpu_power_watts,
            gpu_power_watts: self.gpu_power_watts,
            ane_power_watts: self.ane_power_watts,
            cpu_temp_celsius: self.cpu_temp_celsius,
            gpu_temp_celsius: self.gpu_temp_celsius,
            cpu_freq_mhz: self.cpu_freq_mhz,
            gpu_freq_mhz: self.gpu_freq_mhz,
            ram_usage_gb: self.ram_usage_gb,
            thermal_pressure: self.thermal_pressure.clone(),
            cpu_temp_avg: self.cpu_temp_avg,
            cpu_temp_max: self.cpu_temp_max,
            cpu_p_core_temps: self.cpu_p_core_temps.clone(),
            cpu_e_core_temps: self.cpu_e_core_temps.clone(),
            gpu_temp_avg: self.gpu_temp_avg,
            gpu_temp_max: self.gpu_temp_max,
            gpu_cluster_temps: self.gpu_cluster_temps.clone(),
            battery_temp_avg: self.battery_temp_avg,
            cpu_p_core_utilization: self.cpu_p_core_utilization.clone(),
            cpu_e_core_utilization: self.cpu_e_core_utilization.clone(),
            cpu_overall_utilization: self.cpu_overall_utilization,
            core_temperatures: self.core_temperatures.clone(),
            ttft_ms,
            current_tps,
            instantaneous_tps,
            generation_time_ms: self.generation_time_ms,
            model,
            // Preserve energy fields
            total_energy_wh: self.total_energy_wh,
            cpu_energy_wh: self.cpu_energy_wh,
            gpu_energy_wh: self.gpu_energy_wh,
            ane_energy_wh: self.ane_energy_wh,
            energy_rate_wh_per_token: self.energy_rate_wh_per_token,
        }
    }
}
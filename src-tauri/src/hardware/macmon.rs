// Contains MacmonOutput struct, MemoryInfo struct, and legacy start_macmon_monitoring function

use std::sync::{Arc, atomic::{AtomicBool, Ordering}};
use std::time::Duration;
use serde::Deserialize;
use tokio::io::{BufReader, AsyncBufReadExt};
use tokio::process::Command as TokioCommand;

// Import from hardware temperature module for MacmonOutput
use crate::hardware::temperature::TemperatureInfo;

// Import types from parent module
use crate::{TelemetryUpdate, TelemetryBroadcaster};

// macmon output data structure for JSON deserialization
#[derive(Debug, Deserialize)]
pub struct MacmonOutput {
    #[allow(dead_code)]
    pub timestamp: String,
    pub temp: Option<TemperatureInfo>,
    pub memory: Option<MemoryInfo>,
    #[allow(dead_code)]
    pub ecpu_usage: Option<(f64, f64)>, // (frequency_mhz, usage_percent) - not currently used
    pub pcpu_usage: Option<(f64, f64)>, // (frequency_mhz, usage_percent)
    pub gpu_usage: Option<(f64, f64)>,  // (frequency_mhz, usage_percent)
    pub cpu_power: Option<f64>,         // In Watts
    pub gpu_power: Option<f64>,         // In Watts
    pub ane_power: Option<f64>,         // Apple Neural Engine power in Watts
    #[allow(dead_code)]
    pub sys_power: Option<f64>,         // System power in Watts - not currently used
}

// Memory information from macmon
#[derive(Debug, Deserialize)]
pub struct MemoryInfo {
    #[allow(dead_code)]
    pub ram_total: Option<u64>,
    pub ram_usage: Option<u64>,
    #[allow(dead_code)]
    pub swap_total: Option<u64>,
    #[allow(dead_code)]
    pub swap_usage: Option<u64>,
}

// Legacy function - replaced by start_enhanced_monitoring
#[allow(dead_code)]
pub async fn start_macmon_monitoring(
    telemetry_broadcaster: TelemetryBroadcaster,
    stop_signal: Arc<AtomicBool>,
) -> Result<(), String> {
    println!("Starting macmon monitoring...");

    println!("🔋 Attempting to start macmon command...");
    let mut child = TokioCommand::new("macmon")
        .args(&["pipe", "-i", "1000"])
        .stdout(std::process::Stdio::piped())
        .stderr(std::process::Stdio::piped())
        .spawn()
        .map_err(|e| {
            let error_msg = format!("Failed to start macmon: {}. Please install macmon via 'brew install macmon'", e);
            println!("❌ {}", error_msg);
            error_msg
        })?;

    println!("✅ Macmon command started successfully");

    // Start a task to read stderr for debugging
    if let Some(stderr) = child.stderr.take() {
        let stderr_reader = BufReader::new(stderr);
        tokio::spawn(async move {
            let mut stderr_lines = stderr_reader.lines();
            while let Ok(Some(line)) = stderr_lines.next_line().await {
                println!("🔋 macmon stderr: {}", line);
            }
        });
    }

    if let Some(stdout) = child.stdout.take() {
        let reader = BufReader::new(stdout);
        let mut lines = reader.lines();

        while !stop_signal.load(Ordering::Relaxed) {
            tokio::select! {
                line_result = lines.next_line() => {
                    match line_result {
                        Ok(Some(line)) => {
                            println!("🔍 Raw macmon data: {}", line);
                            match serde_json::from_str::<MacmonOutput>(&line) {
                                Ok(data) => {
                                    println!("🔍 Parsed data: {:?}", data);
                                    let timestamp = std::time::SystemTime::now()
                                        .duration_since(std::time::UNIX_EPOCH)
                                        .unwrap()
                                        .as_millis() as u64;

                                    let cpu_temp = data.temp
                                        .as_ref()
                                        .and_then(|t| t.cpu_temp_avg);

                                    let gpu_temp = data.temp
                                        .as_ref()
                                        .and_then(|t| t.gpu_temp_avg);

                                    let cpu_freq = data.pcpu_usage
                                        .as_ref()
                                        .map(|(freq, _)| *freq);

                                    let gpu_freq = data.gpu_usage
                                        .as_ref()
                                        .map(|(freq, _)| *freq);

                                    let ram_usage_gb = data.memory
                                        .as_ref()
                                        .and_then(|m| m.ram_usage)
                                        .map(|bytes| bytes as f64 / (1024.0 * 1024.0 * 1024.0));

                                    let telemetry = TelemetryUpdate {
                                        timestamp_ms: timestamp,
                                        cpu_power_watts: data.cpu_power,
                                        gpu_power_watts: data.gpu_power,
                                        ane_power_watts: data.ane_power,
                                        cpu_temp_celsius: cpu_temp,
                                        gpu_temp_celsius: gpu_temp,
                                        cpu_freq_mhz: cpu_freq,
                                        gpu_freq_mhz: gpu_freq,
                                        ram_usage_gb,
                                        thermal_pressure: None, // macmon doesn't provide this legacy field
                                        ttft_ms: None,
                                        current_tps: None,
                                        instantaneous_tps: None,
                                        generation_time_ms: None,
                                        model: None,
                                        // Enhanced temperature data (unavailable in legacy mode)
                                        cpu_temp_avg: cpu_temp,
                                        cpu_temp_max: None,
                                        cpu_p_core_temps: None,
                                        cpu_e_core_temps: None,
                                        gpu_temp_avg: gpu_temp,
                                        gpu_temp_max: None,
                                        gpu_cluster_temps: None,
                                        battery_temp_avg: None,
                                        // CPU utilization data (unavailable in legacy mode)
                                        cpu_p_core_utilization: None,
                                        cpu_e_core_utilization: None,
                                        cpu_overall_utilization: None,
                                        core_temperatures: None, // Legacy macmon mode doesn't provide individual cores
                                        // Energy fields (initialized as None, will be filled by PowerCalculator)
            total_energy_wh: None,
            cpu_energy_wh: None,
            gpu_energy_wh: None,
            ane_energy_wh: None,
            energy_rate_wh_per_token: None,
                                    };

                                    println!("🔋 Broadcasting hardware telemetry: {:?}", telemetry);
                                    if let Err(e) = telemetry_broadcaster.send(telemetry) {
                                        println!("❌ Failed to broadcast hardware telemetry: {}", e);
                                    }
                                }
                                Err(e) => {
                                    println!("Failed to parse macmon JSON: {}", e);
                                }
                            }
                        }
                        Ok(None) => break,
                        Err(e) => {
                            println!("Error reading macmon output: {}", e);
                            break;
                        }
                    }
                }
                _ = tokio::time::sleep(Duration::from_millis(100)) => {
                    // Continue loop
                }
            }
        }
    }

    let _ = child.kill().await;
    println!("Macmon monitoring stopped");
    Ok(())
}
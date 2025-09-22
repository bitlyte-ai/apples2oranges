// Contains start_enhanced_monitoring and minimal required dependencies

pub mod temperature;
pub mod cpu_monitor;
pub mod macmon;

// Re-export temperature structs for external access
pub use temperature::{
    TemperatureInfo, CoreTemperatureData, ThermalTrend, 
    IOHIDTemperatureSensors, TemperatureHistory, read_core_temperatures
};

// Re-export CPU monitoring structs for external access - Priority 4.3
pub use cpu_monitor::{
    CpuUtilizationMonitor, AppleSiliconInfo, DetectionMethod
};

// Re-export macmon structs for external access - Priority 4.4
pub use macmon::{
    MacmonOutput, MemoryInfo, start_macmon_monitoring
};

use std::sync::{Arc, atomic::{AtomicBool, Ordering}};
use std::time::Duration;
use tokio::io::{BufReader, AsyncBufReadExt};
use tokio::process::Command as TokioCommand;

// Import types and functions from parent module
use crate::{
    TelemetryUpdate, TelemetryBroadcaster,
    CURRENT_TELEMETRY
};
use crate::telemetry::types::{TelemetryCommand, TelemetryCommandBroadcaster};
use crate::telemetry::power_calculator::PowerCalculator;
use crate::utils::debug::DEBUG_LOGS;

#[allow(unused_macros)]
macro_rules! dprintln {
    ($($arg:tt)*) => {
        if DEBUG_LOGS { println!($($arg)*); }
    }
}




pub async fn start_enhanced_monitoring(
    telemetry_broadcaster: TelemetryBroadcaster,
    stop_signal: Arc<AtomicBool>,
    command_receiver: Option<TelemetryCommandBroadcaster>,
    sampling_frequency_hz: Option<f32>,  // Sampling frequency in Hz (e.g., 1.0 = 1Hz = 1000ms interval)
) -> Result<(), String> {
    // Calculate sampling interval from frequency (default 1Hz = 1000ms)
    let sampling_hz = sampling_frequency_hz.unwrap_or(1.0).max(0.1).min(50.0); // Clamp between 0.1 and 50 Hz
    let sampling_interval_ms = (1000.0 / sampling_hz) as u64;
    
dprintln!("Starting enhanced monitoring with SMC temperature sensors...");
dprintln!("📊 Telemetry sampling frequency: {:.1}Hz ({}ms interval)", sampling_hz, sampling_interval_ms);
    
    // Initialize temperature history tracking
    let mut temp_history = TemperatureHistory::new(60); // Keep 1 minute of history
    
    // Initialize CPU utilization monitor
    let mut cpu_monitor = CpuUtilizationMonitor::new();
    
    // Initialize power calculator
    let mut power_calculator = PowerCalculator::new();
    
    // Set up command receiver for power calculator reset
    let mut command_rx = command_receiver.as_ref().map(|broadcaster| broadcaster.subscribe());
    
    // Start both macmon for power/freq and SMC for detailed temperatures
    let mut macmon_child = None;
    let mut macmon_reader = None;
    
    // Try to start macmon subprocess with dynamic sampling interval
    let macmon_interval_str = sampling_interval_ms.to_string();
    match TokioCommand::new("macmon")
        .args(&["pipe", "-i", &macmon_interval_str])
        .stdout(std::process::Stdio::piped())
        .stderr(std::process::Stdio::piped())
        .spawn()
    {
        Ok(mut child) => {
dprintln!("✅ Macmon started for power/frequency data");
            if let Some(stdout) = child.stdout.take() {
                macmon_reader = Some(BufReader::new(stdout).lines());
            }
            macmon_child = Some(child);
        }
        Err(e) => {
            println!("⚠️  Macmon unavailable ({}), using SMC-only mode", e);
        }
    }
    
    while !stop_signal.load(Ordering::Relaxed) {
        // Check for power calculator reset commands
        if let Some(ref mut rx) = command_rx {
            while let Ok(command) = rx.try_recv() {
                match command {
                    TelemetryCommand::ResetPowerCalculator => {
                        println!("🔄 POWER CALC: Received reset command - resetting power calculator for new model");
                        power_calculator.reset();
                        println!("🔄 POWER CALC: Power calculator reset completed");
                    }
                }
            }
        }
        
        let timestamp = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_millis() as u64;
        
        // Read enhanced core temperatures via SMC
        let core_temp_result = read_core_temperatures().await;
        
        // Get CPU utilization data
        let (p_core_utils, e_core_utils, overall_util) = cpu_monitor.get_cpu_utilization().await;
        
        // Try to get macmon data if available
        let mut macmon_data: Option<MacmonOutput> = None;
dprintln!("🔍 MACMON DATA COLLECTION: Attempting to read macmon data...");
        
        if let Some(ref mut reader) = macmon_reader {
dprintln!("   📖 Macmon reader available - attempting non-blocking read with 100ms timeout");
            // Non-blocking read attempt
            match tokio::time::timeout(Duration::from_millis(100), reader.next_line()).await {
                Ok(Ok(Some(line))) => {
dprintln!("   📖 Raw macmon line received: {}", line);
                    match serde_json::from_str::<MacmonOutput>(&line) {
                        Ok(data) => {
dprintln!("   ✅ Macmon data parsed successfully:");
dprintln!("      CPU power: {:?} W", data.cpu_power);
dprintln!("      GPU power: {:?} W", data.gpu_power);
dprintln!("      ANE power: {:?} W", data.ane_power);
dprintln!("      CPU temp: {:?}°C", data.temp.as_ref().and_then(|t| t.cpu_temp_avg));
dprintln!("      GPU temp: {:?}°C", data.temp.as_ref().and_then(|t| t.gpu_temp_avg));
dprintln!("      CPU freq: {:?} MHz", data.pcpu_usage.as_ref().map(|(freq, _)| freq));
dprintln!("      GPU freq: {:?} MHz", data.gpu_usage.as_ref().map(|(freq, _)| freq));
dprintln!("      RAM usage: {:?} bytes", data.memory.as_ref().and_then(|m| m.ram_usage));
                            macmon_data = Some(data);
                        }
                        Err(e) => {
dprintln!("   ❌ Failed to parse macmon JSON: {}", e);
dprintln!("      Raw line was: {}", line);
                        }
                    }
                }
                Ok(Ok(None)) => {
dprintln!("   📖 Macmon reader returned None (EOF)");
                }
                Ok(Err(e)) => {
dprintln!("   ❌ Error reading from macmon: {}", e);
                }
                Err(_) => {
dprintln!("   ⏰ Macmon read timeout (no data available)");
                }
            }
        } else {
            println!("   ❌ No macmon reader available - running in SMC-only mode");
        }
        
        // Create telemetry update combining both sources
dprintln!("🔍 TELEMETRY AGGREGATION: Combining SMC and macmon data...");
        let telemetry = match core_temp_result {
            Ok(mut core_temps) => {
dprintln!("   ✅ Core temperature data available from SMC");
                // Update thermal trend from history
                temp_history.add_reading(timestamp, core_temps.cpu_temp_avg);
                core_temps.thermal_trend = temp_history.get_trend(10000); // 10 second window
                
dprintln!("🔍 FINAL TELEMETRY VALUES:");
                
                let cpu_power = macmon_data.as_ref().and_then(|d| d.cpu_power);
                let gpu_power = macmon_data.as_ref().and_then(|d| d.gpu_power);
                let ane_power = macmon_data.as_ref().and_then(|d| d.ane_power);
dprintln!("   Power: CPU={:?}W, GPU={:?}W, ANE={:?}W", cpu_power, gpu_power, ane_power);
                
                let legacy_cpu_temp = Some(core_temps.cpu_temp_avg);
                let combined_gpu_temp = core_temps.gpu_temp_avg.or_else(|| 
                    macmon_data.as_ref()
                        .and_then(|d| d.temp.as_ref())
                        .and_then(|t| t.gpu_temp_avg)
                );
dprintln!("   Legacy temps: CPU={:?}°C, GPU={:?}°C", legacy_cpu_temp, combined_gpu_temp);
                
                let cpu_freq = macmon_data.as_ref()
                    .and_then(|d| d.pcpu_usage.as_ref())
                    .map(|(freq, _)| *freq);
                let gpu_freq = macmon_data.as_ref()
                    .and_then(|d| d.gpu_usage.as_ref())
                    .map(|(freq, _)| *freq);
dprintln!("   Frequencies: CPU={:?}MHz, GPU={:?}MHz", cpu_freq, gpu_freq);
                
                let ram_usage = macmon_data.as_ref()
                    .and_then(|d| d.memory.as_ref())
                    .and_then(|m| m.ram_usage)
                    .map(|bytes| bytes as f64 / (1024.0 * 1024.0 * 1024.0));
dprintln!("   RAM usage: {:?}GB", ram_usage);
                
dprintln!("   Enhanced temps: CPU_avg={:?}°C, CPU_max={:?}°C, GPU_avg={:?}°C, GPU_max={:?}°C, Battery_avg={:?}°C", 
                         Some(core_temps.cpu_temp_avg), Some(core_temps.cpu_temp_max), 
                         core_temps.gpu_temp_avg, core_temps.gpu_temp_max, core_temps.battery_temp_avg);
                
dprintln!("   Core arrays: P_cores={}, E_cores={}, GPU_clusters={}", 
                         core_temps.p_cores.len(), core_temps.e_cores.len(), core_temps.gpu_temps.len());
                
dprintln!("   CPU utilization: P_cores={}, E_cores={}, Overall={:.1}%", 
                         p_core_utils.len(), e_core_utils.len(), overall_util);
                
                TelemetryUpdate {
                    timestamp_ms: timestamp,
                    cpu_power_watts: cpu_power,
                    gpu_power_watts: gpu_power,
                    ane_power_watts: ane_power,
                    cpu_temp_celsius: legacy_cpu_temp, // Legacy compatibility
                    gpu_temp_celsius: combined_gpu_temp,
                    cpu_freq_mhz: cpu_freq,
                    gpu_freq_mhz: gpu_freq,
                    ram_usage_gb: ram_usage,
                    thermal_pressure: None,
                    ttft_ms: None,
                    current_tps: None,
                    instantaneous_tps: None,
                    generation_time_ms: None,
                    model: None,
                    // Enhanced temperature data
                    cpu_temp_avg: Some(core_temps.cpu_temp_avg),
                    cpu_temp_max: Some(core_temps.cpu_temp_max),
                    cpu_p_core_temps: Some(core_temps.p_cores.clone()),
                    cpu_e_core_temps: Some(core_temps.e_cores.clone()),
                    gpu_temp_avg: core_temps.gpu_temp_avg,
                    gpu_temp_max: core_temps.gpu_temp_max,
                    gpu_cluster_temps: Some(core_temps.gpu_temps.clone()),
                    battery_temp_avg: core_temps.battery_temp_avg,
                    // CPU utilization data
                    cpu_p_core_utilization: Some(p_core_utils.clone()),
                    cpu_e_core_utilization: Some(e_core_utils.clone()),
                    cpu_overall_utilization: Some(overall_util),
                    core_temperatures: Some(core_temps),
                    // Energy fields (initialized as None, will be filled by PowerCalculator)
                    total_energy_wh: None,
                    cpu_energy_wh: None,
                    gpu_energy_wh: None,
                    ane_energy_wh: None,
                    energy_rate_wh_per_token: None,
                }
            }
            Err(e) => {
                println!("❌ SMC temperature read failed: {}", e);
                // Fallback to macmon-only data
                TelemetryUpdate {
                    timestamp_ms: timestamp,
                    cpu_power_watts: macmon_data.as_ref().and_then(|d| d.cpu_power),
                    gpu_power_watts: macmon_data.as_ref().and_then(|d| d.gpu_power),
                    ane_power_watts: macmon_data.as_ref().and_then(|d| d.ane_power),
                    cpu_temp_celsius: macmon_data.as_ref()
                        .and_then(|d| d.temp.as_ref())
                        .and_then(|t| t.cpu_temp_avg),
                    gpu_temp_celsius: macmon_data.as_ref()
                        .and_then(|d| d.temp.as_ref())
                        .and_then(|t| t.gpu_temp_avg),
                    cpu_freq_mhz: macmon_data.as_ref()
                        .and_then(|d| d.pcpu_usage.as_ref())
                        .map(|(freq, _)| *freq),
                    gpu_freq_mhz: macmon_data.as_ref()
                        .and_then(|d| d.gpu_usage.as_ref())
                        .map(|(freq, _)| *freq),
                    ram_usage_gb: macmon_data.as_ref()
                        .and_then(|d| d.memory.as_ref())
                        .and_then(|m| m.ram_usage)
                        .map(|bytes| bytes as f64 / (1024.0 * 1024.0 * 1024.0)),
                    thermal_pressure: None,
                    ttft_ms: None,
                    current_tps: None,
                    instantaneous_tps: None,
                    generation_time_ms: None,
                    model: None,
                    // Enhanced temperature data (unavailable in fallback)
                    cpu_temp_avg: macmon_data.as_ref().and_then(|d| d.temp.as_ref()).and_then(|t| t.cpu_temp_avg),
                    cpu_temp_max: None,
                    cpu_p_core_temps: None,
                    cpu_e_core_temps: None,
                    gpu_temp_avg: macmon_data.as_ref().and_then(|d| d.temp.as_ref()).and_then(|t| t.gpu_temp_avg),
                    gpu_temp_max: None,
                    gpu_cluster_temps: None,
                    battery_temp_avg: None,
                    // CPU utilization data (use fallback data)
                    cpu_p_core_utilization: Some(p_core_utils.clone()),
                    cpu_e_core_utilization: Some(e_core_utils.clone()),
                    cpu_overall_utilization: Some(overall_util),
                    core_temperatures: None,
                    // Energy fields (initialized as None, will be filled by PowerCalculator)
                    total_energy_wh: None,
                    cpu_energy_wh: None,
                    gpu_energy_wh: None,
                    ane_energy_wh: None,
                    energy_rate_wh_per_token: None,
                }
            }
        };
        
        // Update telemetry with power consumption calculation
        let telemetry_with_energy = power_calculator.update_with_telemetry(telemetry);
        
        // Store updated telemetry state for inference merging
        if let Ok(mut current) = CURRENT_TELEMETRY.write() {
            *current = Some(telemetry_with_energy.clone());
        }

        // Broadcast updated telemetry
dprintln!("🔗 BACKEND: *** BROADCASTING ENHANCED TELEMETRY WITH ENERGY DATA ***");
dprintln!("🔗 BACKEND: Broadcast data: timestamp={}, cpu_power={:?}, total_energy={:?}",
                 telemetry_with_energy.timestamp_ms, telemetry_with_energy.cpu_power_watts, telemetry_with_energy.total_energy_wh);
dprintln!("🔗 BACKEND: Pre-broadcast receiver count: {}", telemetry_broadcaster.receiver_count());

        match telemetry_broadcaster.send(telemetry_with_energy) {
            Ok(receiver_count) => {
dprintln!("🔗 BACKEND: ✅ Enhanced telemetry with energy data broadcast to {} receivers", receiver_count);
dprintln!("🔗 BACKEND: Post-broadcast receiver count: {}", telemetry_broadcaster.receiver_count());
            }
            Err(e) => {
dprintln!("🔗 BACKEND: ❌ Failed to broadcast telemetry: {}", e);
            }
        }
        
        // Wait for next reading using configurable sampling interval
        tokio::time::sleep(Duration::from_millis(sampling_interval_ms)).await;
    }
    
    // Cleanup macmon if running
    if let Some(mut child) = macmon_child {
        let _ = child.kill().await;
    }
    
    println!("Enhanced monitoring stopped");
    Ok(())
}


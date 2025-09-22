// Contains run_generation_turn Tauri command

use std::sync::{Arc, atomic::{AtomicBool, Ordering}};
use tauri::{Emitter, Window};
use tokio::sync::broadcast;

// Import types and functions from parent module
use crate::{
    GenerationConfig, GLOBAL_STOP_SIGNAL,
    run_model_inference, start_enhanced_monitoring,
    read_core_temperatures
};
use crate::telemetry::types::TelemetryCommand;
use crate::utils::debug::DEBUG_LOGS;

#[allow(unused_macros)]
macro_rules! dprintln {
    ($($arg:tt)*) => {
        if DEBUG_LOGS { println!($($arg)*); }
    }
}

#[derive(Clone, serde::Serialize)]
struct CooldownUpdateEvent {
    state: String,              // "started" | "progress" | "complete" | "timeout" | "canceled"
    baseline_c: Option<f64>,    // Baseline CPU max temp (°C)
    margin_c: f64,              // Allowed margin above baseline (°C)
    threshold_c: Option<f64>,   // Baseline + margin target (°C)
    current_c: Option<f64>,     // Current CPU max temp (°C)
    elapsed_s: Option<u64>,     // Seconds since start of cooldown
    timestamp_ms: u64,          // Event timestamp
}

#[tauri::command]
pub async fn run_generation_turn(
    window: Window,
    config: GenerationConfig,
) -> Result<(), String> {
    // Determine if telemetry should be disabled for this run
    let disable_telemetry = config.run_without_telemetry.unwrap_or(false);

    // Create telemetry broadcaster (always created; may be unused if disabled)
    let (telemetry_tx, _) = broadcast::channel(1000);
    let telemetry_broadcaster = Arc::new(telemetry_tx);
    
    // Create command broadcaster for power calculator reset
    let (command_tx, _) = broadcast::channel(100);
    let command_broadcaster = Arc::new(command_tx);
    
    let stop_signal = Arc::new(AtomicBool::new(false));
    
    // Set up global stop signal for this generation session
    {
        if let Ok(mut global_stop) = GLOBAL_STOP_SIGNAL.write() {
            *global_stop = Some(stop_signal.clone());
            println!("🛑 Global stop signal initialized for generation session");
        }
    }
    
    if disable_telemetry {
        dprintln!("🚫 Telemetry disabled for this generation run");
    } else {
        dprintln!("🚀 Starting telemetry system for generation...");
    }
    
    // Extract sampling frequency from global telemetry configuration
    let desired_sampling_hz = config.telemetry_sampling_hz.unwrap_or(1.0).max(0.1).min(50.0);
    
    // Pre-warm monitoring at 1.0 Hz, then optionally switch to desired rate
    let mut monitoring_handle = None;
    let mut prewarm_monitoring_handle = None;
    let mut prewarm_stop_signal_opt: Option<Arc<AtomicBool>> = None;
    
    if !disable_telemetry {
        // PREWARM NOTE:
        // We prewarm macmon (as part of the enhanced monitoring task) at 1.0 Hz so that
        // power/energy/RAM telemetry is already available by the time inference begins.
        // Without this, the first visible readings can be delayed by macmon/SMC sampling
        // cadence and chart refresh, causing charts to "start late" relative to inference.
        // This prewarm runs in the background and does NOT block inference.
        // If the user's chosen rate differs from 1.0 Hz, we stop the prewarm and start
        // a main monitor at the desired rate; if it is exactly 1.0 Hz, we reuse the prewarm.
        
        // Start prewarm monitor at 1Hz with its own stop signal
        let prewarm_stop_signal = Arc::new(AtomicBool::new(false));
        prewarm_stop_signal_opt = Some(prewarm_stop_signal.clone());
        let telemetry_for_prewarm = telemetry_broadcaster.clone();
        let command_for_prewarm = Some(command_broadcaster.clone());
        prewarm_monitoring_handle = Some(tokio::spawn(async move {
            println!("🔋 Pre-warming telemetry at 1.0Hz...");
            if let Err(e) = start_enhanced_monitoring(telemetry_for_prewarm, prewarm_stop_signal.clone(), command_for_prewarm, Some(1.0)).await {
                println!("❌ Pre-warm monitoring error: {}", e);
            }
        }));
        
        // If user-requested sampling differs from 1.0Hz, stop prewarm and start main monitor at desired rate
        if (desired_sampling_hz - 1.0).abs() > f32::EPSILON {
            if let Some(prewarm_stop) = &prewarm_stop_signal_opt {
                prewarm_stop.store(true, Ordering::Relaxed);
            }
            let telemetry_for_monitoring = telemetry_broadcaster.clone();
            let command_for_monitoring = Some(command_broadcaster.clone());
            let stop_for_monitoring = stop_signal.clone();
            monitoring_handle = Some(tokio::spawn(async move {
                println!("🔋 Starting telemetry monitor at {:.1}Hz...", desired_sampling_hz);
                if let Err(e) = start_enhanced_monitoring(telemetry_for_monitoring, stop_for_monitoring, command_for_monitoring, Some(desired_sampling_hz)).await {
                    println!("❌ Telemetry monitoring error: {}", e);
                }
            }));
        } else {
            println!("🔋 Using pre-warmed telemetry at 1.0Hz for this run (no restart).");
        }
    }
    
    // Start telemetry event emitter (only if telemetry is enabled)
    let event_handle = if !disable_telemetry {
        dprintln!("🔧 BACKEND: Setting up telemetry event emitter task...");
        let _telemetry_for_events = telemetry_broadcaster.clone();
        let window_for_events = window.clone();
        let mut telemetry_rx = telemetry_broadcaster.subscribe();
        dprintln!("🔧 BACKEND: About to spawn event emitter task...");
        dprintln!("🔧 BACKEND: Current broadcaster receiver count: {}", telemetry_broadcaster.receiver_count());

        // Test if telemetry_rx is valid
        dprintln!("🔧 BACKEND: Testing telemetry_rx validity...");
        match telemetry_rx.try_recv() {
            Ok(_) => dprintln!("🔧 BACKEND: telemetry_rx has pending message"),
            Err(tokio::sync::broadcast::error::TryRecvError::Empty) => dprintln!("🔧 BACKEND: telemetry_rx is valid (empty)"),
            Err(tokio::sync::broadcast::error::TryRecvError::Closed) => dprintln!("🔧 BACKEND: ❌ telemetry_rx is CLOSED!"),
            Err(tokio::sync::broadcast::error::TryRecvError::Lagged(_)) => dprintln!("🔧 BACKEND: telemetry_rx is lagged but valid"),
        }

        // Test window validity
        dprintln!("🔧 BACKEND: Testing window_for_events validity...");
        dprintln!("🔧 BACKEND: Window label: {:?}", window_for_events.label());

        dprintln!("🔧 BACKEND: All variables validated, spawning task...");
        Some(tauri::async_runtime::spawn(async move {
            dprintln!("🎯 BACKEND: *** TELEMETRY EVENT EMITTER TASK STARTED ***");

            // Test basic functionality first
            dprintln!("🎯 BACKEND: Testing basic task execution...");

            dprintln!("🎯 BACKEND: Task is alive and waiting for telemetry broadcasts...");
            println!("🎯 BACKEND: Receiver subscription created, starting recv loop...");

            let mut event_count = 0;
            let mut heartbeat_count = 0;

            dprintln!("🎯 BACKEND: About to create heartbeat interval...");
            // Add periodic heartbeat to prove task is alive
            let mut heartbeat_interval = tokio::time::interval(tokio::time::Duration::from_secs(2));
            println!("🎯 BACKEND: Heartbeat interval created successfully...");

            loop {
                tokio::select! {
                    // Telemetry reception
                    telemetry_result = telemetry_rx.recv() => {
                        match telemetry_result {
                            Ok(telemetry) => {
                                event_count += 1;
                                dprintln!("🎯 BACKEND: *** RECEIVED TELEMETRY BROADCAST #{} ***", event_count);
                                dprintln!("🎯 BACKEND: *** ATTEMPTING TO EMIT TELEMETRY EVENT ***");
                                dprintln!("🎯 BACKEND: Event name: 'telemetry_update'");
                                dprintln!("🎯 BACKEND: Telemetry data: timestamp={}, cpu_power={:?}, model={:?}",
                                         telemetry.timestamp_ms, telemetry.cpu_power_watts, telemetry.model);

                                match window_for_events.emit("telemetry_update", &telemetry) {
                                    Ok(()) => {
                                        dprintln!("🎯 BACKEND: ✅ Telemetry event successfully emitted to frontend!");
                                    }
                                    Err(e) => {
                                        dprintln!("🎯 BACKEND: ❌ Failed to emit telemetry event: {}", e);
                                    }
                                }
                            }
                            Err(e) => {
                                dprintln!("🎯 BACKEND: ❌ Telemetry recv error: {} - ending event emitter", e);
                                break;
                            }
                        }
                    }
                    // Heartbeat to prove task is alive
                    _ = heartbeat_interval.tick() => {
                        heartbeat_count += 1;
                        dprintln!("💓 BACKEND: Event emitter heartbeat #{} - task is alive, waiting for broadcasts...", heartbeat_count);
                    }
                }
            }
            dprintln!("📡 Telemetry event emitter stopped after {} events", event_count);
        }))
    } else { None };

if event_handle.is_some() {
        dprintln!("🔧 BACKEND: Event emitter task spawned successfully");
        dprintln!("🔧 BACKEND: Post-spawn broadcaster receiver count: {}", telemetry_broadcaster.receiver_count());
    }

let inference_handle = {
        let window = window.clone();
        let telemetry_broadcaster = telemetry_broadcaster.clone();
        let config = config.clone();
        let disable_telemetry_inner = disable_telemetry;
        // The inference process is CPU-bound and blocks the async runtime, starving other tasks.
        // We use `spawn_blocking` to move the entire inference process to a separate thread pool
        // where it won't interfere with the main async runtime responsible for telemetry.
        tauri::async_runtime::spawn_blocking(move || {
            // Since `run_model_inference` is an async function, we need a runtime to execute it.
            // We get a handle to the existing tauri/tokio runtime and use `block_on`
            // to run the async inference function to completion within this blocking thread.
            let handle = tauri::async_runtime::handle();
            handle.block_on(async move {
                dprintln!("🎯 BACKEND: About to start inference in a blocking task - event emitter should be running");

                // Prepare optional telemetry broadcaster for inference
                let telemetry_opt = if disable_telemetry_inner { None } else { Some(telemetry_broadcaster.clone()) };

match config.target.as_str() {
                    "A" => {
                        if let Some(model_a) = &config.model_a {
                            dprintln!("🤖 Running inference for Model A{}", if disable_telemetry_inner { " (telemetry disabled)" } else { " with telemetry..." });
                            // Reset power calculator only when telemetry is enabled
                            if !disable_telemetry_inner {
                                if let Err(e) = command_broadcaster.send(TelemetryCommand::ResetPowerCalculator) {
                                    println!("⚠️ Failed to send power calculator reset command for Model A: {}", e);
                                } else {
                                    println!("🔄 Sent power calculator reset command for Model A");
                                }
                            }
                            run_model_inference(&window, model_a, &config.chat_history, "A", telemetry_opt.clone(), config.system_prompt.as_deref()).await?;
                        } else {
                            return Err("Model A configuration missing".to_string());
                        }
                    }
                    "B" => {
                        if let Some(model_b) = &config.model_b {
                            dprintln!("🤖 Running inference for Model B{}", if disable_telemetry_inner { " (telemetry disabled)" } else { " with telemetry..." });
                            // Reset power calculator only when telemetry is enabled
                            if !disable_telemetry_inner {
                                if let Err(e) = command_broadcaster.send(TelemetryCommand::ResetPowerCalculator) {
                                    println!("⚠️ Failed to send power calculator reset command for Model B: {}", e);
                                } else {
                                    println!("🔄 Sent power calculator reset command for Model B");
                                }
                            }
                            run_model_inference(&window, model_b, &config.chat_history, "B", telemetry_opt.clone(), config.system_prompt.as_deref()).await?;
                        } else {
                            return Err("Model B configuration missing".to_string());
                        }
                    }
                    "Both" => {
                        // Sequential execution: A -> unload -> optional cooldown -> B -> unload
                        let wait_for_cooldown = config.wait_for_cpu_baseline_between_models.unwrap_or(false);
                        let margin_c_raw = config.wait_for_cpu_baseline_margin_c.unwrap_or(2.0);
                        // Clamp to a reasonable range but allow negative values to require cooling below baseline
                        let margin_c: f64 = margin_c_raw.max(-20.0).min(20.0);
                        let mut baseline_cpu_max: Option<f64> = None;

                        if let Some(model_a) = &config.model_a {
                            // Measure baseline CPU temp just before Model A loads/starts
                            if wait_for_cooldown {
                                println!("🌡️ Measuring baseline CPU temperature before Model A starts...");
                                match read_core_temperatures().await {
                                    Ok(core_temp) => {
                                        baseline_cpu_max = Some(core_temp.cpu_temp_max);
                                        println!("🌡️ Baseline CPU max recorded: {:.1}°C", core_temp.cpu_temp_max);
                                        // Emit cooldown started event with baseline and threshold
                                        let baseline = core_temp.cpu_temp_max;
                                        let threshold = baseline + margin_c;
                                        let _ = window.emit("cooldown_update", CooldownUpdateEvent {
                                            state: "started".to_string(),
                                            baseline_c: Some(baseline),
                                            margin_c,
                                            threshold_c: Some(threshold),
                                            current_c: None,
                                            elapsed_s: Some(0),
                                            timestamp_ms: std::time::SystemTime::now()
                                                .duration_since(std::time::UNIX_EPOCH)
                                                .unwrap()
                                                .as_millis() as u64,
                                        });
                                    }
                                    Err(e) => {
                                        println!("⚠️ Failed to read baseline CPU temperature: {}. Proceeding without cooldown.", e);
                                    }
                                }
                            }

                            dprintln!("🤖 Running inference for Model A (Both mode){}", if disable_telemetry_inner { " (telemetry disabled)" } else { " with telemetry..." });
                            // Reset power calculator for Model A when telemetry is enabled
                            if !disable_telemetry_inner {
                                if let Err(e) = command_broadcaster.send(TelemetryCommand::ResetPowerCalculator) {
                                    println!("⚠️ Failed to send power calculator reset command for Model A (Both mode): {}", e);
                                } else {
                                    println!("🔄 Sent power calculator reset command for Model A (Both mode)");
                                }
                            }
                            run_model_inference(&window, model_a, &config.chat_history, "A", telemetry_opt.clone(), config.system_prompt.as_deref()).await?;
                            // Model A is automatically unloaded when it goes out of scope
                        }

                        // Optional cooldown before starting Model B
                        if wait_for_cooldown {
                            if let Some(baseline) = baseline_cpu_max {
                                const POLL_INTERVAL_MS: u64 = 1000;
                                const MAX_WAIT_SECS: u64 = 300; // Safety cap

                                println!("🧊 Waiting for CPU to cool to baseline + {:.1}°C (≤ {:.1}°C)...", margin_c, baseline + margin_c);
                                let start_wait = std::time::Instant::now();

                                loop {
                                    // Check for cancellation
                                    if let Ok(stop_signal_guard) = GLOBAL_STOP_SIGNAL.read() {
                                        if let Some(stop) = stop_signal_guard.as_ref() {
                                            if stop.load(Ordering::Relaxed) {
                                                println!("🛑 Cooldown wait canceled by stop signal");
                                                // Emit canceled event
                                                let _ = window.emit("cooldown_update", CooldownUpdateEvent {
                                                    state: "canceled".to_string(),
                                                    baseline_c: Some(baseline),
                                                    margin_c,
                                                    threshold_c: Some(baseline + margin_c),
                                                    current_c: None,
                                                    elapsed_s: Some(start_wait.elapsed().as_secs()),
                                                    timestamp_ms: std::time::SystemTime::now()
                                                        .duration_since(std::time::UNIX_EPOCH)
                                                        .unwrap()
                                                        .as_millis() as u64,
                                                });
                                                break;
                                            }
                                        }
                                    }

                                    match read_core_temperatures().await {
                                        Ok(core_temp) => {
                                            let current_max = core_temp.cpu_temp_max;
                                            let threshold = baseline + margin_c;
                                            let elapsed = start_wait.elapsed().as_secs();
                                            println!("🌡️ Current CPU max: {:.1}°C (target ≤ {:.1}°C)", current_max, threshold);

                                            // Emit progress event
                                            let _ = window.emit("cooldown_update", CooldownUpdateEvent {
                                                state: "progress".to_string(),
                                                baseline_c: Some(baseline),
                                                margin_c,
                                                threshold_c: Some(threshold),
                                                current_c: Some(current_max),
                                                elapsed_s: Some(elapsed),
                                                timestamp_ms: std::time::SystemTime::now()
                                                    .duration_since(std::time::UNIX_EPOCH)
                                                    .unwrap()
                                                    .as_millis() as u64,
                                            });

                                            if current_max <= threshold {
                                                println!("✅ CPU cooled to within target threshold. Proceeding to Model B.");
                                                // Emit completion event
                                                let _ = window.emit("cooldown_update", CooldownUpdateEvent {
                                                    state: "complete".to_string(),
                                                    baseline_c: Some(baseline),
                                                    margin_c,
                                                    threshold_c: Some(threshold),
                                                    current_c: Some(current_max),
                                                    elapsed_s: Some(elapsed),
                                                    timestamp_ms: std::time::SystemTime::now()
                                                        .duration_since(std::time::UNIX_EPOCH)
                                                        .unwrap()
                                                        .as_millis() as u64,
                                                });
                                                break;
                                            }
                                        }
                                        Err(e) => {
                                            println!("⚠️ Failed to read CPU temperature during cooldown wait: {}. Proceeding without further wait.", e);
                                            // Emit canceled event due to read error
                                            let _ = window.emit("cooldown_update", CooldownUpdateEvent {
                                                state: "canceled".to_string(),
                                                baseline_c: Some(baseline),
                                                margin_c,
                                                threshold_c: Some(baseline + margin_c),
                                                current_c: None,
                                                elapsed_s: Some(start_wait.elapsed().as_secs()),
                                                timestamp_ms: std::time::SystemTime::now()
                                                    .duration_since(std::time::UNIX_EPOCH)
                                                    .unwrap()
                                                    .as_millis() as u64,
                                            });
                                            break;
                                        }
                                    }

                                    if start_wait.elapsed().as_secs() >= MAX_WAIT_SECS {
                                        println!("⏱️ Cooldown wait timed out after {} seconds. Proceeding to Model B.", MAX_WAIT_SECS);
                                        // Emit timeout event
                                        let _ = window.emit("cooldown_update", CooldownUpdateEvent {
                                            state: "timeout".to_string(),
                                            baseline_c: Some(baseline),
                                            margin_c,
                                            threshold_c: Some(baseline + margin_c),
                                            current_c: None,
                                            elapsed_s: Some(MAX_WAIT_SECS),
                                            timestamp_ms: std::time::SystemTime::now()
                                                .duration_since(std::time::UNIX_EPOCH)
                                                .unwrap()
                                                .as_millis() as u64,
                                        });
                                        break;
                                    }

                                    tokio::time::sleep(std::time::Duration::from_millis(POLL_INTERVAL_MS)).await;
                                }
                            } else {
                                println!("ℹ️ No baseline CPU temperature recorded. Skipping cooldown wait.");
                            }
                        }

                        if let Some(model_b) = &config.model_b {
                            dprintln!("🤖 Running inference for Model B (Both mode){}", if disable_telemetry_inner { " (telemetry disabled)" } else { " with telemetry..." });
                            // Reset power calculator for Model B - only when telemetry is enabled
                            if !disable_telemetry_inner {
                                if let Err(e) = command_broadcaster.send(TelemetryCommand::ResetPowerCalculator) {
                                    println!("⚠️ Failed to send power calculator reset command for Model B (Both mode): {}", e);
                                } else {
                                    println!("🔄 Sent power calculator reset command for Model B (Both mode) - energy will reset to 0");
                                }
                            }
                            run_model_inference(&window, model_b, &config.chat_history, "B", telemetry_opt.clone(), config.system_prompt.as_deref()).await?;
                            // Model B is automatically unloaded when it goes out of scope
                        }
                    }
                    _ => {
                        return Err(format!("Invalid target: {}", config.target));
                    }
                }

                println!("🎯 BACKEND: Inference completed - now safe to stop telemetry");

                // Explicitly define the Ok type for the Result
                Ok::<(), String>(())
            })
        })
    };

    // The result from spawn_blocking's JoinHandle is a Result from the thread,
    // which contains another Result from the block_on call.
    let result = match inference_handle.await {
        Ok(Ok(res)) => Ok(res), // Successfully completed, `res` is `Ok(())` from the inner block
        Ok(Err(e)) => Err(e), // `block_on` returned an error from `run_model_inference`
        Err(e) => Err(e.to_string()), // The blocking task panicked
    };
    
    // Stop monitoring and cleanup
    dprintln!("🛑 BACKEND: Stopping telemetry system after inference completion...");
    dprintln!("🛑 BACKEND: Signaling enhanced monitoring to stop...");
    stop_signal.store(true, Ordering::Relaxed);
    // Also stop prewarm monitor if it was used/reused
    if let Some(prewarm_stop) = prewarm_stop_signal_opt {
        prewarm_stop.store(true, Ordering::Relaxed);
    }
    dprintln!("🛑 BACKEND: Aborting monitoring handle if running...");
    if let Some(handle) = monitoring_handle { handle.abort(); }
    // Abort prewarm handle if it exists (safe even if already stopped)
    if let Some(handle) = prewarm_monitoring_handle { handle.abort(); }
    dprintln!("🛑 BACKEND: Aborting event emitter handle if running...");
    if let Some(handle) = event_handle { handle.abort(); }
    dprintln!("🛑 BACKEND: All telemetry tasks have been stopped (or were not started)");
    
    // Clear global stop signal
    {
        if let Ok(mut global_stop) = GLOBAL_STOP_SIGNAL.write() {
            *global_stop = None;
            println!("🛑 Global stop signal cleared");
        }
    }
    
    result
}
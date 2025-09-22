// Contains the core run_model_inference function

use llama_cpp_2::llama_backend::LlamaBackend;
use llama_cpp_2::model::LlamaModel;
use llama_cpp_2::context::params::LlamaContextParams;
use llama_cpp_2::model::params::LlamaModelParams;
use llama_cpp_2::model::{LlamaChatMessage, LlamaChatTemplate};
use llama_cpp_2::llama_batch::LlamaBatch;
use llama_cpp_2::model::{AddBos, Special};
// Note: LlamaSampler now imported via SamplerBuilder
use std::path::PathBuf;
use std::env;
use std::num::NonZeroU32;
use std::sync::atomic::Ordering;
use std::time::Instant;
use tauri::{Emitter, Window};
use encoding_rs;

// Re-import types from parent module  
use crate::{ModelConfig, TelemetryUpdate, TelemetryBroadcaster};
use crate::{TokenEvent, InputTokenEvent, OutputTokenEvent, SystemPromptTokenEvent, GenerationTimeEvent, PowerConsumptionSummaryEvent};
use crate::{CURRENT_TELEMETRY, GLOBAL_STOP_SIGNAL};

// Import the new SamplerBuilder for configurable sampling
use crate::inference::sampler_builder::SamplerBuilder;
use crate::utils::debug::DEBUG_LOGS;

#[allow(unused_macros)]
macro_rules! dprintln {
    ($($arg:tt)*) => {
        if DEBUG_LOGS { println!($($arg)*); }
    }
}

/// Convert Message sequence to LlamaChatMessage format with system prompt integration
fn build_chat_message_sequence(
    chat_history: &[crate::Message],
    system_prompt: Option<&str>,
) -> Result<Vec<LlamaChatMessage>, String> {
    let mut chat_messages = Vec::new();

    // Add system message if provided
    if let Some(system) = system_prompt {
        chat_messages.push(
            LlamaChatMessage::new("system".to_string(), system.to_string())
                .map_err(|e| format!("Failed to create system message: {:?}", e))?
        );
    }

    // Convert conversation history
    for message in chat_history {
        chat_messages.push(
            LlamaChatMessage::new(message.role.clone(), message.content.clone())
                .map_err(|e| format!("Failed to create chat message for role '{}': {:?}", message.role, e))?
        );
    }

    if chat_messages.is_empty() {
        return Err("No messages in conversation history".to_string());
    }

    println!("🎯 CHAT SEQUENCE: Built {} messages for template application", chat_messages.len());
    Ok(chat_messages)
}

/// Apply model's embedded chat template to format conversation
fn apply_model_chat_template(
    model: &LlamaModel,
    chat_messages: &[LlamaChatMessage],
) -> Result<String, String> {
    // Get model's default embedded chat template from GGUF metadata
    let template: LlamaChatTemplate = model.chat_template(None)
        .map_err(|e| format!("Failed to get model's embedded chat template: {:?}", e))?;

    // Apply template to conversation (add_ass=true for generation mode)
    let formatted_prompt = model.apply_chat_template(&template, chat_messages, true)
        .map_err(|e| format!("Failed to apply chat template: {:?}", e))?;

    println!("🎯 TEMPLATE APPLIED: Formatted {} messages into {} character prompt",
             chat_messages.len(), formatted_prompt.len());

    Ok(formatted_prompt)
}

pub async fn run_model_inference(
    window: &Window,
    model_config: &ModelConfig,
    chat_history: &[crate::Message],
    model_label: &str,
    telemetry_broadcaster: Option<TelemetryBroadcaster>,
    system_prompt: Option<&str>,
) -> Result<String, String> {
    println!("=== STARTING INFERENCE for Model {} with {} messages ===", model_label, chat_history.len());
    // Initialize the llama.cpp backend
    let backend = LlamaBackend::init()
        .map_err(|e| format!("Failed to initialize backend: {:?}", e))?;
    
    let model_path = PathBuf::from(&model_config.model_path);
    if !model_path.exists() {
        // Try relative path resolution
        let current_dir = env::current_dir()
            .map_err(|e| format!("Failed to get current directory: {}", e))?;
        
        let mut search_dir = current_dir.clone();
        let mut found_path = None;
        
        for _ in 0..5 {
            let potential_path = search_dir.join(&model_config.model_path);
            if potential_path.exists() {
                found_path = Some(potential_path);
                break;
            }
            if let Some(parent) = search_dir.parent() {
                search_dir = parent.to_path_buf();
            } else {
                break;
            }
        }
        
        let _model_path = found_path.ok_or_else(|| {
            format!("Model file not found at {} or in parent directories", model_config.model_path)
        })?;
    }
    
    // Load model with default parameters
    let model_params = LlamaModelParams::default();
    let model = LlamaModel::load_from_file(&backend, &model_path, &model_params)
        .map_err(|e| format!("Failed to load model: {:?}", e))?;
    
    let n_ctx = model_config.n_ctx.unwrap_or(2048);
    let ctx_params = LlamaContextParams::default()
        .with_n_ctx(Some(NonZeroU32::new(n_ctx).unwrap()));
    
    let mut ctx = model.new_context(&backend, ctx_params)
        .map_err(|e| format!("Failed to create context: {:?}", e))?;
    
    // Phase 3: Efficient system prompt tokenization using already loaded model
    if let Some(system_prompt) = system_prompt {
        let system_tokens = model.str_to_token(system_prompt, AddBos::Never)
            .map_err(|e| format!("Failed to tokenize system prompt: {:?}", e))?;
        
        println!("📊 SYSTEM PROMPT TOKENS: Tokenized '{}' into {} tokens", system_prompt.trim(), system_tokens.len());
        let _ = window.emit("system_prompt_tokens", SystemPromptTokenEvent {
            count: system_tokens.len(),
            timestamp_ms: std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_millis() as u64,
        });
    }
    
    // Phase 3.5: Tokenize only the last user message content for per-message UI token display
    if let Some(last_message) = chat_history.last() {
        let last_tokens = model.str_to_token(&last_message.content, AddBos::Always)
            .map_err(|e| format!("Failed to tokenize last message: {:?}", e))?;
        let _ = window.emit("user_input_tokens", InputTokenEvent {
            count: last_tokens.len(),
            model: model_label.to_string(),
            timestamp_ms: std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_millis() as u64,
        });
    }

    // Phase 4: Convert conversation to chat message format
    let chat_messages = build_chat_message_sequence(chat_history, system_prompt)?;

    // Phase 5: Apply model's embedded chat template
    let formatted_prompt = apply_model_chat_template(&model, &chat_messages)?;

    // Phase 6: Tokenize the formatted conversation
    let tokens_list = model.str_to_token(&formatted_prompt, AddBos::Always)
        .map_err(|e| format!("Failed to tokenize formatted conversation: {:?}", e))?;
    
    // Emit input token count immediately after tokenization
    let input_token_count = tokens_list.len();
    println!("📊 INPUT TOKENS: Model {} formatted conversation ({} messages) into {} tokens",
             model_label, chat_messages.len(), input_token_count);
    let _ = window.emit("input_tokens", InputTokenEvent {
        count: input_token_count,
        model: model_label.to_string(),
        timestamp_ms: std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_millis() as u64,
    });
    
    // Clear the KV cache and create batch (following official example pattern)
    ctx.clear_kv_cache();
    let mut batch = LlamaBatch::new(512, 1);
    
    // Add all tokens to batch, following the official example pattern
    let last_index: i32 = (tokens_list.len() - 1) as i32;
    for (i, token) in (0_i32..).zip(tokens_list.iter()) {
        // llama_decode will output logits only for the last token of the prompt
        let is_last = i == last_index;
        batch.add(*token, i, &[0], is_last)
            .map_err(|e| format!("Failed to add token to batch: {:?}", e))?;
    }
    
    // Decode the initial batch
    ctx.decode(&mut batch)
        .map_err(|e| format!("Failed to decode batch: {:?}", e))?;
    
    // Initialize variables following the official example
    let mut result = String::new();
    let mut n_cur = batch.n_tokens();
    let n_len = tokens_list.len() as i32 + 1024; // prompt + max generation tokens
    let mut _n_decode = 0;
    
    // Timing for TTFT and TPS calculation
    let inference_start = Instant::now();
    let mut first_token_time: Option<Instant> = None;
    let mut last_token_time: Option<Instant> = None;
    let mut tokens_generated = 0;
    
    // Initialize UTF-8 decoder for fallback
    let mut decoder = encoding_rs::UTF_8.new_decoder();
    
    // Validate configuration before creating sampler
    let validation_warnings = SamplerBuilder::validate_config(model_config);
    if !validation_warnings.is_empty() {
        println!("⚠️ Sampling configuration warnings for Model {}: {:?}", model_label, validation_warnings);
        // Note: We continue with warnings, only hard errors would stop execution
    }

    // Create configured sampler from model configuration
    let mut sampler = SamplerBuilder::create_from_config(model_config);

    // Log the configuration for debugging and user feedback
    let config_description = SamplerBuilder::describe_config(model_config);
    println!("🎛️ Model {} using: {}", model_label, config_description);

    // Log detailed parameter values for debugging
    println!("🎛️ Model {} parameters: temp={:?}, top_k={:?}, top_p={:?}, min_p={:?}, repeat_penalty={:?}, repeat_last_n={:?}, freq_penalty={:?}, presence_penalty={:?}",
             model_label,
             model_config.temperature,
             model_config.top_k,
             model_config.top_p,
             model_config.min_p,
             model_config.repeat_penalty,
             model_config.repeat_last_n,
             model_config.frequency_penalty,
             model_config.presence_penalty);
    
    // Main generation loop following official example pattern
    while n_cur <= n_len {
        // Check stop signal before processing each token
        if let Ok(stop_signal_guard) = GLOBAL_STOP_SIGNAL.read() {
            if let Some(stop_signal) = stop_signal_guard.as_ref() {
                if stop_signal.load(Ordering::Relaxed) {
                    println!("🛑 Stop signal detected, halting generation for Model {}", model_label);
                    // Emit stopped event
                    let _ = window.emit("generation_stopped", TokenEvent {
                        token: String::new(),
                        model: model_label.to_string(),
                        finished: true,
                    });
                    break;
                }
            }
        }
        
        // Sample the next token using proper LlamaSampler
        let token = sampler.sample(&ctx, batch.n_tokens() - 1);
        sampler.accept(token);
        
        
        // Check for end of generation using proper method
        if model.is_eog_token(token) {
            break;
        }
        
        let output_bytes = model.token_to_bytes(token, Special::Tokenize)
            .map_err(|e| format!("Failed to convert token to bytes: {:?}", e))?;
        
        // Try simple approach: convert bytes to string directly
        match String::from_utf8(output_bytes.clone()) {
            Ok(output_string) => {
dprintln!("🔍 Token decoded: '{}' (empty: {})", output_string, output_string.is_empty());
                if !output_string.is_empty() {
                    result.push_str(&output_string);
                    tokens_generated += 1;
                    
                    // Record first token time for TTFT calculation
                    if first_token_time.is_none() {
                        let now = Instant::now();
                        first_token_time = Some(now);
                        last_token_time = Some(now);
dprintln!("🚀 TTFT: First token detected! Token: '{}', Tokens generated: {}", output_string, tokens_generated);
                        
                        // Emit TTFT telemetry merged with current hardware data
                        if let Some(broadcaster) = &telemetry_broadcaster {
                            let ttft_ms = inference_start.elapsed().as_millis() as u64;
dprintln!("🚀 TTFT: Calculated TTFT as {}ms", ttft_ms);

                            // Get current telemetry state and merge with TTFT data
                            let telemetry = if let Ok(current) = CURRENT_TELEMETRY.read() {
                                if let Some(base_telemetry) = current.as_ref() {
dprintln!("🔄 TTFT: Merging with existing hardware telemetry");
                                    base_telemetry.with_inference_data(Some(ttft_ms), None, None, Some(model_label.to_string()))
                                } else {
dprintln!("⚠️ TTFT: No current telemetry state available, using empty base");
                                    TelemetryUpdate {
                                        timestamp_ms: std::time::SystemTime::now()
                                            .duration_since(std::time::UNIX_EPOCH)
                                            .unwrap()
                                            .as_millis() as u64,
                                        cpu_power_watts: None,
                                        gpu_power_watts: None,
                                        ane_power_watts: None,
                                        cpu_temp_celsius: None,
                                        gpu_temp_celsius: None,
                                        cpu_freq_mhz: None,
                                        gpu_freq_mhz: None,
                                        ram_usage_gb: None,
                                        thermal_pressure: None,
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
                                        ttft_ms: Some(ttft_ms),
                                        current_tps: None,
                                        instantaneous_tps: None,
                                        generation_time_ms: None,
                                        model: Some(model_label.to_string()),
                                        core_temperatures: None,
                                        // Energy fields (initialized as None, will be filled by PowerCalculator)
                                        total_energy_wh: None,
                                        cpu_energy_wh: None,
                                        gpu_energy_wh: None,
                                        ane_energy_wh: None,
                                        energy_rate_wh_per_token: None,
                                    }
                                }
                            } else {
dprintln!("❌ TTFT: Failed to read current telemetry state");
                                TelemetryUpdate {
                                    timestamp_ms: std::time::SystemTime::now()
                                        .duration_since(std::time::UNIX_EPOCH)
                                        .unwrap()
                                        .as_millis() as u64,
                                    cpu_power_watts: None,
                                    gpu_power_watts: None,
                                    ane_power_watts: None,
                                    cpu_temp_celsius: None,
                                    gpu_temp_celsius: None,
                                    cpu_freq_mhz: None,
                                    gpu_freq_mhz: None,
                                    ram_usage_gb: None,
                                    thermal_pressure: None,
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
                                    ttft_ms: Some(ttft_ms),
                                    current_tps: None,
                                    instantaneous_tps: None,
                                    generation_time_ms: None,
                                        model: Some(model_label.to_string()),
                                    core_temperatures: None,
                                    // Energy fields (initialized as None, will be filled by PowerCalculator)
                                    total_energy_wh: None,
                                    cpu_energy_wh: None,
                                    gpu_energy_wh: None,
                                    ane_energy_wh: None,
                                    energy_rate_wh_per_token: None,
                                }
                            };

dprintln!("🚀 TTFT: Broadcasting merged telemetry: {:?}", telemetry);
                            match broadcaster.send(telemetry) {
                                Ok(receiver_count) => {
dprintln!("🚀 TTFT: ✅ Broadcast successful to {} receivers", receiver_count);
                                }
                                Err(e) => {
dprintln!("🚀 TTFT: ❌ Failed to broadcast TTFT telemetry: {}", e);
                                }
                            }
                        } else {
                            println!("❌ No telemetry broadcaster available for TTFT");
                        }
                    } else {
dprintln!("🔄 Subsequent token: '{}', Tokens generated: {}", output_string, tokens_generated);
                    }
                    
                    // Calculate and emit current TPS
                    if let Some(first_token_instant) = first_token_time {
                        if tokens_generated > 1 {
                            let now = Instant::now();
                            let elapsed_since_first = first_token_instant.elapsed().as_secs_f64();
                            if elapsed_since_first > 0.0 {
                                let current_tps = (tokens_generated - 1) as f64 / elapsed_since_first;

                                // Calculate instantaneous TPS (time between last two tokens)
                                let instantaneous_tps = if let Some(last_instant) = last_token_time {
                                    let time_between_tokens = now.duration_since(last_instant).as_secs_f64();
                                    if time_between_tokens > 0.0 {
                                        Some(1.0 / time_between_tokens)
                                    } else {
                                        None
                                    }
                                } else {
                                    None
                                };

                                // Update last token time for next calculation
                                last_token_time = Some(now);
                                
                                // Emit TPS telemetry merged with current hardware data
                                if let Some(broadcaster) = &telemetry_broadcaster {
                                    // Get current telemetry state and merge with TPS data
                                    let telemetry = if let Ok(current) = CURRENT_TELEMETRY.read() {
                                        if let Some(base_telemetry) = current.as_ref() {
dprintln!("🔄 TPS: Merging with existing hardware telemetry");
                                            base_telemetry.with_inference_data(None, Some(current_tps), instantaneous_tps, Some(model_label.to_string()))
                                        } else {
dprintln!("⚠️ TPS: No current telemetry state available, using empty base");
                                            TelemetryUpdate {
                                                timestamp_ms: std::time::SystemTime::now()
                                                    .duration_since(std::time::UNIX_EPOCH)
                                                    .unwrap()
                                                    .as_millis() as u64,
                                                cpu_power_watts: None,
                                                gpu_power_watts: None,
                                                ane_power_watts: None,
                                                cpu_temp_celsius: None,
                                                gpu_temp_celsius: None,
                                                cpu_freq_mhz: None,
                                                gpu_freq_mhz: None,
                                                ram_usage_gb: None,
                                                thermal_pressure: None,
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
                                                ttft_ms: None,
                                                current_tps: Some(current_tps),
                                                instantaneous_tps,
                                                generation_time_ms: None,
                                        model: Some(model_label.to_string()),
                                                core_temperatures: None,
                                                // Energy fields (initialized as None, will be filled by PowerCalculator)
                                                total_energy_wh: None,
                                                cpu_energy_wh: None,
                                                gpu_energy_wh: None,
                                                ane_energy_wh: None,
                                                energy_rate_wh_per_token: None,
                                            }
                                        }
                                    } else {
dprintln!("❌ TPS: Failed to read current telemetry state");
                                        TelemetryUpdate {
                                            timestamp_ms: std::time::SystemTime::now()
                                                .duration_since(std::time::UNIX_EPOCH)
                                                .unwrap()
                                                .as_millis() as u64,
                                            cpu_power_watts: None,
                                            gpu_power_watts: None,
                                            ane_power_watts: None,
                                            cpu_temp_celsius: None,
                                            gpu_temp_celsius: None,
                                            cpu_freq_mhz: None,
                                            gpu_freq_mhz: None,
                                            ram_usage_gb: None,
                                            thermal_pressure: None,
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
                                            ttft_ms: None,
                                            current_tps: Some(current_tps),
                                            instantaneous_tps,
                                            generation_time_ms: None,
                                        model: Some(model_label.to_string()),
                                            core_temperatures: None,
                                            // Energy fields (initialized as None, will be filled by PowerCalculator)
                                            total_energy_wh: None,
                                            cpu_energy_wh: None,
                                            gpu_energy_wh: None,
                                            ane_energy_wh: None,
                                            energy_rate_wh_per_token: None,
                                        }
                                    };

dprintln!("📈 TPS: Broadcasting merged telemetry: {:?}", telemetry);
dprintln!("📈 TPS: Pre-broadcast receiver count: {}", broadcaster.receiver_count());
                                    match broadcaster.send(telemetry) {
                                        Ok(receiver_count) => {
dprintln!("📈 TPS: ✅ Broadcast successful to {} receivers", receiver_count);
dprintln!("📈 TPS: Post-broadcast receiver count: {}", broadcaster.receiver_count());
                                        }
                                        Err(e) => {
dprintln!("📈 TPS: ❌ Failed to broadcast TPS telemetry: {}", e);
                                        }
                                    }
                                }
                            }
                        }
                    }
                    
                    // Emit token event to frontend
dprintln!("BACKEND EMIT: Model: {}, Token: '{}'", model_label, output_string);
                    let _ = window.emit("new_token", TokenEvent {
                        token: output_string,
                        model: model_label.to_string(),
                        finished: false,
                    });
                } else {
                    println!("🔍 Skipping empty token");
                }
            }
            Err(_) => {
                // For invalid UTF-8, fall back to incremental decoder
                let mut output_string = String::with_capacity(32);
                let (_decode_result, _bytes_read, _had_errors) = decoder.decode_to_string(&output_bytes, &mut output_string, false);
                
dprintln!("🔍 Fallback token decoded: '{}' (empty: {})", output_string, output_string.is_empty());
                if !output_string.is_empty() {
                    result.push_str(&output_string);
                    tokens_generated += 1;
                    
                    // Record first token time for TTFT calculation
                    if first_token_time.is_none() {
                        let now = Instant::now();
                        first_token_time = Some(now);
                        last_token_time = Some(now);
dprintln!("🚀 TTFT: First token detected! Token: '{}', Tokens generated: {}", output_string, tokens_generated);
                        
                        // Emit TTFT telemetry merged with current hardware data
                        if let Some(broadcaster) = &telemetry_broadcaster {
                            let ttft_ms = inference_start.elapsed().as_millis() as u64;
dprintln!("🚀 TTFT: Calculated TTFT as {}ms", ttft_ms);

                            // Get current telemetry state and merge with TTFT data
                            let telemetry = if let Ok(current) = CURRENT_TELEMETRY.read() {
                                if let Some(base_telemetry) = current.as_ref() {
dprintln!("🔄 TTFT: Merging with existing hardware telemetry");
                                    base_telemetry.with_inference_data(Some(ttft_ms), None, None, Some(model_label.to_string()))
                                } else {
dprintln!("⚠️ TTFT: No current telemetry state available, using empty base");
                                    TelemetryUpdate {
                                        timestamp_ms: std::time::SystemTime::now()
                                            .duration_since(std::time::UNIX_EPOCH)
                                            .unwrap()
                                            .as_millis() as u64,
                                        cpu_power_watts: None,
                                        gpu_power_watts: None,
                                        ane_power_watts: None,
                                        cpu_temp_celsius: None,
                                        gpu_temp_celsius: None,
                                        cpu_freq_mhz: None,
                                        gpu_freq_mhz: None,
                                        ram_usage_gb: None,
                                        thermal_pressure: None,
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
                                        ttft_ms: Some(ttft_ms),
                                        current_tps: None,
                                        instantaneous_tps: None,
                                        generation_time_ms: None,
                                        model: Some(model_label.to_string()),
                                        core_temperatures: None,
                                        // Energy fields (initialized as None, will be filled by PowerCalculator)
                                        total_energy_wh: None,
                                        cpu_energy_wh: None,
                                        gpu_energy_wh: None,
                                        ane_energy_wh: None,
                                        energy_rate_wh_per_token: None,
                                    }
                                }
                            } else {
dprintln!("❌ TTFT: Failed to read current telemetry state");
                                TelemetryUpdate {
                                    timestamp_ms: std::time::SystemTime::now()
                                        .duration_since(std::time::UNIX_EPOCH)
                                        .unwrap()
                                        .as_millis() as u64,
                                    cpu_power_watts: None,
                                    gpu_power_watts: None,
                                    ane_power_watts: None,
                                    cpu_temp_celsius: None,
                                    gpu_temp_celsius: None,
                                    cpu_freq_mhz: None,
                                    gpu_freq_mhz: None,
                                    ram_usage_gb: None,
                                    thermal_pressure: None,
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
                                    ttft_ms: Some(ttft_ms),
                                    current_tps: None,
                                    instantaneous_tps: None,
                                    generation_time_ms: None,
                                        model: Some(model_label.to_string()),
                                    core_temperatures: None,
                                    // Energy fields (initialized as None, will be filled by PowerCalculator)
                                    total_energy_wh: None,
                                    cpu_energy_wh: None,
                                    gpu_energy_wh: None,
                                    ane_energy_wh: None,
                                    energy_rate_wh_per_token: None,
                                }
                            };

dprintln!("🚀 TTFT: Broadcasting merged telemetry: {:?}", telemetry);
                            match broadcaster.send(telemetry) {
                                Ok(receiver_count) => {
dprintln!("🚀 TTFT: ✅ Broadcast successful to {} receivers", receiver_count);
                                }
                                Err(e) => {
dprintln!("🚀 TTFT: ❌ Failed to broadcast TTFT telemetry: {}", e);
                                }
                            }
                        } else {
                            println!("❌ No telemetry broadcaster available for TTFT");
                        }
                    } else {
dprintln!("🔄 Subsequent token: '{}', Tokens generated: {}", output_string, tokens_generated);
                    }
                    
                    // Calculate and emit current TPS
                    if let Some(first_token_instant) = first_token_time {
                        if tokens_generated > 1 {
                            let now = Instant::now();
                            let elapsed_since_first = first_token_instant.elapsed().as_secs_f64();
                            if elapsed_since_first > 0.0 {
                                let current_tps = (tokens_generated - 1) as f64 / elapsed_since_first;

                                // Calculate instantaneous TPS (time between last two tokens)
                                let instantaneous_tps = if let Some(last_instant) = last_token_time {
                                    let time_between_tokens = now.duration_since(last_instant).as_secs_f64();
                                    if time_between_tokens > 0.0 {
                                        Some(1.0 / time_between_tokens)
                                    } else {
                                        None
                                    }
                                } else {
                                    None
                                };

                                // Update last token time for next calculation
                                last_token_time = Some(now);
                                
                                // Emit TPS telemetry merged with current hardware data
                                if let Some(broadcaster) = &telemetry_broadcaster {
                                    // Get current telemetry state and merge with TPS data
                                    let telemetry = if let Ok(current) = CURRENT_TELEMETRY.read() {
                                        if let Some(base_telemetry) = current.as_ref() {
dprintln!("🔄 TPS: Merging with existing hardware telemetry");
                                            base_telemetry.with_inference_data(None, Some(current_tps), instantaneous_tps, Some(model_label.to_string()))
                                        } else {
dprintln!("⚠️ TPS: No current telemetry state available, using empty base");
                                            TelemetryUpdate {
                                                timestamp_ms: std::time::SystemTime::now()
                                                    .duration_since(std::time::UNIX_EPOCH)
                                                    .unwrap()
                                                    .as_millis() as u64,
                                                cpu_power_watts: None,
                                                gpu_power_watts: None,
                                                ane_power_watts: None,
                                                cpu_temp_celsius: None,
                                                gpu_temp_celsius: None,
                                                cpu_freq_mhz: None,
                                                gpu_freq_mhz: None,
                                                ram_usage_gb: None,
                                                thermal_pressure: None,
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
                                                ttft_ms: None,
                                                current_tps: Some(current_tps),
                                                instantaneous_tps,
                                                generation_time_ms: None,
                                        model: Some(model_label.to_string()),
                                                core_temperatures: None,
                                                // Energy fields (initialized as None, will be filled by PowerCalculator)
                                                total_energy_wh: None,
                                                cpu_energy_wh: None,
                                                gpu_energy_wh: None,
                                                ane_energy_wh: None,
                                                energy_rate_wh_per_token: None,
                                            }
                                        }
                                    } else {
dprintln!("❌ TPS: Failed to read current telemetry state");
                                        TelemetryUpdate {
                                            timestamp_ms: std::time::SystemTime::now()
                                                .duration_since(std::time::UNIX_EPOCH)
                                                .unwrap()
                                                .as_millis() as u64,
                                            cpu_power_watts: None,
                                            gpu_power_watts: None,
                                            ane_power_watts: None,
                                            cpu_temp_celsius: None,
                                            gpu_temp_celsius: None,
                                            cpu_freq_mhz: None,
                                            gpu_freq_mhz: None,
                                            ram_usage_gb: None,
                                            thermal_pressure: None,
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
                                            ttft_ms: None,
                                            current_tps: Some(current_tps),
                                            instantaneous_tps,
                                            generation_time_ms: None,
                                        model: Some(model_label.to_string()),
                                            core_temperatures: None,
                                            // Energy fields (initialized as None, will be filled by PowerCalculator)
                                            total_energy_wh: None,
                                            cpu_energy_wh: None,
                                            gpu_energy_wh: None,
                                            ane_energy_wh: None,
                                            energy_rate_wh_per_token: None,
                                        }
                                    };

dprintln!("📈 TPS: Broadcasting merged telemetry: {:?}", telemetry);
dprintln!("📈 TPS: Pre-broadcast receiver count: {}", broadcaster.receiver_count());
                                    match broadcaster.send(telemetry) {
                                        Ok(receiver_count) => {
dprintln!("📈 TPS: ✅ Broadcast successful to {} receivers", receiver_count);
dprintln!("📈 TPS: Post-broadcast receiver count: {}", broadcaster.receiver_count());
                                        }
                                        Err(e) => {
dprintln!("📈 TPS: ❌ Failed to broadcast TPS telemetry: {}", e);
                                        }
                                    }
                                }
                            }
                        }
                    }
                    
dprintln!("BACKEND EMIT (fallback): Model: {}, Token: '{}'", model_label, output_string);
                    let _ = window.emit("new_token", TokenEvent {
                        token: output_string,
                        model: model_label.to_string(),
                        finished: false,
                    });
                } else {
                    println!("🔍 Skipping empty fallback token");
                }
            }
        }
        
        // Prepare for next iteration following official pattern
        batch.clear();
        batch.add(token, n_cur, &[0], true)
            .map_err(|e| format!("Failed to add token to batch: {:?}", e))?;
        
        n_cur += 1;
        
        // Decode the batch for next iteration
        ctx.decode(&mut batch)
            .map_err(|e| format!("Failed to decode batch: {:?}", e))?;
        
        _n_decode += 1;
    }
    
    // No need to flush when using String::from_utf8 approach
    
    // Phase 2: Emit output token count after generation completes
    println!("📊 OUTPUT TOKENS: Model {} generated {} tokens", model_label, tokens_generated);
    let _ = window.emit("output_tokens", OutputTokenEvent {
        count: tokens_generated,
        model: model_label.to_string(),
        timestamp_ms: std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_millis() as u64,
    });
    
    // Phase 3: Emit total generation time
    let total_generation_time_ms = inference_start.elapsed().as_millis() as u64;
    println!("⏱️ GENERATION TIME: Model {} took {} ms total", model_label, total_generation_time_ms);
    let _ = window.emit("generation_time", GenerationTimeEvent {
        generation_time_ms: total_generation_time_ms,
        model: model_label.to_string(),
        timestamp_ms: std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_millis() as u64,
    });
    
    // Phase 4: Emit final power consumption summary with energy per token
    // Only emit when telemetry was enabled for this run (i.e., a broadcaster was provided)
    if telemetry_broadcaster.is_some() {
        if let Ok(current) = CURRENT_TELEMETRY.read() {
            if let Some(telemetry) = current.as_ref() {
                if let (Some(total_energy), Some(cpu_energy), Some(gpu_energy), Some(ane_energy)) = 
                    (telemetry.total_energy_wh, telemetry.cpu_energy_wh, telemetry.gpu_energy_wh, telemetry.ane_energy_wh) {
                    
                    // Calculate energy per token
                    let energy_per_token = if tokens_generated > 0 {
                        Some(total_energy / tokens_generated as f64)
                    } else {
                        None
                    };
                    
                    println!("📊 ENERGY SUMMARY: Model {} - Total: {:.6}Wh, CPU: {:.6}Wh, GPU: {:.6}Wh, ANE: {:.6}Wh, Per Token: {:?}Wh", 
                             model_label, total_energy, cpu_energy, gpu_energy, ane_energy, energy_per_token);
                             
                    let _ = window.emit("power_consumption_summary", PowerConsumptionSummaryEvent {
                        total_energy_wh: total_energy,
                        cpu_energy_wh: cpu_energy,
                        gpu_energy_wh: gpu_energy,
                        ane_energy_wh: ane_energy,
                        energy_per_token_wh: energy_per_token,
                        model: model_label.to_string(),
                        timestamp_ms: std::time::SystemTime::now()
                            .duration_since(std::time::UNIX_EPOCH)
                            .unwrap()
                            .as_millis() as u64,
                    });
                }
            }
        }
    }
    
    // Emit final event indicating completion
    let _ = window.emit("new_token", TokenEvent {
        token: String::new(),
        model: model_label.to_string(),
        finished: true,
    });
    
    Ok(result)
}

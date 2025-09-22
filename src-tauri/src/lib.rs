use tauri::Manager;

// Module declarations for Phase 1 refactoring
pub mod commands;
pub mod hardware;
pub mod inference;
pub mod telemetry;
pub mod utils;

// Add persistence module
pub mod persistence;

// Re-export persistence commands for clean interface
pub use persistence::{
    save_session, get_saved_sessions, load_session,
    delete_saved_session, get_session_list, decompress_telemetry
};







// Re-export from hardware temperature module - Priority 4.2
pub use hardware::temperature::{
    read_core_temperatures, TemperatureInfo, CoreTemperatureData, 
    ThermalTrend, IOHIDTemperatureSensors, TemperatureHistory
};

// Re-export from hardware cpu_monitor module - Priority 4.3
pub use hardware::cpu_monitor::{
    CpuUtilizationMonitor, AppleSiliconInfo, DetectionMethod
};

// Re-export from hardware macmon module - Priority 4.4
pub use hardware::macmon::{
    MacmonOutput, MemoryInfo, start_macmon_monitoring
};

// Re-export from telemetry types module - Priority 4.5
pub use telemetry::types::{
    TelemetryUpdate, TelemetryBroadcaster, ModelConfig, Message, GenerationConfig,
    TokenEvent, InputTokenEvent, OutputTokenEvent, SystemPromptTokenEvent, GenerationTimeEvent,
    PowerConsumptionSummaryEvent, TelemetryCommand, TelemetryCommandBroadcaster
};

// Re-export from telemetry processor module - Step 4: Global State Migration
pub use telemetry::processor::{CURRENT_TELEMETRY, GLOBAL_STOP_SIGNAL};

// Re-export from hardware module  
pub use hardware::start_enhanced_monitoring;


// Re-export from commands utils module - Priority 4.6
pub use commands::utils::{greet, stop_generation};



// Re-export from inference module
pub use inference::run_model_inference;

// Re-export sampling functionality
pub use inference::sampler_builder::SamplerBuilder;

// Re-export from commands module
pub use commands::generation::run_generation_turn;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            // Initialize database
            let app_data_dir = app.path().app_data_dir()
                .expect("Failed to get app data directory");

            std::fs::create_dir_all(&app_data_dir).ok();

            let db_path = app_data_dir.join("sessions.sqlite");
            let session_db = persistence::database::SessionDatabase::new(&db_path)
                .expect("Failed to initialize session database");

            app.manage(session_db);

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // Existing commands
            commands::utils::greet,
            commands::generation::run_generation_turn,
            commands::utils::stop_generation,
            // New persistence commands
            persistence::save_session,
            persistence::get_saved_sessions,
            persistence::load_session,
            persistence::delete_saved_session,
            persistence::get_session_list,
            persistence::decompress_telemetry
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

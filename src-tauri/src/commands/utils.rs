use std::sync::atomic::Ordering;

use crate::GLOBAL_STOP_SIGNAL;

#[tauri::command]
pub fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
pub fn stop_generation() -> Result<(), String> {
    println!("🛑 Stop generation command received");
    
    // Signal the current generation to stop
    if let Ok(stop_signal_guard) = GLOBAL_STOP_SIGNAL.read() {
        if let Some(stop_signal) = stop_signal_guard.as_ref() {
            stop_signal.store(true, Ordering::Relaxed);
            println!("🛑 Stop signal set to true");
            return Ok(());
        }
    }
    
    println!("⚠️ No active generation to stop");
    Ok(())
}
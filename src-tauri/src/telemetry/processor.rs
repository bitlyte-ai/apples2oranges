// Telemetry processor module - Step 4: Global State Migration
// Contains global state management for telemetry and generation control

use std::sync::{Arc, atomic::AtomicBool, RwLock};

// Import telemetry data structures from types module
use crate::telemetry::types::TelemetryUpdate;

// Shared state for current telemetry data
pub static CURRENT_TELEMETRY: RwLock<Option<TelemetryUpdate>> = RwLock::new(None);

// Global stop signal for generation control
pub static GLOBAL_STOP_SIGNAL: RwLock<Option<Arc<AtomicBool>>> = RwLock::new(None);
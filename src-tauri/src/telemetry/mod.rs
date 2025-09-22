// Telemetry module - Priority 4.5 expansion
// Contains telemetry data structures and event types

pub mod types;
pub mod processor;
pub mod power_calculator;

// Re-export all types for external access
pub use types::*;
pub use power_calculator::{PowerCalculator, PowerConsumptionSummary};

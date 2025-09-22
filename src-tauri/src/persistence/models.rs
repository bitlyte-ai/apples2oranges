use serde::{Deserialize, Serialize};
use uuid::Uuid;
use chrono::Utc;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SavedSession {
    pub id: Option<i64>,
    pub uuid: String,
    pub name: String,
    pub session_data: serde_json::Value,
    pub compression_type: String,
    pub original_size: Option<i64>,
    pub created_at: i64,
    pub updated_at: i64,
}

#[derive(Debug, Deserialize)]
pub struct CreateSessionRequest {
    pub name: String,
    pub session_data: serde_json::Value,
}

impl SavedSession {
    pub fn new(name: String, session_data: serde_json::Value) -> Self {
        let now = Utc::now().timestamp();

        SavedSession {
            id: None,
            uuid: Uuid::new_v4().to_string(),
            name,
            session_data,
            compression_type: "none".to_string(),
            original_size: None,
            created_at: now,
            updated_at: now,
        }
    }
}

// Validation for session data
pub fn validate_session_data(data: &serde_json::Value) -> Result<(), String> {
    let obj = data.as_object().ok_or("Session data must be an object")?;

    // Validate required fields
    if !obj.contains_key("chat_history") && !obj.contains_key("telemetry_data") {
        return Err("Session must contain either chat_history or telemetry_data".to_string());
    }

    // Validate schema version
    if let Some(version) = obj.get("schema_version") {
        if !version.is_number() {
            return Err("Schema version must be a number".to_string());
        }
    }

    Ok(())
}
pub mod database;
pub mod compression;
pub mod models;

use tauri::State;
use crate::persistence::{database::SessionDatabase, models::*};

#[tauri::command]
pub async fn save_session(
    db: State<'_, SessionDatabase>,
    request: CreateSessionRequest
) -> Result<SavedSession, String> {
    db.save_session(request).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_saved_sessions(
    db: State<'_, SessionDatabase>
) -> Result<Vec<SavedSession>, String> {
    db.get_all_sessions().map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn load_session(
    db: State<'_, SessionDatabase>,
    uuid: String
) -> Result<Option<SavedSession>, String> {
    db.load_session(&uuid).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn delete_saved_session(
    db: State<'_, SessionDatabase>,
    uuid: String
) -> Result<bool, String> {
    db.delete_session(&uuid).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_session_list(
    db: State<'_, SessionDatabase>
) -> Result<Vec<(String, String, i64, Option<i64>)>, String> {
    db.get_session_list().map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn decompress_telemetry(
    compressed_data: serde_json::Value
) -> Result<Vec<serde_json::Value>, String> {
    use crate::persistence::compression::decompress_telemetry_data;
    decompress_telemetry_data(&compressed_data).map_err(|e| e.to_string())
}

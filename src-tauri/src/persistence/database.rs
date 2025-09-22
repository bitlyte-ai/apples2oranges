use rusqlite::{Connection, params, Result as SqlResult};
use std::path::Path;
use std::sync::Mutex;

pub struct SessionDatabase {
    conn: Mutex<Connection>,
}

impl SessionDatabase {
    pub fn new(db_path: &Path) -> SqlResult<Self> {
        let conn = Connection::open(db_path)?;

        // Optimize for document storage
        conn.execute_batch("
            PRAGMA journal_mode=WAL;
            PRAGMA synchronous=NORMAL;
            PRAGMA cache_size=10000;
            PRAGMA temp_store=MEMORY;
            PRAGMA mmap_size=268435456;
        ")?;

        // Create schema with JSONB support
        conn.execute("
            CREATE TABLE IF NOT EXISTS saved_sessions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                uuid TEXT UNIQUE NOT NULL,
                name TEXT NOT NULL,
                session_data BLOB NOT NULL,
                compression_type TEXT DEFAULT 'none',
                original_size INTEGER,
                created_at INTEGER NOT NULL,
                updated_at INTEGER NOT NULL
            );
        ", [])?;

        // Performance indexes
        conn.execute("CREATE INDEX IF NOT EXISTS idx_sessions_created_at ON saved_sessions(created_at DESC);", [])?;
        conn.execute("CREATE INDEX IF NOT EXISTS idx_sessions_name ON saved_sessions(name COLLATE NOCASE);", [])?;
        conn.execute("CREATE INDEX IF NOT EXISTS idx_sessions_uuid ON saved_sessions(uuid);", [])?;

        Ok(SessionDatabase {
            conn: Mutex::new(conn),
        })
    }

    pub fn with_connection<F, R>(&self, f: F) -> SqlResult<R>
    where
        F: FnOnce(&Connection) -> SqlResult<R>,
    {
        let conn = self.conn.lock().unwrap();
        f(&*conn)
    }
}

use crate::persistence::{models::*, compression::*};

impl SessionDatabase {
    pub fn save_session(&self, request: CreateSessionRequest) -> SqlResult<SavedSession> {
        self.with_connection(|conn| {
            // Validate session data
            validate_session_data(&request.session_data)
                .map_err(|e| rusqlite::Error::InvalidColumnName(e))?;

            let mut session = SavedSession::new(request.name, request.session_data.clone());

            // Compress large telemetry data if present
            let processed_data = if let Some(telemetry) = request.session_data.get("telemetry_data") {
                if let Some(telemetry_array) = telemetry.as_array() {
                match compress_telemetry_data(telemetry_array) {
                    Ok(compressed) => {
                        session.compression_type = "lz4".to_string();
                        session.original_size = Some(serde_json::to_string(&telemetry).unwrap().len() as i64);

                        let mut modified_data = request.session_data.clone();
                        modified_data.as_object_mut().unwrap().insert("telemetry_data".to_string(), compressed);
                        modified_data
                    }
                    Err(_) => request.session_data.clone()
                }
                } else {
                    request.session_data.clone()
                }
            } else {
                request.session_data.clone()
            };

            // Store as JSON text
            conn.execute(
                "
                INSERT INTO saved_sessions (uuid, name, session_data, compression_type, original_size, created_at, updated_at)
                VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)
                ",
                params![
                    session.uuid,
                    session.name,
                    serde_json::to_string(&processed_data).unwrap(),
                    session.compression_type,
                    session.original_size,
                    session.created_at,
                    session.updated_at
                ],
            )?;

            session.id = Some(conn.last_insert_rowid());
            session.session_data = processed_data;

            Ok(session)
        })
    }

    pub fn get_all_sessions(&self) -> SqlResult<Vec<SavedSession>> {
        self.with_connection(|conn| {
            let mut stmt = conn.prepare(
                "
                SELECT id, uuid, name, session_data, compression_type, original_size, created_at, updated_at
                FROM saved_sessions
                ORDER BY updated_at DESC
                ",
            )?;

            let session_iter = stmt.query_map([], |row| {
                Ok(SavedSession {
                    id: Some(row.get(0)?),
                    uuid: row.get(1)?,
                    name: row.get(2)?,
                    session_data: serde_json::from_str(&row.get::<_, String>(3)?).unwrap(),
                    compression_type: row.get(4)?,
                    original_size: row.get(5)?,
                    created_at: row.get(6)?,
                    updated_at: row.get(7)?,
                })
            })?;

            session_iter.collect()
        })
    }

    pub fn load_session(&self, uuid: &str) -> SqlResult<Option<SavedSession>> {
        self.with_connection(|conn| {
            let mut stmt = conn.prepare(
                "
                SELECT id, uuid, name, session_data, compression_type, original_size, created_at, updated_at
                FROM saved_sessions
                WHERE uuid = ?1
                ",
            )?;

            let mut session_iter = stmt.query_map([uuid], |row| {
                let session = SavedSession {
                    id: Some(row.get(0)?),
                    uuid: row.get(1)?,
                    name: row.get(2)?,
                    session_data: serde_json::from_str(&row.get::<_, String>(3)?).unwrap(),
                    compression_type: row.get(4)?,
                    original_size: row.get(5)?,
                    created_at: row.get(6)?,
                    updated_at: row.get(7)?,
                };

                // Decompress telemetry data if needed
                if session.compression_type == "lz4" {
                    if let Some(_telemetry_data) = session.session_data.get("telemetry_data") {
                        // Placeholder for potential future decompression logic on load if needed
                    }
                }

                Ok(session)
            })?;

            match session_iter.next() {
                Some(session) => Ok(Some(session?)),
                None => Ok(None),
            }
        })
    }

    pub fn delete_session(&self, uuid: &str) -> SqlResult<bool> {
        self.with_connection(|conn| {
            let affected = conn.execute("DELETE FROM saved_sessions WHERE uuid = ?1", [uuid])?;
            Ok(affected > 0)
        })
    }

    pub fn get_session_list(&self) -> SqlResult<Vec<(String, String, i64, Option<i64>)>> {
        self.with_connection(|conn| {
            let mut stmt = conn.prepare(
                "
                SELECT uuid, name, created_at, original_size
                FROM saved_sessions
                ORDER BY updated_at DESC
                ",
            )?;

            let session_iter = stmt.query_map([], |row| {
                Ok((
                    row.get::<_, String>(0)?,     // uuid
                    row.get::<_, String>(1)?,     // name
                    row.get::<_, i64>(2)?,        // created_at
                    row.get::<_, Option<i64>>(3)?, // original_size
                ))
            })?;

            session_iter.collect()
        })
    }
}
import { invoke } from '@tauri-apps/api/core';

export interface SavedSession {
  id?: number;
  uuid: string;
  name: string;
  session_data: any;
  compression_type: string;
  original_size?: number;
  created_at: number;
  updated_at: number;
}

export interface CreateSessionRequest {
  name: string;
  session_data: any;
}

/**
 * Service layer for session persistence via SQLite database
 * Provides abstraction over Tauri commands for database operations
 */
export class SessionPersistence {
  /**
   * Save current session to database
   * @param name Session name
   * @param sessionData Complete session data including chat, config, telemetry
   * @returns Saved session with generated UUID
   */
  static async saveCurrentSession(name: string, sessionData: any): Promise<SavedSession> {
    return await invoke('save_session', {
      request: { name, session_data: sessionData }
    });
  }

  /**
   * Get all saved sessions from database
   * @returns Array of all saved sessions ordered by update time
   */
  static async getSavedSessions(): Promise<SavedSession[]> {
    return await invoke('get_saved_sessions');
  }

  /**
   * Load specific session by UUID
   * @param uuid Session UUID
   * @returns Session data or null if not found
   */
  static async loadSession(uuid: string): Promise<SavedSession | null> {
    return await invoke('load_session', { uuid });
  }

  /**
   * Delete session by UUID
   * @param uuid Session UUID
   * @returns True if session was deleted, false if not found
   */
  static async deleteSession(uuid: string): Promise<boolean> {
    return await invoke('delete_saved_session', { uuid });
  }

  /**
   * Get lightweight session list for UI display
   * @returns Array of session metadata (uuid, name, created_at, size)
   */
  static async getSessionList(): Promise<Array<{
    uuid: string;
    name: string;
    created_at: number;
    original_size?: number;
  }>> {
    const result = await invoke('get_session_list');
    
    // Transform tuple array to object array for better type safety
    if (Array.isArray(result)) {
      return (result as [string, string, number, number | null][]).map(([uuid, name, created_at, original_size]) => ({
        uuid,
        name,
        created_at,
        original_size: original_size || undefined
      }));
    }
    
    return [];
  }
}
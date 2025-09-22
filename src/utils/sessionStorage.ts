import type { TelemetrySession, TelemetryDataPoint, Message } from '../types/telemetry';

// Simple in-memory storage for demo purposes
// In a real application, you might use IndexedDB, localStorage, or a backend API
class SessionStorageManager {
  private sessions: Map<string, TelemetrySession> = new Map();
  private subscribers: Set<(sessions: TelemetrySession[]) => void> = new Set();

  // Add a session
  addSession(session: TelemetrySession): void {
    this.sessions.set(session.id, session);
    this.notifySubscribers();
  }

  // Get all sessions
  getSessions(): TelemetrySession[] {
    return Array.from(this.sessions.values()).sort((a, b) => b.timestamp - a.timestamp);
  }

  // Get a specific session by ID
  getSession(id: string): TelemetrySession | undefined {
    return this.sessions.get(id);
  }

  // Remove a session
  removeSession(id: string): void {
    this.sessions.delete(id);
    this.notifySubscribers();
  }

  // Clear all sessions
  clearSessions(): void {
    this.sessions.clear();
    this.notifySubscribers();
  }

  // Subscribe to session changes
  subscribe(callback: (sessions: TelemetrySession[]) => void): () => void {
    this.subscribers.add(callback);
    
    // Return unsubscribe function
    return () => {
      this.subscribers.delete(callback);
    };
  }

  // Notify all subscribers of changes
  private notifySubscribers(): void {
    const sessions = this.getSessions();
    this.subscribers.forEach(callback => callback(sessions));
  }

  // Create a session from telemetry data
  createSessionFromData(
    data: TelemetryDataPoint[], 
    modelInfo: { model_a?: string; model_b?: string } = {},
    sessionName?: string,
    chatHistory?: Message[],
    systemPrompt?: string
  ): TelemetrySession {
    if (data.length === 0) {
      throw new Error('Cannot create session from empty data');
    }

    // Generate session ID and name
    const sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const timestamp = Date.now();
    const finalSessionName = sessionName || `Session ${new Date(timestamp).toLocaleString()}`;

    // Calculate summary statistics
    const duration = data[data.length - 1].timestamp - data[0].timestamp;
    const validTpsValues = data.map(d => d.tps).filter(tps => tps !== null && tps > 0) as number[];
    const avgTps = validTpsValues.length > 0 
      ? validTpsValues.reduce((sum, tps) => sum + tps, 0) / validTpsValues.length 
      : 0;

    const validCpuTemps = data.map(d => d.cpu_temp_avg || d.cpu_temp).filter(temp => temp !== null) as number[];
    const peakCpuTemp = validCpuTemps.length > 0 ? Math.max(...validCpuTemps) : 0;

    // Calculate average power consumption
    const validPowerValues = data.map(d => {
      const cpu = d.cpu_power || 0;
      const gpu = d.gpu_power || 0;
      const ane = d.ane_power || 0;
      return cpu + gpu + ane;
    }).filter(power => power > 0);
    
    const avgPowerConsumption = validPowerValues.length > 0
      ? validPowerValues.reduce((sum, power) => sum + power, 0) / validPowerValues.length
      : 0;

    // Calculate model performance metrics
    const modelPerformance: { [model: string]: { ttft_ms: number; avg_tps: number } } = {};
    
    // Group data by model
    const modelData: { [model: string]: TelemetryDataPoint[] } = {};
    data.forEach(point => {
      if (point.model) {
        if (!modelData[point.model]) {
          modelData[point.model] = [];
        }
        modelData[point.model].push(point);
      }
    });

    // Calculate TTFT and average TPS for each model
    Object.entries(modelData).forEach(([model, modelPoints]) => {
      const tpsValues = modelPoints.map(p => p.tps).filter(tps => tps !== null && tps > 0) as number[];
      const avgModelTps = tpsValues.length > 0 
        ? tpsValues.reduce((sum, tps) => sum + tps, 0) / tpsValues.length 
        : 0;

      // TTFT would typically be measured from first request to first token
      // For demo purposes, we'll use a placeholder or derive from existing data
      const firstTokenPoint = modelPoints.find(p => p.instantaneous_tps !== null);
      const ttft = firstTokenPoint && modelPoints.length > 0 ? firstTokenPoint.timestamp - modelPoints[0].timestamp : 0;

      modelPerformance[model] = {
        ttft_ms: ttft,
        avg_tps: avgModelTps
      };
    });

    // Create the session
    const session: TelemetrySession = {
      id: sessionId,
      name: finalSessionName,
      timestamp,
      model_info: modelInfo,
      data: [...data], // Create a copy of the data
      summary: {
        duration_ms: duration,
        total_tokens: validTpsValues.reduce((sum, tps, index) => {
          // Estimate tokens based on TPS and time interval (rough approximation)
          const nextIndex = index + 1;
          if (nextIndex < data.length) {
            const timeInterval = (data[nextIndex].timestamp - data[index].timestamp) / 1000; // seconds
            return sum + (tps * timeInterval);
          }
          return sum;
        }, 0),
        avg_tps: avgTps,
        peak_cpu_temp: peakCpuTemp,
        avg_power_consumption: avgPowerConsumption,
        model_performance: modelPerformance
      },
      // Include chat conversation data if provided
      chat_history: chatHistory ? [...chatHistory] : undefined,
      system_prompt: systemPrompt || undefined
    };

    this.addSession(session);
    return session;
  }

  // Update session data (useful for adding more data points to an ongoing session)
  updateSessionData(sessionId: string, additionalData: TelemetryDataPoint[]): void {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    // Append new data points
    session.data.push(...additionalData);

    // Recalculate summary (this is a simplified version - you might want to optimize this)
    const data = session.data;
    const duration = data[data.length - 1].timestamp - data[0].timestamp;
    const validTpsValues = data.map(d => d.tps).filter(tps => tps !== null && tps > 0) as number[];
    const avgTps = validTpsValues.length > 0 
      ? validTpsValues.reduce((sum, tps) => sum + tps, 0) / validTpsValues.length 
      : 0;

    session.summary.duration_ms = duration;
    session.summary.avg_tps = avgTps;

    this.notifySubscribers();
  }
}

// Export singleton instance
export const sessionStorage = new SessionStorageManager();

// Export utility functions
export const createSessionFromTelemetryData = (
  data: TelemetryDataPoint[], 
  modelInfo?: { model_a?: string; model_b?: string },
  sessionName?: string,
  chatHistory?: Message[],
  systemPrompt?: string
) => {
  return sessionStorage.createSessionFromData(data, modelInfo, sessionName, chatHistory, systemPrompt);
};

export const getAllSessions = () => sessionStorage.getSessions();
export const getSession = (id: string) => sessionStorage.getSession(id);
export const removeSession = (id: string) => sessionStorage.removeSession(id);
export const clearAllSessions = () => sessionStorage.clearSessions();
export const subscribeToSessions = (callback: (sessions: TelemetrySession[]) => void) => 
  sessionStorage.subscribe(callback);
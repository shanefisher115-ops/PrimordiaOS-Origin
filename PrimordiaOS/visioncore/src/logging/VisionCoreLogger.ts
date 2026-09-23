/**
 * VisionCoreLogger - Structured JSON Logging & Error Quarantine Subsystem
 * Agent Role: Safety & Logging Specialist
 */

export type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'AUDIT';

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  component: string;
  traceId: string;
  message: string;
  metadata?: Record<string, unknown>;
  durationMs?: number;
}

export interface QuarantinedError {
  id: string;
  timestamp: string;
  component: string;
  traceId: string;
  errorMessage: string;
  stack?: string;
  payloadContext?: unknown;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  resolved: boolean;
}

export class VisionCoreLogger {
  private component: string;
  private static logHistory: LogEntry[] = [];
  private static quarantineLedger: Map<string, QuarantinedError> = new Map();
  private static maxHistory = 1000;

  constructor(component: string = 'VisionCore') {
    this.component = component;
  }

  public forComponent(childComponent: string): VisionCoreLogger {
    return new VisionCoreLogger(`${this.component}::${childComponent}`);
  }

  private writeLog(level: LogLevel, message: string, metadata?: Record<string, unknown>, traceId?: string, durationMs?: number): LogEntry {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      component: this.component,
      traceId: traceId || `trace-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 7)}`,
      message,
      metadata,
      durationMs
    };

    VisionCoreLogger.logHistory.push(entry);
    if (VisionCoreLogger.logHistory.length > VisionCoreLogger.maxHistory) {
      VisionCoreLogger.logHistory.shift();
    }

    // Output formatted JSON log to stdout/stderr
    const serialized = JSON.stringify(entry);
    if (level === 'ERROR') {
      console.error(serialized);
    } else if (level === 'WARN') {
      console.warn(serialized);
    } else {
      console.log(serialized);
    }

    return entry;
  }

  public debug(message: string, metadata?: Record<string, unknown>, traceId?: string): LogEntry {
    return this.writeLog('DEBUG', message, metadata, traceId);
  }

  public info(message: string, metadata?: Record<string, unknown>, traceId?: string): LogEntry {
    return this.writeLog('INFO', message, metadata, traceId);
  }

  public warn(message: string, metadata?: Record<string, unknown>, traceId?: string): LogEntry {
    return this.writeLog('WARN', message, metadata, traceId);
  }

  public error(message: string, error?: Error | unknown, metadata?: Record<string, unknown>, traceId?: string): LogEntry {
    const meta = {
      ...metadata,
      error: error instanceof Error ? { name: error.name, message: error.message, stack: error.stack } : error
    };
    return this.writeLog('ERROR', message, meta, traceId);
  }

  public audit(message: string, metadata?: Record<string, unknown>, traceId?: string): LogEntry {
    return this.writeLog('AUDIT', message, metadata, traceId);
  }

  public quarantine(
    error: Error | unknown,
    payloadContext?: unknown,
    severity: QuarantinedError['severity'] = 'HIGH',
    traceId?: string
  ): QuarantinedError {
    const id = `qerr-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 8)}`;
    const errorMessage = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error ? error.stack : undefined;

    const quarantined: QuarantinedError = {
      id,
      timestamp: new Date().toISOString(),
      component: this.component,
      traceId: traceId || `trace-${Date.now().toString(36)}`,
      errorMessage,
      stack,
      payloadContext,
      severity,
      resolved: false
    };

    VisionCoreLogger.quarantineLedger.set(id, quarantined);
    this.writeLog('ERROR', `[QUARANTINE ACTIVATED] Error isolated under ID: ${id}`, {
      quarantineId: id,
      severity,
      errorMessage
    }, traceId);

    return quarantined;
  }

  public static getHistory(componentFilter?: string, levelFilter?: LogLevel): LogEntry[] {
    return VisionCoreLogger.logHistory.filter(item => {
      if (componentFilter && !item.component.includes(componentFilter)) return false;
      if (levelFilter && item.level !== levelFilter) return false;
      return true;
    });
  }

  public static getQuarantinedErrors(): QuarantinedError[] {
    return Array.from(VisionCoreLogger.quarantineLedger.values());
  }

  public static resolveQuarantinedError(id: string): boolean {
    const err = VisionCoreLogger.quarantineLedger.get(id);
    if (err) {
      err.resolved = true;
      return true;
    }
    return false;
  }

  public static clearHistory(): void {
    VisionCoreLogger.logHistory = [];
    VisionCoreLogger.quarantineLedger.clear();
  }
}

/**
 * HybridLogger - Structured JSON Logging & Error Quarantine Subsystem
 * Agent Role: Safety & Logging Specialist
 * PrimordiaOS VisionCore x Vertex AI Substrate
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

export class HybridLogger {
  private component: string;
  private static logHistory: LogEntry[] = [];
  private static quarantineLedger: Map<string, QuarantinedError> = new Map();
  private static maxHistory = 2000;

  constructor(component: string = 'HybridSubsystem') {
    this.component = component;
  }

  public forComponent(childComponent: string): HybridLogger {
    return new HybridLogger(`${this.component}::${childComponent}`);
  }

  private writeLog(
    level: LogLevel,
    message: string,
    metadata?: Record<string, unknown>,
    traceId?: string,
    durationMs?: number
  ): LogEntry {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      component: this.component,
      traceId: traceId || `trace-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 7)}`,
      message,
      metadata,
      durationMs
    };

    HybridLogger.logHistory.push(entry);
    if (HybridLogger.logHistory.length > HybridLogger.maxHistory) {
      HybridLogger.logHistory.shift();
    }

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

  public error(
    message: string,
    err?: Error | unknown,
    metadata?: Record<string, unknown>,
    traceId?: string
  ): LogEntry {
    const meta: Record<string, unknown> = {
      ...metadata,
      error: err instanceof Error ? { name: err.name, message: err.message, stack: err.stack } : err
    };
    return this.writeLog('ERROR', message, meta, traceId);
  }

  public audit(message: string, metadata?: Record<string, unknown>, traceId?: string): LogEntry {
    return this.writeLog('AUDIT', message, metadata, traceId);
  }

  /**
   * Isolates a critical execution failure into the quarantine ledger,
   * preventing cascading unhandled rejections while preserving full forensic context.
   */
  public quarantine(
    err: Error | unknown,
    payloadContext?: unknown,
    severity: QuarantinedError['severity'] = 'HIGH',
    traceId?: string
  ): QuarantinedError {
    const id = `qerr-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 8)}`;
    const errorMessage = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack : undefined;

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

    HybridLogger.quarantineLedger.set(id, quarantined);
    this.writeLog('ERROR', `[QUARANTINE_ISOLATION] Failure quarantined [ID: ${id}]`, {
      quarantineId: id,
      severity,
      errorMessage,
      hasPayloadContext: payloadContext !== undefined
    }, traceId);

    return quarantined;
  }

  public static getHistory(componentFilter?: string, levelFilter?: LogLevel): LogEntry[] {
    return HybridLogger.logHistory.filter(item => {
      if (componentFilter && !item.component.includes(componentFilter)) return false;
      if (levelFilter && item.level !== levelFilter) return false;
      return true;
    });
  }

  public static getQuarantinedErrors(): QuarantinedError[] {
    return Array.from(HybridLogger.quarantineLedger.values());
  }

  public static resolveQuarantinedError(id: string): boolean {
    const err = HybridLogger.quarantineLedger.get(id);
    if (err) {
      err.resolved = true;
      return true;
    }
    return false;
  }

  public static clearHistory(): void {
    HybridLogger.logHistory = [];
    HybridLogger.quarantineLedger.clear();
  }
}

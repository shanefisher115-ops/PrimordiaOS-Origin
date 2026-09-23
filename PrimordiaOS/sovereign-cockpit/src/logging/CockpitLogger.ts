/**
 * PrimordiaOS Sovereign Cockpit — Structured Logging Subsystem
 * Implements high-throughput JSON logging, in-memory ring buffers,
 * trace correlation, and error quarantine boundaries.
 */

export type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'PANIC';

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  subsystem: string;
  message: string;
  traceId?: string;
  metadata?: Record<string, unknown>;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

export type LogListener = (entry: LogEntry) => void;

export class CockpitLogger {
  private static instance: CockpitLogger | null = null;
  private ringBuffer: LogEntry[] = [];
  private readonly maxBufferSize: number = 2000;
  private listeners: Set<LogListener> = new Set();
  private minLevel: LogLevel = 'DEBUG';

  private static readonly LEVEL_PRIORITY: Record<LogLevel, number> = {
    DEBUG: 0,
    INFO: 1,
    WARN: 2,
    ERROR: 3,
    PANIC: 4,
  };

  private constructor(maxBufferSize: number = 2000) {
    this.maxBufferSize = maxBufferSize;
    const envLevel = (process.env.LOG_LEVEL?.toUpperCase() as LogLevel) || 'INFO';
    if (envLevel in CockpitLogger.LEVEL_PRIORITY) {
      this.minLevel = envLevel;
    }
  }

  public static getInstance(): CockpitLogger {
    if (!CockpitLogger.instance) {
      CockpitLogger.instance = new CockpitLogger();
    }
    return CockpitLogger.instance;
  }

  public setMinLevel(level: LogLevel): void {
    this.minLevel = level;
  }

  public debug(subsystem: string, message: string, metadata?: Record<string, unknown>, traceId?: string): void {
    this.log('DEBUG', subsystem, message, metadata, undefined, traceId);
  }

  public info(subsystem: string, message: string, metadata?: Record<string, unknown>, traceId?: string): void {
    this.log('INFO', subsystem, message, metadata, undefined, traceId);
  }

  public warn(subsystem: string, message: string, metadata?: Record<string, unknown>, traceId?: string): void {
    this.log('WARN', subsystem, message, metadata, undefined, traceId);
  }

  public error(subsystem: string, message: string, error?: unknown, metadata?: Record<string, unknown>, traceId?: string): void {
    const errorObj = error instanceof Error ? {
      name: error.name,
      message: error.message,
      stack: error.stack
    } : error ? {
      name: 'UnknownError',
      message: String(error)
    } : undefined;

    this.log('ERROR', subsystem, message, metadata, errorObj, traceId);
  }

  public panic(subsystem: string, message: string, error?: unknown, metadata?: Record<string, unknown>, traceId?: string): void {
    const errorObj = error instanceof Error ? {
      name: error.name,
      message: error.message,
      stack: error.stack
    } : error ? {
      name: 'PanicError',
      message: String(error)
    } : undefined;

    this.log('PANIC', subsystem, message, metadata, errorObj, traceId);
  }

  /**
   * Quarantines dangerous subsystem execution, preventing engine crashes.
   */
  public quarantine<T>(subsystem: string, operation: () => T, fallback?: T): T | undefined {
    try {
      return operation();
    } catch (err) {
      this.error(subsystem, `Quarantined subsystem failure intercepted: ${err instanceof Error ? err.message : String(err)}`, err);
      return fallback;
    }
  }

  /**
   * Async variant of quarantine boundary.
   */
  public async quarantineAsync<T>(subsystem: string, operation: () => Promise<T>, fallback?: T): Promise<T | undefined> {
    try {
      return await operation();
    } catch (err) {
      this.error(subsystem, `Quarantined async subsystem failure intercepted: ${err instanceof Error ? err.message : String(err)}`, err);
      return fallback;
    }
  }

  public getRecentLogs(count: number = 100, levelFilter?: LogLevel): LogEntry[] {
    let logs = this.ringBuffer;
    if (levelFilter) {
      const minPriority = CockpitLogger.LEVEL_PRIORITY[levelFilter];
      logs = logs.filter(l => CockpitLogger.LEVEL_PRIORITY[l.level] >= minPriority);
    }
    return logs.slice(-count);
  }

  public subscribe(listener: LogListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private log(
    level: LogLevel,
    subsystem: string,
    message: string,
    metadata?: Record<string, unknown>,
    error?: { name: string; message: string; stack?: string },
    traceId?: string
  ): void {
    if (CockpitLogger.LEVEL_PRIORITY[level] < CockpitLogger.LEVEL_PRIORITY[this.minLevel]) {
      return;
    }

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      subsystem,
      message,
      traceId: traceId || this.generateTraceId(),
      metadata,
      error
    };

    // Maintain circular ring buffer
    if (this.ringBuffer.length >= this.maxBufferSize) {
      this.ringBuffer.shift();
    }
    this.ringBuffer.push(entry);

    // Output JSON to standard output or standard error
    const jsonOutput = JSON.stringify(entry);
    if (level === 'ERROR' || level === 'PANIC') {
      process.stderr.write(jsonOutput + '\n');
    } else {
      process.stdout.write(jsonOutput + '\n');
    }

    // Notify registered live listeners (e.g., WebSocket broadcast)
    for (const listener of this.listeners) {
      try {
        listener(entry);
      } catch (listenerError) {
        process.stderr.write(`[CockpitLogger] Listener error: ${listenerError}\n`);
      }
    }
  }

  private generateTraceId(): string {
    return 'trace-' + Math.random().toString(36).substring(2, 9) + '-' + Date.now().toString(36);
  }
}

export const logger = CockpitLogger.getInstance();

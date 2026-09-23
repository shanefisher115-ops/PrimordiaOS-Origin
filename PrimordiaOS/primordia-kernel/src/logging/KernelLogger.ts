/**
 * PrimordiaOS Sovereign Kernel Subsystem
 * KernelLogger.ts - High-performance structured JSON logging engine
 */

export type LogLevel = 'TRACE' | 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'FATAL';

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

export interface LoggerOptions {
  minLevel?: LogLevel;
  enableConsole?: boolean;
  bufferCapacity?: number;
  subsystem?: string;
}

const LOG_LEVEL_SEVERITY: Record<LogLevel, number> = {
  TRACE: 10,
  DEBUG: 20,
  INFO: 30,
  WARN: 40,
  ERROR: 50,
  FATAL: 60,
};

export class KernelLogger {
  private minLevel: LogLevel;
  private enableConsole: boolean;
  private bufferCapacity: number;
  private subsystem: string;
  private buffer: LogEntry[] = [];

  constructor(options: LoggerOptions = {}) {
    this.minLevel = options.minLevel || (process.env.LOG_LEVEL as LogLevel) || 'INFO';
    this.enableConsole = options.enableConsole ?? true;
    this.bufferCapacity = options.bufferCapacity ?? 1000;
    this.subsystem = options.subsystem ?? 'kernel';
  }

  public forSubsystem(subsystem: string): KernelLogger {
    const child = new KernelLogger({
      minLevel: this.minLevel,
      enableConsole: this.enableConsole,
      bufferCapacity: this.bufferCapacity,
      subsystem,
    });
    // Link buffer reference to parent so all child loggers share the same queryable buffer
    child.buffer = this.buffer;
    return child;
  }

  public trace(message: string, metadata?: Record<string, unknown>, traceId?: string): void {
    this.log('TRACE', message, metadata, undefined, traceId);
  }

  public debug(message: string, metadata?: Record<string, unknown>, traceId?: string): void {
    this.log('DEBUG', message, metadata, undefined, traceId);
  }

  public info(message: string, metadata?: Record<string, unknown>, traceId?: string): void {
    this.log('INFO', message, metadata, undefined, traceId);
  }

  public warn(message: string, metadata?: Record<string, unknown>, traceId?: string): void {
    this.log('WARN', message, metadata, undefined, traceId);
  }

  public error(message: string, error?: Error | unknown, metadata?: Record<string, unknown>, traceId?: string): void {
    let errObj: LogEntry['error'];
    if (error instanceof Error) {
      errObj = {
        name: error.name,
        message: error.message,
        stack: error.stack,
      };
    } else if (error) {
      errObj = {
        name: 'UnknownError',
        message: String(error),
      };
    }
    this.log('ERROR', message, metadata, errObj, traceId);
  }

  public fatal(message: string, error?: Error | unknown, metadata?: Record<string, unknown>, traceId?: string): void {
    let errObj: LogEntry['error'];
    if (error instanceof Error) {
      errObj = {
        name: error.name,
        message: error.message,
        stack: error.stack,
      };
    } else if (error) {
      errObj = {
        name: 'FatalKernelError',
        message: String(error),
      };
    }
    this.log('FATAL', message, metadata, errObj, traceId);
  }

  // Specialized logging domains
  public logBoot(phase: string, status: 'STARTING' | 'SUCCESS' | 'FAILED', details?: Record<string, unknown>): void {
    this.info(`[BOOT] Phase: ${phase} -> ${status}`, { phase, status, ...details });
  }

  public logEvent(topic: string, eventId: string, source: string, details?: Record<string, unknown>): void {
    this.debug(`[EVENT] Topic: ${topic} from ${source}`, { topic, eventId, source, ...details });
  }

  public logIPC(channel: string, sourceRealm: string, targetRealm: string, action: string, traceId?: string): void {
    this.debug(`[IPC] ${sourceRealm} -> ${targetRealm} [${channel}:${action}]`, {
      channel,
      sourceRealm,
      targetRealm,
      action,
    }, traceId);
  }

  public logTask(taskId: string, name: string, status: 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED', details?: Record<string, unknown>): void {
    this.debug(`[TASK] ${name} (${taskId}) -> ${status}`, { taskId, name, status, ...details });
  }

  public logSafety(rule: string, severity: 'LOW' | 'MEDIUM' | 'CRITICAL', details: Record<string, unknown>): void {
    const level: LogLevel = severity === 'CRITICAL' ? 'ERROR' : severity === 'MEDIUM' ? 'WARN' : 'INFO';
    this.log(level, `[SAFETY] Rule violated: ${rule} (${severity})`, { rule, severity, ...details });
  }

  private log(
    level: LogLevel,
    message: string,
    metadata?: Record<string, unknown>,
    error?: LogEntry['error'],
    traceId?: string
  ): void {
    if (LOG_LEVEL_SEVERITY[level] < LOG_LEVEL_SEVERITY[this.minLevel]) {
      return;
    }

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      subsystem: this.subsystem,
      message,
      ...(traceId ? { traceId } : {}),
      ...(metadata && Object.keys(metadata).length > 0 ? { metadata } : {}),
      ...(error ? { error } : {}),
    };

    // Store in ring buffer
    this.buffer.push(entry);
    if (this.buffer.length > this.bufferCapacity) {
      this.buffer.shift();
    }

    if (this.enableConsole) {
      const serialized = JSON.stringify(entry);
      if (level === 'ERROR' || level === 'FATAL') {
        console.error(serialized);
      } else if (level === 'WARN') {
        console.warn(serialized);
      } else {
        console.log(serialized);
      }
    }
  }

  public getRecentLogs(limit = 100, filterSubsystem?: string, minLevel?: LogLevel): LogEntry[] {
    let filtered = this.buffer;
    if (filterSubsystem) {
      filtered = filtered.filter(entry => entry.subsystem === filterSubsystem);
    }
    if (minLevel) {
      const minSev = LOG_LEVEL_SEVERITY[minLevel];
      filtered = filtered.filter(entry => LOG_LEVEL_SEVERITY[entry.level] >= minSev);
    }
    return filtered.slice(-limit);
  }

  public clearBuffer(): void {
    this.buffer.length = 0;
  }
}

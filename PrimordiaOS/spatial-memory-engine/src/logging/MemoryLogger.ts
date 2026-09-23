/**
 * @file MemoryLogger.ts
 * @description Structured JSON logging engine for PrimordiaOS Spatial Memory Subsystem.
 * Provides high-altitude telemetry, in-memory circular buffers, and stream persistence.
 */

export type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'FATAL';

export interface LogEntry {
  timestamp: string;
  epochMs: number;
  level: LogLevel;
  component: string;
  message: string;
  context?: Record<string, unknown>;
  correlationId?: string;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

export interface LoggerOptions {
  component: string;
  minLevel?: LogLevel;
  enableStdout?: boolean;
  bufferCapacity?: number;
}

const LEVEL_PRIORITY: Record<LogLevel, number> = {
  DEBUG: 10,
  INFO: 20,
  WARN: 30,
  ERROR: 40,
  FATAL: 50,
};

export class MemoryLogger {
  private readonly component: string;
  private minLevel: LogLevel;
  private readonly enableStdout: boolean;
  private readonly bufferCapacity: number;
  private static ringBuffer: LogEntry[] = [];
  private static maxGlobalBufferSize = 2000;

  constructor(options: LoggerOptions) {
    this.component = options.component;
    this.minLevel = options.minLevel ?? (process.env['LOG_LEVEL'] as LogLevel) ?? 'INFO';
    this.enableStdout = options.enableStdout ?? true;
    this.bufferCapacity = options.bufferCapacity ?? 500;
  }

  public setLevel(level: LogLevel): void {
    this.minLevel = level;
  }

  public getLevel(): LogLevel {
    return this.minLevel;
  }

  public debug(message: string, context?: Record<string, unknown>, correlationId?: string): void {
    this.log('DEBUG', message, context, correlationId);
  }

  public info(message: string, context?: Record<string, unknown>, correlationId?: string): void {
    this.log('INFO', message, context, correlationId);
  }

  public warn(message: string, context?: Record<string, unknown>, correlationId?: string): void {
    this.log('WARN', message, context, correlationId);
  }

  public error(message: string, error?: unknown, context?: Record<string, unknown>, correlationId?: string): void {
    const errorDetails = error instanceof Error
      ? { name: error.name, message: error.message, stack: error.stack }
      : error
      ? { name: 'UnknownError', message: String(error) }
      : undefined;

    this.log('ERROR', message, context, correlationId, errorDetails);
  }

  public fatal(message: string, error?: unknown, context?: Record<string, unknown>, correlationId?: string): void {
    const errorDetails = error instanceof Error
      ? { name: error.name, message: error.message, stack: error.stack }
      : error
      ? { name: 'FatalError', message: String(error) }
      : undefined;

    this.log('FATAL', message, context, correlationId, errorDetails);
  }

  private log(
    level: LogLevel,
    message: string,
    context?: Record<string, unknown>,
    correlationId?: string,
    error?: { name: string; message: string; stack?: string }
  ): void {
    if (LEVEL_PRIORITY[level] < LEVEL_PRIORITY[this.minLevel]) {
      return;
    }

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      epochMs: Date.now(),
      level,
      component: this.component,
      message,
      ...(context && Object.keys(context).length > 0 ? { context } : {}),
      ...(correlationId ? { correlationId } : {}),
      ...(error ? { error } : {}),
    };

    // Store in global circular buffer
    MemoryLogger.ringBuffer.push(entry);
    if (MemoryLogger.ringBuffer.length > MemoryLogger.maxGlobalBufferSize) {
      MemoryLogger.ringBuffer.shift();
    }

    if (this.enableStdout) {
      const jsonStr = JSON.stringify(entry);
      if (level === 'ERROR' || level === 'FATAL') {
        process.stderr.write(`${jsonStr}\n`);
      } else {
        process.stdout.write(`${jsonStr}\n`);
      }
    }
  }

  public getRecentLogs(limit = 100, level?: LogLevel): LogEntry[] {
    let filtered = MemoryLogger.ringBuffer;
    if (level) {
      const targetPriority = LEVEL_PRIORITY[level];
      filtered = filtered.filter(e => LEVEL_PRIORITY[e.level] >= targetPriority);
    }
    return filtered.slice(-Math.min(limit, filtered.length));
  }

  public static clearLogs(): void {
    MemoryLogger.ringBuffer = [];
  }
}

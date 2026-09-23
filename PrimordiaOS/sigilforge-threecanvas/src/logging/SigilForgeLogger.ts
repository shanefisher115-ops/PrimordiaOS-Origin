export type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'SOVEREIGN';

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  subsystem: string;
  message: string;
  data?: Record<string, unknown>;
  error?: {
    message: string;
    stack?: string;
  };
}

export type TelemetryListener = (entry: LogEntry) => void;

export class SigilForgeLogger {
  private static instance: SigilForgeLogger | null = null;
  private subsystem: string;
  private minLevel: LogLevel = 'INFO';
  private listeners: Set<TelemetryListener> = new Set();

  private readonly levelWeights: Record<LogLevel, number> = {
    DEBUG: 10,
    INFO: 20,
    WARN: 30,
    ERROR: 40,
    SOVEREIGN: 50,
  };

  constructor(subsystem: string = 'SigilForge') {
    this.subsystem = subsystem;
  }

  public static getInstance(subsystem: string = 'SigilForge'): SigilForgeLogger {
    if (!SigilForgeLogger.instance) {
      SigilForgeLogger.instance = new SigilForgeLogger(subsystem);
    }
    return SigilForgeLogger.instance;
  }

  public setMinLevel(level: LogLevel): void {
    this.minLevel = level;
  }

  public addTelemetryListener(listener: TelemetryListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  public debug(message: string, data?: Record<string, unknown>): void {
    this.emit('DEBUG', message, data);
  }

  public info(message: string, data?: Record<string, unknown>): void {
    this.emit('INFO', message, data);
  }

  public warn(message: string, data?: Record<string, unknown>): void {
    this.emit('WARN', message, data);
  }

  public error(message: string, err?: unknown, data?: Record<string, unknown>): void {
    let errorObj: { message: string; stack?: string } | undefined;
    if (err instanceof Error) {
      errorObj = { message: err.message, stack: err.stack };
    } else if (err !== undefined) {
      errorObj = { message: String(err) };
    }
    this.emit('ERROR', message, data, errorObj);
  }

  public sovereign(message: string, data?: Record<string, unknown>): void {
    this.emit('SOVEREIGN', message, data);
  }

  private emit(
    level: LogLevel,
    message: string,
    data?: Record<string, unknown>,
    error?: { message: string; stack?: string }
  ): void {
    if (this.levelWeights[level] < this.levelWeights[this.minLevel]) {
      return;
    }

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      subsystem: this.subsystem,
      message,
      ...(data ? { data } : {}),
      ...(error ? { error } : {}),
    };

    const jsonString = JSON.stringify(entry);

    switch (level) {
      case 'DEBUG':
        console.debug(jsonString);
        break;
      case 'INFO':
        console.info(jsonString);
        break;
      case 'WARN':
        console.warn(jsonString);
        break;
      case 'ERROR':
        console.error(jsonString);
        break;
      case 'SOVEREIGN':
        console.log(`\x1b[35m[SOVEREIGN]\x1b[0m ${jsonString}`);
        break;
    }

    for (const listener of this.listeners) {
      try {
        listener(entry);
      } catch (listenerErr) {
        console.error('Failed to notify telemetry listener:', listenerErr);
      }
    }
  }
}

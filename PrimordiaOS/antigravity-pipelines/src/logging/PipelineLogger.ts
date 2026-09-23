import { LogLevel, StructuredLogEntry } from '../core/types.js';

export class PipelineLogger {
  private static instance: PipelineLogger | null = null;
  private minLevel: LogLevel = 'INFO';
  private logBuffer: StructuredLogEntry[] = [];
  private readonly maxBufferSize = 2000;

  private readonly levelWeights: Record<LogLevel, number> = {
    DEBUG: 10,
    INFO: 20,
    WARN: 30,
    ERROR: 40,
    FATAL: 50,
  };

  constructor(minLevel: LogLevel = 'INFO') {
    this.minLevel = minLevel;
  }

  public static getInstance(): PipelineLogger {
    if (!PipelineLogger.instance) {
      PipelineLogger.instance = new PipelineLogger(
        (process.env['LOG_LEVEL'] as LogLevel) || 'INFO'
      );
    }
    return PipelineLogger.instance;
  }

  public setLevel(level: LogLevel): void {
    this.minLevel = level;
  }

  private shouldLog(level: LogLevel): boolean {
    return this.levelWeights[level] >= this.levelWeights[this.minLevel];
  }

  private write(entry: StructuredLogEntry): void {
    if (!this.shouldLog(entry.level)) {
      return;
    }

    this.logBuffer.push(entry);
    if (this.logBuffer.length > this.maxBufferSize) {
      this.logBuffer.shift();
    }

    const serialized = JSON.stringify(entry);
    if (entry.level === 'ERROR' || entry.level === 'FATAL') {
      process.stderr.write(serialized + '\n');
    } else {
      process.stdout.write(serialized + '\n');
    }
  }

  public log(
    level: LogLevel,
    subsystem: string,
    message: string,
    context?: Partial<Omit<StructuredLogEntry, 'timestamp' | 'level' | 'subsystem' | 'message'>>
  ): void {
    const entry: StructuredLogEntry = {
      timestamp: new Date().toISOString(),
      level,
      subsystem,
      message,
      pipelineId: context?.pipelineId,
      runId: context?.runId,
      nodeId: context?.nodeId,
      traceId: context?.traceId,
      data: context?.data,
      error: context?.error,
    };
    this.write(entry);
  }

  public debug(subsystem: string, message: string, data?: Record<string, unknown>, context?: { pipelineId?: string; runId?: string; traceId?: string }): void {
    this.log('DEBUG', subsystem, message, { data, ...context });
  }

  public info(subsystem: string, message: string, data?: Record<string, unknown>, context?: { pipelineId?: string; runId?: string; traceId?: string }): void {
    this.log('INFO', subsystem, message, { data, ...context });
  }

  public warn(subsystem: string, message: string, data?: Record<string, unknown>, context?: { pipelineId?: string; runId?: string; traceId?: string }): void {
    this.log('WARN', subsystem, message, { data, ...context });
  }

  public error(subsystem: string, message: string, err?: Error | unknown, context?: { pipelineId?: string; runId?: string; traceId?: string; data?: Record<string, unknown> }): void {
    const errorDetails = err instanceof Error
      ? { message: err.message, stack: err.stack, code: (err as { code?: string }).code }
      : err ? { message: String(err) } : undefined;

    this.log('ERROR', subsystem, message, {
      ...context,
      error: errorDetails,
    });
  }

  public fatal(subsystem: string, message: string, err?: Error | unknown, context?: { pipelineId?: string; runId?: string; traceId?: string; data?: Record<string, unknown> }): void {
    const errorDetails = err instanceof Error
      ? { message: err.message, stack: err.stack, code: (err as { code?: string }).code }
      : err ? { message: String(err) } : undefined;

    this.log('FATAL', subsystem, message, {
      ...context,
      error: errorDetails,
    });
  }

  public bootLog(phase: string, message: string, data?: Record<string, unknown>): void {
    this.log('INFO', 'PipelineBoot', `[BOOT:${phase}] ${message}`, { data });
  }

  public executionLog(pipelineId: string, runId: string, status: string, details?: Record<string, unknown>): void {
    this.log('INFO', 'PipelineExecution', `Pipeline ${pipelineId} [${runId}] -> ${status}`, {
      pipelineId,
      runId,
      data: details,
    });
  }

  public routingLog(taskId: string, target: string, action: string, traceId: string): void {
    this.log('DEBUG', 'MultiAgentRouter', `Routed task ${taskId} (${action}) -> ${target}`, {
      traceId,
      data: { taskId, target, action },
    });
  }

  public safetyLog(violation: string, reason: string, context?: { pipelineId?: string; nodeId?: string }): void {
    this.log('WARN', 'PipelineSafetyLayer', `[SAFETY_VIOLATION] ${violation}: ${reason}`, {
      pipelineId: context?.pipelineId,
      nodeId: context?.nodeId,
      data: { violation, reason },
    });
  }

  public getRecentLogs(limit = 100): StructuredLogEntry[] {
    return this.logBuffer.slice(-limit);
  }

  public clearBuffer(): void {
    this.logBuffer = [];
  }
}

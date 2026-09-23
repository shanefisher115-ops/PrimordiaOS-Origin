import { LogLevel } from "../logging/logger";

export interface RuntimeLogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  graphId?: string;
  taskId?: string;
  agentId?: string;
  context?: Record<string, unknown>;
}

export interface RuntimeLogger {
  log(entry: RuntimeLogEntry): void;
}

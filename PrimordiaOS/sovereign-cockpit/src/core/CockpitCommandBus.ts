/**
 * PrimordiaOS Sovereign Cockpit — Command Bus Subsystem
 * High-performance, asynchronous, typed command dispatcher with middleware hooks,
 * priority queues, and safety interceptors.
 */

import { logger } from '../logging/CockpitLogger.js';
import { safetyGuards } from '../safety/CockpitSafetyGuards.js';

export type CommandPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface CockpitCommand<TPayload = unknown> {
  id: string;
  type: string;
  payload: TPayload;
  sourceRealm: string;
  priority?: CommandPriority;
  timestamp: number;
  timeoutMs?: number;
}

export interface CommandResult<TResult = unknown> {
  commandId: string;
  success: boolean;
  result?: TResult;
  error?: string;
  durationMs: number;
}

export type CommandHandler<TPayload = any, TResult = any> = (
  command: CockpitCommand<TPayload>
) => Promise<TResult> | TResult;

export type CommandMiddleware = (
  command: CockpitCommand,
  next: () => Promise<CommandResult>
) => Promise<CommandResult>;

export class CockpitCommandBus {
  private handlers: Map<string, CommandHandler> = new Map();
  private middlewares: CommandMiddleware[] = [];
  private executionStats: { total: number; successful: number; failed: number } = {
    total: 0,
    successful: 0,
    failed: 0
  };

  constructor() {
    this.registerDefaultMiddlewares();
  }

  /**
   * Registers an execution handler for a specific command type.
   */
  public registerHandler<TPayload, TResult>(
    type: string,
    handler: CommandHandler<TPayload, TResult>
  ): void {
    if (this.handlers.has(type)) {
      logger.warn('CockpitCommandBus', `Overwriting existing handler for command type [${type}]`);
    }
    this.handlers.set(type, handler);
  }

  /**
   * Appends a middleware to the execution chain.
   */
  public use(middleware: CommandMiddleware): void {
    this.middlewares.push(middleware);
  }

  /**
   * Dispatches a command asynchronously through the middleware chain to its handler.
   */
  public async dispatch<TPayload, TResult>(
    command: CockpitCommand<TPayload>
  ): Promise<CommandResult<TResult>> {
    const startTime = Date.now();
    this.executionStats.total++;

    const baseExecution = async (): Promise<CommandResult<TResult>> => {
      const handler = this.handlers.get(command.type);
      if (!handler) {
        const errMsg = `No handler registered for command type: ${command.type}`;
        logger.error('CockpitCommandBus', errMsg);
        return {
          commandId: command.id,
          success: false,
          error: errMsg,
          durationMs: Date.now() - startTime
        };
      }

      const timeoutMs = command.timeoutMs || 10000;
      try {
        const resultPromise = Promise.resolve(handler(command));
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error(`Command ${command.type} timed out after ${timeoutMs}ms`)), timeoutMs)
        );

        const result = (await Promise.race([resultPromise, timeoutPromise])) as TResult;
        this.executionStats.successful++;
        return {
          commandId: command.id,
          success: true,
          result,
          durationMs: Date.now() - startTime
        };
      } catch (err) {
        this.executionStats.failed++;
        const errMessage = err instanceof Error ? err.message : String(err);
        logger.error('CockpitCommandBus', `Execution failed for command [${command.type}]`, err);
        return {
          commandId: command.id,
          success: false,
          error: errMessage,
          durationMs: Date.now() - startTime
        };
      }
    };

    // Execute middleware chain
    let index = -1;
    const runner = async (i: number): Promise<CommandResult<any>> => {
      if (i <= index) {
        throw new Error('next() called multiple times in middleware');
      }
      index = i;
      if (i < this.middlewares.length) {
        const mw = this.middlewares[i];
        return await mw(command, () => runner(i + 1));
      }
      return await baseExecution();
    };

    return await runner(0);
  }

  public getStats() {
    return { ...this.executionStats };
  }

  private registerDefaultMiddlewares(): void {
    // 1. Safety Guard Middleware
    this.use(async (command, next) => {
      if (command.type === 'EXEC_TERMINAL' || command.type === 'KERNEL_EXEC') {
        const rawCmd = typeof command.payload === 'string'
          ? command.payload
          : (command.payload as any)?.command || '';

        const check = safetyGuards.sanitizeCommand(rawCmd, command.sourceRealm);
        if (!check.allowed) {
          logger.error('CockpitCommandBus', `Safety violation prevented command dispatch: ${check.reason}`);
          return {
            commandId: command.id,
            success: false,
            error: `Safety Guard Blocked: ${check.reason}`,
            durationMs: 0
          };
        }
      }
      return await next();
    });

    // 2. Logging & Audit Middleware
    this.use(async (command, next) => {
      logger.debug('CockpitCommandBus', `Dispatching command [${command.type}] from [${command.sourceRealm}]`, {
        commandId: command.id,
        priority: command.priority || 'MEDIUM'
      });
      const result = await next();
      if (result.success) {
        logger.debug('CockpitCommandBus', `Command [${command.type}] completed in ${result.durationMs}ms`);
      } else {
        logger.warn('CockpitCommandBus', `Command [${command.type}] failed: ${result.error}`);
      }
      return result;
    });
  }
}

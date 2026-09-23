/**
 * PrimordiaOS Sovereign Kernel Subsystem
 * IPCRouter.ts - High-throughput inter-realm message router, RPC invocations, and streaming IPC
 */

import { KernelLogger } from '../logging/KernelLogger.js';
import { KernelSafetyLayer } from '../safety/KernelSafetyLayer.js';
import { RealmRegistry } from '../registry/RealmRegistry.js';

export interface IPCEnvelope<T = unknown> {
  id: string;
  sourceRealm: string;
  targetRealm: string;
  channel: string;
  action: string;
  payload: T;
  timestamp: string;
  traceId: string;
  isStream?: boolean;
  chunkIndex?: number;
  isFinalChunk?: boolean;
  timeoutMs?: number;
}

export interface IPCResponse<T = unknown> {
  correlationId: string;
  success: boolean;
  payload?: T;
  error?: string;
  timestamp: string;
}

export type IPCHandler<TReq = unknown, TRes = unknown> = (
  message: IPCEnvelope<TReq>
) => Promise<TRes> | TRes;

export type IPCStreamListener<T = unknown> = (chunk: IPCEnvelope<T>) => void | Promise<void>;

export class IPCRouter {
  private logger: KernelLogger;
  private safety: KernelSafetyLayer;
  private registry: RealmRegistry;

  // Key: `${realmId}:${channel}:${action}` or `${realmId}:${channel}:*`
  private handlers = new Map<string, IPCHandler>();
  // Key: streamId
  private streamListeners = new Map<string, IPCStreamListener[]>();

  constructor(logger: KernelLogger, safety: KernelSafetyLayer, registry: RealmRegistry) {
    this.logger = logger.forSubsystem('ipc');
    this.safety = safety;
    this.registry = registry;
  }

  private handlerKey(realmId: string, channel: string, action: string): string {
    return `${realmId}:${channel}:${action}`;
  }

  /**
   * Registers a message or RPC handler for a specific realm, channel, and action
   */
  public registerHandler<TReq = unknown, TRes = unknown>(
    realmId: string,
    channel: string,
    action: string,
    handler: IPCHandler<TReq, TRes>
  ): void {
    const key = this.handlerKey(realmId, channel, action);
    this.handlers.set(key, handler as IPCHandler);
    this.logger.debug(`Registered IPC handler for [${key}]`);
  }

  public unregisterHandler(realmId: string, channel: string, action: string): boolean {
    const key = this.handlerKey(realmId, channel, action);
    return this.handlers.delete(key);
  }

  /**
   * Normalizes raw IPC message arguments into an authenticated IPCEnvelope
   */
  public createEnvelope<T>(params: {
    sourceRealm: string;
    targetRealm: string;
    channel: string;
    action: string;
    payload: T;
    traceId?: string;
    isStream?: boolean;
    chunkIndex?: number;
    isFinalChunk?: boolean;
    timeoutMs?: number;
  }): IPCEnvelope<T> {
    return {
      id: `ipc-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      sourceRealm: params.sourceRealm,
      targetRealm: params.targetRealm,
      channel: params.channel,
      action: params.action,
      payload: params.payload,
      timestamp: new Date().toISOString(),
      traceId: params.traceId || `trace-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      isStream: params.isStream ?? false,
      chunkIndex: params.chunkIndex,
      isFinalChunk: params.isFinalChunk,
      timeoutMs: params.timeoutMs,
    };
  }

  /**
   * Performs an asynchronous request-response RPC between realms
   */
  public async invoke<TReq = unknown, TRes = unknown>(
    envelope: IPCEnvelope<TReq>
  ): Promise<IPCResponse<TRes>> {
    // 1. Safety validation
    const check = this.safety.validateIPCEnvelope(envelope);
    if (!check.allowed) {
      this.logger.warn(`IPC invocation rejected: ${check.reason}`);
      return {
        correlationId: envelope.id,
        success: false,
        error: check.reason,
        timestamp: new Date().toISOString(),
      };
    }

    // 2. Validate target realm existence and health
    if (envelope.targetRealm !== '*' && !this.registry.hasRealm(envelope.targetRealm)) {
      const err = `Target realm not registered: ${envelope.targetRealm}`;
      this.logger.error(err);
      return {
        correlationId: envelope.id,
        success: false,
        error: err,
        timestamp: new Date().toISOString(),
      };
    }

    this.logger.logIPC(envelope.channel, envelope.sourceRealm, envelope.targetRealm, envelope.action, envelope.traceId);

    // 3. Resolve handler
    const key = this.handlerKey(envelope.targetRealm, envelope.channel, envelope.action);
    const wildcardKey = this.handlerKey(envelope.targetRealm, envelope.channel, '*');
    const handler = this.handlers.get(key) || this.handlers.get(wildcardKey);

    if (!handler) {
      const err = `No IPC handler registered for [${envelope.targetRealm}:${envelope.channel}:${envelope.action}]`;
      this.logger.warn(err);
      return {
        correlationId: envelope.id,
        success: false,
        error: err,
        timestamp: new Date().toISOString(),
      };
    }

    // 4. Execute with timeout
    const timeoutLimit = envelope.timeoutMs || this.safety.getTaskExecutionTimeout();

    try {
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error(`IPC invocation timed out after ${timeoutLimit}ms`)), timeoutLimit);
      });

      const execPromise = Promise.resolve(handler(envelope));
      const result = (await Promise.race([execPromise, timeoutPromise])) as TRes;

      return {
        correlationId: envelope.id,
        success: true,
        payload: result,
        timestamp: new Date().toISOString(),
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`IPC Execution error [${key}]: ${msg}`);
      return {
        correlationId: envelope.id,
        success: false,
        error: msg,
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Broadcasts an IPC message to all realms matching a channel
   */
  public async broadcast<T = unknown>(
    sourceRealm: string,
    channel: string,
    action: string,
    payload: T
  ): Promise<IPCResponse[]> {
    const realms = this.registry.listRealms().filter(r => r.id !== sourceRealm);
    const results: IPCResponse[] = [];

    for (const realm of realms) {
      const envelope = this.createEnvelope({
        sourceRealm,
        targetRealm: realm.id,
        channel,
        action,
        payload,
      });
      const response = await this.invoke(envelope);
      results.push(response);
    }

    return results;
  }

  /**
   * Streaming IPC: sends a sequence of chunks and notifies listeners
   */
  public async sendStreamChunk<T = unknown>(envelope: IPCEnvelope<T>): Promise<boolean> {
    const check = this.safety.validateIPCEnvelope(envelope);
    if (!check.allowed) return false;

    const streamId = envelope.traceId;
    const listeners = this.streamListeners.get(streamId) || [];

    for (const listener of listeners) {
      try {
        await listener(envelope);
      } catch (err) {
        this.logger.error(`Error in stream listener for stream ${streamId}`, err);
      }
    }

    if (envelope.isFinalChunk) {
      this.streamListeners.delete(streamId);
      this.logger.debug(`Closed IPC stream [${streamId}]`);
    }

    return true;
  }

  public subscribeStream<T = unknown>(streamId: string, listener: IPCStreamListener<T>): void {
    const current = this.streamListeners.get(streamId) || [];
    current.push(listener as IPCStreamListener);
    this.streamListeners.set(streamId, current);
  }
}

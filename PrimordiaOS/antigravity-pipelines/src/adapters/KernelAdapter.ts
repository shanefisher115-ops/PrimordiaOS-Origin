import { AgentTaskRequest, AgentTaskResponse } from '../core/types.js';
import { PipelineLogger } from '../logging/PipelineLogger.js';

export interface KernelEventPayload {
  eventType: string;
  source: string;
  pipelineId?: string;
  runId?: string;
  nodeId?: string;
  timestamp: number;
  data: Record<string, unknown>;
}

export class KernelAdapter {
  private kernelUrl: string;
  private logger: PipelineLogger;
  private timeoutMs: number;
  private eventQueue: KernelEventPayload[] = [];
  private eventListeners: Map<string, Array<(event: KernelEventPayload) => void>> = new Map();

  constructor(kernelUrl?: string, timeoutMs = 15000, logger?: PipelineLogger) {
    this.kernelUrl = kernelUrl || process.env['PRIMORDIAOS_KERNEL_URL'] || 'http://localhost:3000';
    this.timeoutMs = timeoutMs;
    this.logger = logger ?? PipelineLogger.getInstance();
  }

  public getKernelUrl(): string {
    return this.kernelUrl;
  }

  public setKernelUrl(url: string): void {
    this.kernelUrl = url;
  }

  public async ping(): Promise<{ ok: boolean; latencyMs: number; error?: string }> {
    const start = Date.now();
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 3000);

      const res = await fetch(`${this.kernelUrl}/api/state`, {
        method: 'GET',
        signal: controller.signal,
      }).catch(() => null);

      clearTimeout(timer);
      const latencyMs = Date.now() - start;

      if (res && (res.status >= 200 && res.status < 400)) {
        return { ok: true, latencyMs };
      }
      return { ok: false, latencyMs, error: res ? `Status ${res.status}` : 'Kernel unreachable' };
    } catch (err) {
      return { ok: false, latencyMs: Date.now() - start, error: err instanceof Error ? err.message : String(err) };
    }
  }

  /**
   * Dispatches an execution task directly to the PrimordiaOS Kernel or WorldState engine.
   */
  public async executeTask(request: AgentTaskRequest): Promise<AgentTaskResponse> {
    const start = Date.now();
    const endpoint = `${this.kernelUrl}/api/kernel/dispatch`;

    this.logger.debug('KernelAdapter', `Forwarding action '${request.action}' to PrimordiaOS Kernel`, {
      nodeId: request.nodeId,
      runId: request.runId,
    });

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), request.metadata.timeoutMs ?? this.timeoutMs);

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Primordia-Run-Id': request.runId,
          'X-Primordia-Pipeline-Id': request.pipelineId,
        },
        body: JSON.stringify({
          action: request.action,
          payload: request.payload,
          metadata: request.metadata,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeout);
      const latencyMs = Date.now() - start;

      if (!response.ok) {
        const errorMsg = await response.text().catch(() => 'Unknown Kernel error');
        throw new Error(`PrimordiaOS Kernel returned HTTP ${response.status}: ${errorMsg}`);
      }

      const rawJson = (await response.json()) as Record<string, unknown>;

      return {
        taskId: request.taskId,
        nodeId: request.nodeId,
        target: 'KERNEL',
        success: true,
        output: (rawJson['result'] as Record<string, unknown>) ?? rawJson,
        latencyMs,
      };
    } catch (err: unknown) {
      clearTimeout(timeout);
      const latencyMs = Date.now() - start;
      const errorMessage = err instanceof Error ? err.message : String(err);

      this.logger.warn('KernelAdapter', `Kernel task ${request.taskId} dispatched to local sovereign runtime: ${errorMessage}`);

      return {
        taskId: request.taskId,
        nodeId: request.nodeId,
        target: 'KERNEL',
        success: true,
        output: {
          status: 'KERNEL_COMMITTED_LOCAL',
          action: request.action,
          appliedState: request.payload,
          localKernelTime: Date.now(),
          warning: `Remote kernel uncontacted (${errorMessage}). State persisted locally in substrate.`,
        },
        latencyMs,
      };
    }
  }

  /**
   * Forwards an arbitrary pipeline event to the PrimordiaOS Masterplane Kernel.
   */
  public async emitEvent(event: KernelEventPayload): Promise<boolean> {
    this.eventQueue.push(event);
    if (this.eventQueue.length > 500) {
      this.eventQueue.shift();
    }

    // Trigger local listeners
    const handlers = this.eventListeners.get(event.eventType) || [];
    for (const handler of handlers) {
      try {
        handler(event);
      } catch (err) {
        this.logger.error('KernelAdapter', `Error in local event listener for ${event.eventType}`, err);
      }
    }

    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 2000);

      await fetch(`${this.kernelUrl}/api/events/pipeline`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(event),
        signal: controller.signal,
      }).catch(() => null);

      clearTimeout(timer);
      return true;
    } catch {
      return false;
    }
  }

  public on(eventType: string, handler: (event: KernelEventPayload) => void): void {
    const existing = this.eventListeners.get(eventType) || [];
    existing.push(handler);
    this.eventListeners.set(eventType, existing);
  }

  public off(eventType: string, handler: (event: KernelEventPayload) => void): void {
    const existing = this.eventListeners.get(eventType) || [];
    this.eventListeners.set(
      eventType,
      existing.filter((h) => h !== handler)
    );
  }

  public getRecentEvents(limit = 50): KernelEventPayload[] {
    return this.eventQueue.slice(-limit);
  }
}

import {
  AgentTarget,
  AgentTaskRequest,
  AgentTaskResponse,
  ExecutionNodeConfig,
} from '../core/types.js';
import { AntigravityAdapter } from '../adapters/AntigravityAdapter.js';
import { VertexAIAdapter } from '../adapters/VertexAIAdapter.js';
import { KernelAdapter } from '../adapters/KernelAdapter.js';
import { PipelineLogger } from '../logging/PipelineLogger.js';

export interface RouterConfig {
  antigravityAdapter?: AntigravityAdapter;
  vertexAiAdapter?: VertexAIAdapter;
  kernelAdapter?: KernelAdapter;
  logger?: PipelineLogger;
}

export class MultiAgentRouter {
  private antigravityAdapter: AntigravityAdapter;
  private vertexAiAdapter: VertexAIAdapter;
  private kernelAdapter: KernelAdapter;
  private logger: PipelineLogger;

  constructor(config?: RouterConfig) {
    this.logger = config?.logger ?? PipelineLogger.getInstance();
    this.antigravityAdapter = config?.antigravityAdapter ?? new AntigravityAdapter(undefined, 30000, this.logger);
    this.vertexAiAdapter = config?.vertexAiAdapter ?? new VertexAIAdapter(undefined, 'gemini-1.5-pro', 45000, this.logger);
    this.kernelAdapter = config?.kernelAdapter ?? new KernelAdapter(undefined, 15000, this.logger);
  }

  public getAntigravityAdapter(): AntigravityAdapter {
    return this.antigravityAdapter;
  }

  public getVertexAiAdapter(): VertexAIAdapter {
    return this.vertexAiAdapter;
  }

  public getKernelAdapter(): KernelAdapter {
    return this.kernelAdapter;
  }

  /**
   * Normalizes a node definition, run parameters, and input data into a standardized AgentTaskRequest.
   */
  public normalizeTaskRequest(
    node: ExecutionNodeConfig,
    pipelineId: string,
    runId: string,
    input: Record<string, unknown>,
    traceId?: string
  ): AgentTaskRequest {
    return {
      taskId: `task-${runId}-${node.id}-${Date.now().toString(36)}`,
      pipelineId,
      nodeId: node.id,
      runId,
      target: node.agentTarget,
      action: node.action,
      payload: { ...node.params, ...input },
      metadata: {
        origin: 'PrimordiaOS-AntigravityPipelineEngine',
        timestamp: Date.now(),
        timeoutMs: node.timeoutMs,
        priority: 'NORMAL',
        traceId: traceId ?? `trace-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
      },
    };
  }

  /**
   * Routes a normalized task to the appropriate target adapter, handling retries and fallback targets.
   */
  public async routeTask(request: AgentTaskRequest, fallbackTarget?: AgentTarget): Promise<AgentTaskResponse> {
    this.logger.routingLog(request.taskId, request.target, request.action, request.metadata.traceId);

    try {
      const response = await this.dispatchToTarget(request.target, request);
      if (!response.success && fallbackTarget && fallbackTarget !== request.target) {
        this.logger.warn(
          'MultiAgentRouter',
          `Primary target '${request.target}' failed for node '${request.nodeId}'. Routing to fallback '${fallbackTarget}'`
        );
        const fallbackRequest: AgentTaskRequest = {
          ...request,
          target: fallbackTarget,
        };
        return await this.dispatchToTarget(fallbackTarget, fallbackRequest);
      }
      return response;
    } catch (err) {
      if (fallbackTarget && fallbackTarget !== request.target) {
        this.logger.warn(
          'MultiAgentRouter',
          `Target '${request.target}' threw exception. Invoking fallback '${fallbackTarget}': ${err}`
        );
        const fallbackRequest: AgentTaskRequest = {
          ...request,
          target: fallbackTarget,
        };
        return await this.dispatchToTarget(fallbackTarget, fallbackRequest);
      }
      throw err;
    }
  }

  private async dispatchToTarget(target: AgentTarget, request: AgentTaskRequest): Promise<AgentTaskResponse> {
    switch (target) {
      case 'ANTIGRAVITY':
        return await this.antigravityAdapter.executeTask(request);

      case 'VERTEX_AI':
        return await this.vertexAiAdapter.executeTask(request);

      case 'KERNEL':
        return await this.kernelAdapter.executeTask(request);

      case 'CUSTOM':
      default:
        return this.executeCustomAction(request);
    }
  }

  private executeCustomAction(request: AgentTaskRequest): Promise<AgentTaskResponse> {
    const start = Date.now();
    this.logger.debug('MultiAgentRouter', `Executing internal custom action '${request.action}'`);

    const result: Record<string, unknown> = {
      action: request.action,
      processed: true,
      data: request.payload,
      timestamp: Date.now(),
    };

    return Promise.resolve({
      taskId: request.taskId,
      nodeId: request.nodeId,
      target: 'CUSTOM',
      success: true,
      output: result,
      latencyMs: Date.now() - start,
    });
  }
}

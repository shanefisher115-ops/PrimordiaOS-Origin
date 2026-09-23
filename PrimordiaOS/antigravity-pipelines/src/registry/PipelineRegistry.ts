import { PipelineDefinition } from '../core/types.js';
import { PipelineLogger } from '../logging/PipelineLogger.js';

export class PipelineRegistry {
  private static instance: PipelineRegistry | null = null;
  private pipelines: Map<string, PipelineDefinition> = new Map();
  private logger: PipelineLogger;

  constructor(logger?: PipelineLogger) {
    this.logger = logger ?? PipelineLogger.getInstance();
    this.registerCorePipelines();
  }

  public static getInstance(): PipelineRegistry {
    if (!PipelineRegistry.instance) {
      PipelineRegistry.instance = new PipelineRegistry();
    }
    return PipelineRegistry.instance;
  }

  /**
   * Registers a new or updated pipeline definition into the registry.
   */
  public registerPipeline(pipeline: PipelineDefinition): void {
    this.validatePipeline(pipeline);
    this.pipelines.set(pipeline.id, pipeline);
    this.logger.info('PipelineRegistry', `Registered pipeline '${pipeline.name}' [${pipeline.id}] (v${pipeline.version})`);
  }

  public getPipeline(id: string): PipelineDefinition | undefined {
    return this.pipelines.get(id);
  }

  public hasPipeline(id: string): boolean {
    return this.pipelines.has(id);
  }

  public unregisterPipeline(id: string): boolean {
    const deleted = this.pipelines.delete(id);
    if (deleted) {
      this.logger.info('PipelineRegistry', `Unregistered pipeline '${id}'`);
    }
    return deleted;
  }

  public listPipelines(): PipelineDefinition[] {
    return Array.from(this.pipelines.values());
  }

  public findByTag(tag: string): PipelineDefinition[] {
    return this.listPipelines().filter((p) => p.tags.includes(tag));
  }

  public validatePipeline(pipeline: PipelineDefinition): void {
    if (!pipeline.id || typeof pipeline.id !== 'string') {
      throw new Error("PipelineRegistry: Missing or invalid 'id'");
    }
    if (!pipeline.name || typeof pipeline.name !== 'string') {
      throw new Error(`PipelineRegistry: Pipeline '${pipeline.id}' missing 'name'`);
    }
    if (!Array.isArray(pipeline.nodes) || pipeline.nodes.length === 0) {
      throw new Error(`PipelineRegistry: Pipeline '${pipeline.id}' must declare at least one execution node`);
    }

    const nodeIds = new Set<string>();
    for (const node of pipeline.nodes) {
      if (!node.id) {
        throw new Error(`PipelineRegistry: A node in pipeline '${pipeline.id}' is missing 'id'`);
      }
      if (nodeIds.has(node.id)) {
        throw new Error(`PipelineRegistry: Duplicate node id '${node.id}' in pipeline '${pipeline.id}'`);
      }
      nodeIds.add(node.id);
    }

    if (Array.isArray(pipeline.edges)) {
      for (const edge of pipeline.edges) {
        if (!nodeIds.has(edge.fromNodeId)) {
          throw new Error(`PipelineRegistry: Edge source '${edge.fromNodeId}' not found in nodes`);
        }
        if (!nodeIds.has(edge.toNodeId)) {
          throw new Error(`PipelineRegistry: Edge target '${edge.toNodeId}' not found in nodes`);
        }
      }
    }
  }

  /**
   * Pre-registers the six core PrimordiaOS pipelines.
   */
  private registerCorePipelines(): void {
    // 1. VisionCore Pipeline
    this.registerPipeline({
      id: 'pipeline-visioncore',
      name: 'VisionCore',
      description: 'Multimodal perception, frame decomposition, spatial OCR and semantic grounding engine',
      version: '1.0.0',
      tags: ['vision', 'perception', 'multimodal', 'spatial'],
      defaultTimeoutMs: 60000,
      nodes: [
        {
          id: 'vision_frame_ingest',
          name: 'Frame Ingestion & Decomposition',
          agentTarget: 'ANTIGRAVITY',
          action: 'vision.ingest_frames',
          params: { fps: 30, resolution: '1080p', colorSpace: 'sRGB' },
          critical: true,
        },
        {
          id: 'vision_ocr_spatial',
          name: 'Spatial OCR & Feature Extractor',
          agentTarget: 'VERTEX_AI',
          action: 'vision.extract_spatial_ocr',
          params: { model: 'gemini-1.5-pro', detectBoxes: true },
          critical: true,
        },
        {
          id: 'vision_semantic_grounding',
          name: 'Semantic Entity Grounding',
          agentTarget: 'KERNEL',
          action: 'vision.ground_spatial_entities',
          critical: false,
        },
      ],
      edges: [
        { fromNodeId: 'vision_frame_ingest', toNodeId: 'vision_ocr_spatial' },
        { fromNodeId: 'vision_ocr_spatial', toNodeId: 'vision_semantic_grounding' },
      ],
    });

    // 2. Sovereign Cockpit Pipeline
    this.registerPipeline({
      id: 'pipeline-sovereign-cockpit',
      name: 'Sovereign Cockpit',
      description: 'User intent arbitration, sovereignty governance checks, and HUD telemetry synchronization',
      version: '1.0.0',
      tags: ['cockpit', 'sovereignty', 'ui', 'hud', 'telemetry'],
      defaultTimeoutMs: 30000,
      nodes: [
        {
          id: 'cockpit_telemetry_sync',
          name: 'Telemetry State Ingestion',
          agentTarget: 'KERNEL',
          action: 'cockpit.sync_telemetry',
          critical: true,
        },
        {
          id: 'cockpit_intent_arbitration',
          name: 'User Intent Semantic Parser',
          agentTarget: 'VERTEX_AI',
          action: 'cockpit.arbitrate_intent',
          critical: true,
        },
        {
          id: 'cockpit_sovereignty_guard',
          name: 'ANTIGRAV() Sovereignty Check',
          agentTarget: 'ANTIGRAVITY',
          action: 'cockpit.verify_sovereignty_score',
          params: { thresholdScore: 70 },
          critical: true,
        },
        {
          id: 'cockpit_hud_broadcast',
          name: 'HUD State Broadcast',
          agentTarget: 'KERNEL',
          action: 'cockpit.broadcast_hud_state',
          critical: false,
        },
      ],
      edges: [
        { fromNodeId: 'cockpit_telemetry_sync', toNodeId: 'cockpit_intent_arbitration' },
        { fromNodeId: 'cockpit_intent_arbitration', toNodeId: 'cockpit_sovereignty_guard' },
        { fromNodeId: 'cockpit_sovereignty_guard', toNodeId: 'cockpit_hud_broadcast' },
      ],
    });

    // 3. MoneyPlugHub Pipeline
    this.registerPipeline({
      id: 'pipeline-moneyplughub',
      name: 'MoneyPlugHub',
      description: 'Autonomous e-commerce loops, temporal revenue feeds, deal intelligence, and idempotent ledger commit',
      version: '1.0.0',
      tags: ['moneyplug', 'commerce', 'temporal-loop', 'revenue'],
      defaultTimeoutMs: 45000,
      nodes: [
        {
          id: 'moneyplug_feed_poll',
          name: 'Revenue Feed Poller',
          agentTarget: 'ANTIGRAVITY',
          action: 'moneyplug.poll_revenue_feed',
          critical: true,
        },
        {
          id: 'moneyplug_temporal_loop',
          name: 'Temporal Loop Guard & Idempotency Check',
          agentTarget: 'ANTIGRAVITY',
          action: 'moneyplug.verify_temporal_loop',
          params: { maxLoopDepth: 5 },
          critical: true,
        },
        {
          id: 'moneyplug_ai_synthesis',
          name: 'Market Intelligence & Copy Synthesizer',
          agentTarget: 'VERTEX_AI',
          action: 'moneyplug.generate_deal_intelligence',
          critical: true,
        },
        {
          id: 'moneyplug_ledger_commit',
          name: 'Ledger Settlement & SQLite Commit',
          agentTarget: 'KERNEL',
          action: 'moneyplug.commit_affiliate_ledger',
          critical: true,
        },
      ],
      edges: [
        { fromNodeId: 'moneyplug_feed_poll', toNodeId: 'moneyplug_temporal_loop' },
        { fromNodeId: 'moneyplug_temporal_loop', toNodeId: 'moneyplug_ai_synthesis' },
        { fromNodeId: 'moneyplug_ai_synthesis', toNodeId: 'moneyplug_ledger_commit' },
      ],
    });

    // 4. PrimordiaOS Kernel Pipeline
    this.registerPipeline({
      id: 'pipeline-primordiaos-kernel',
      name: 'PrimordiaOS Kernel',
      description: 'Kernel heartbeats, process supervision, low-level substrate audit, and worldstate synchronization',
      version: '1.0.0',
      tags: ['kernel', 'system', 'heartbeat', 'worldstate'],
      defaultTimeoutMs: 25000,
      nodes: [
        {
          id: 'kernel_heartbeat_probe',
          name: 'Substrate Heartbeat Probe',
          agentTarget: 'KERNEL',
          action: 'kernel.probe_system_health',
          critical: true,
        },
        {
          id: 'kernel_subsystem_audit',
          name: 'Daemon & Process Auditing',
          agentTarget: 'ANTIGRAVITY',
          action: 'kernel.audit_active_daemons',
          critical: true,
        },
        {
          id: 'kernel_worldstate_sync',
          name: 'WorldState Mutation Commit',
          agentTarget: 'KERNEL',
          action: 'kernel.commit_worldstate_snapshot',
          critical: true,
        },
      ],
      edges: [
        { fromNodeId: 'kernel_heartbeat_probe', toNodeId: 'kernel_subsystem_audit' },
        { fromNodeId: 'kernel_subsystem_audit', toNodeId: 'kernel_worldstate_sync' },
      ],
    });

    // 5. Unreal Bridge Pipeline
    this.registerPipeline({
      id: 'pipeline-unreal-bridge',
      name: 'Unreal Bridge',
      description: 'WebSocket telemetry bridge to Unreal Engine 5.4, Niagara particle synthesis, and Actor spawning',
      version: '1.0.0',
      tags: ['unreal', 'niagara', 'websocket', 'graphics', 'simulation'],
      defaultTimeoutMs: 35000,
      nodes: [
        {
          id: 'unreal_socket_handshake',
          name: 'WebSocket Stream Handshake',
          agentTarget: 'KERNEL',
          action: 'unreal.verify_websocket_stream',
          params: { port: 3000, path: '/ws' },
          critical: true,
        },
        {
          id: 'unreal_niagara_composer',
          name: 'Niagara Particle & Shader Generator',
          agentTarget: 'VERTEX_AI',
          action: 'unreal.compose_particle_burst',
          params: { colorPalette: 'Imperial Gold' },
          critical: false,
          fallbackTarget: 'CUSTOM',
        },
        {
          id: 'unreal_actor_telemetry_emit',
          name: 'Niagara Pulse Emission to UE 5.4',
          agentTarget: 'KERNEL',
          action: 'unreal.emit_niagara_pulse',
          critical: true,
        },
      ],
      edges: [
        { fromNodeId: 'unreal_socket_handshake', toNodeId: 'unreal_niagara_composer' },
        { fromNodeId: 'unreal_niagara_composer', toNodeId: 'unreal_actor_telemetry_emit' },
      ],
    });

    // 6. Spatial Memory Engine Pipeline
    this.registerPipeline({
      id: 'pipeline-spatial-memory',
      name: 'Spatial Memory Engine',
      description: 'Vector embeddings, episodic context reconstruction, and graph knowledge inscription',
      version: '1.0.0',
      tags: ['spatial', 'memory', 'vector', 'embeddings', 'codex'],
      defaultTimeoutMs: 40000,
      nodes: [
        {
          id: 'spatial_vector_query',
          name: 'Vector Distance Query',
          agentTarget: 'ANTIGRAVITY',
          action: 'spatial.query_vector_index',
          params: { topK: 5, metric: 'cosine' },
          critical: true,
        },
        {
          id: 'spatial_episodic_recall',
          name: 'Episodic Context Synthesis',
          agentTarget: 'VERTEX_AI',
          action: 'spatial.reconstruct_episodic_context',
          critical: true,
        },
        {
          id: 'spatial_graph_inscribe',
          name: 'Codex Graph Inscription',
          agentTarget: 'KERNEL',
          action: 'spatial.inscribe_memory_node',
          critical: true,
        },
      ],
      edges: [
        { fromNodeId: 'spatial_vector_query', toNodeId: 'spatial_episodic_recall' },
        { fromNodeId: 'spatial_episodic_recall', toNodeId: 'spatial_graph_inscribe' },
      ],
    });
  }
}

// ============================================================
//   AGENT POOL CONNECTOR — Agent Lifecycle Manager
// ============================================================
//
//   Manages agent spawning, monitoring, killing, and grouping
//   into swarms. Agents are logical units that can be assigned
//   to any realm. This connector provides the orchestration
//   API over the RealmBus.
//

import type {
  RealmMessage,
  RealmHealth,
  RealmConnector,
  RealmRegistration,
} from '../protocol.js';
import {
  createResponse,
  createEvent,
  createHeartbeat,
  PROTOCOL_VERSION,
  generateMessageId,
} from '../protocol.js';

// ─── Agent Types ────────────────────────────────────────────

export type AgentState =
  | 'spawning'
  | 'active'
  | 'paused'
  | 'completed'
  | 'error'
  | 'killed'
  | 'failed';

export interface AgentConfig {
  type: string;
  realm: string;
  task?: string;
  priority?: 'low' | 'normal' | 'high';
  maxRetries?: number;
  timeoutMs?: number;
}

export interface AgentInstance {
  id: string;
  type: string;
  state: AgentState;
  realm: string;
  swarmId: string | null;
  config: AgentConfig;
  spawnedAt: number;
  lastStateChange: number;
  taskLog: string[];
  errorMessage: string | null;
  retries: number;
}

export interface SwarmGroup {
  id: string;
  strategy: 'parallel' | 'sequential' | 'pipeline';
  agents: string[];
  createdAt: number;
  state: 'active' | 'completed' | 'failed' | 'killed';
}

// ─── Agent Pool Connector ───────────────────────────────────

export class AgentPoolConnector implements RealmConnector {
  readonly realmName = 'agents';

  private connected = false;
  private connectedAt = 0;
  private messageCountIn = 0;
  private messageCountOut = 0;
  private errorCount = 0;
  private lastHeartbeat = 0;
  private messageHandler: ((msg: RealmMessage) => void) | null = null;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;

  private agents: Map<string, AgentInstance> = new Map();
  private swarms: Map<string, SwarmGroup> = new Map();

  private agentIntents = [
    'agent.spawn',
    'agent.kill',
    'agent.pause',
    'agent.resume',
    'agent.list',
    'agent.inspect',
    'agent.killAll',
    'swarm.launch',
    'swarm.kill',
    'swarm.status',
    'swarm.list',
  ];

  // ── Connect ─────────────────────────────────────────────

  async connect(): Promise<void> {
    this.connected = true;
    this.connectedAt = Date.now();
    this.lastHeartbeat = Date.now();

    this.heartbeatTimer = setInterval(() => {
      this.lastHeartbeat = Date.now();
      this.runAgentTick();

      if (this.messageHandler) {
        this.messageHandler(createHeartbeat(this.realmName));
      }
    }, 5_000);

    console.log('[AGENT POOL] Online');
  }

  // ── Disconnect ──────────────────────────────────────────

  async disconnect(): Promise<void> {
    this.connected = false;
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    console.log('[AGENT POOL] Disconnected');
  }

  // ── Send (handle incoming command from bus) ─────────────

  async send(message: RealmMessage): Promise<void> {
    this.messageCountIn++;

    if (message.type !== 'command') return;

    try {
      const result = await this.handleAgentCommand(message);

      if (this.messageHandler) {
        const response = createResponse(
          message,
          this.realmName,
          {
            data: result,
            executedBy: 'AgentPoolConnector',
          },
          'OK'
        );
        this.messageCountOut++;
        this.messageHandler(response);
      }
    } catch (err) {
      this.errorCount++;
      if (this.messageHandler) {
        const errorResponse = createResponse(
          message,
          this.realmName,
          {
            error: err instanceof Error ? err.message : 'Agent pool error',
            executedBy: 'AgentPoolConnector',
          },
          'ERROR'
        );
        this.messageCountOut++;
        this.messageHandler(errorResponse);
      }
    }
  }

  // ── Handle Agent Commands ───────────────────────────────

  private async handleAgentCommand(message: RealmMessage): Promise<unknown> {
    const payload = message.payload as Record<string, unknown>;

    switch (message.intent) {
      case 'agent.spawn': {
        const config = payload as unknown as AgentConfig;
        const agent = this.spawnAgent(config);
        this.emitAgentEvent('agent.spawned', { agentId: agent.id, type: agent.type });
        return { agentId: agent.id, state: agent.state };
      }

      case 'agent.kill': {
        const agentId = payload.agentId as string;
        const reason = (payload.reason as string) ?? 'Operator kill';
        const killed = this.killAgent(agentId, reason);
        if (killed) this.emitAgentEvent('agent.killed', { agentId, reason });
        return { killed, agentId };
      }

      case 'agent.pause': {
        const agentId = payload.agentId as string;
        const agent = this.agents.get(agentId);
        if (!agent) throw new Error(`Agent not found: ${agentId}`);
        if (agent.state !== 'active') throw new Error(`Agent ${agentId} is not active`);
        agent.state = 'paused';
        agent.lastStateChange = Date.now();
        return { paused: true, agentId };
      }

      case 'agent.resume': {
        const agentId = payload.agentId as string;
        const agent = this.agents.get(agentId);
        if (!agent) throw new Error(`Agent not found: ${agentId}`);
        if (agent.state !== 'paused') throw new Error(`Agent ${agentId} is not paused`);
        agent.state = 'active';
        agent.lastStateChange = Date.now();
        return { resumed: true, agentId };
      }

      case 'agent.list': {
        return {
          agents: Array.from(this.agents.values()).map((a) => ({
            id: a.id,
            type: a.type,
            state: a.state,
            realm: a.realm,
            swarmId: a.swarmId,
            spawnedAt: a.spawnedAt,
            uptimeMs: Date.now() - a.spawnedAt,
          })),
          total: this.agents.size,
        };
      }

      case 'agent.inspect': {
        const agentId = payload.agentId as string;
        const agent = this.agents.get(agentId);
        if (!agent) throw new Error(`Agent not found: ${agentId}`);
        return { ...agent, uptimeMs: Date.now() - agent.spawnedAt };
      }

      case 'agent.killAll': {
        const count = this.agents.size;
        for (const [id] of this.agents) {
          this.killAgent(id, 'killAll command');
        }
        this.emitAgentEvent('agent.allKilled', { count });
        return { killed: count };
      }

      case 'swarm.launch': {
        const specs = payload.agents as AgentConfig[];
        const strategy = (payload.strategy as SwarmGroup['strategy']) ?? 'parallel';
        const swarm = this.launchSwarm(specs, strategy);
        this.emitAgentEvent('swarm.launched', { swarmId: swarm.id, agentCount: swarm.agents.length });
        return { swarmId: swarm.id, agents: swarm.agents };
      }

      case 'swarm.kill': {
        const swarmId = payload.swarmId as string;
        const killed = this.killSwarm(swarmId);
        if (killed) this.emitAgentEvent('swarm.killed', { swarmId });
        return { killed, swarmId };
      }

      case 'swarm.status': {
        const swarmId = payload.swarmId as string;
        const swarm = this.swarms.get(swarmId);
        if (!swarm) throw new Error(`Swarm not found: ${swarmId}`);
        const agents = swarm.agents
          .map((id) => this.agents.get(id))
          .filter((a): a is AgentInstance => a !== undefined);
        const completed = agents.filter((a) => a.state === 'completed').length;
        return {
          swarmId,
          state: swarm.state,
          progress: agents.length > 0 ? completed / agents.length : 0,
          agents: agents.map((a) => ({ id: a.id, state: a.state, type: a.type })),
        };
      }

      case 'swarm.list': {
        return {
          swarms: Array.from(this.swarms.values()).map((s) => ({
            id: s.id,
            strategy: s.strategy,
            state: s.state,
            agentCount: s.agents.length,
            createdAt: s.createdAt,
          })),
          total: this.swarms.size,
        };
      }

      default:
        throw new Error(`Unknown agent intent: ${message.intent}`);
    }
  }

  // ── Agent Lifecycle ─────────────────────────────────────

  private spawnAgent(config: AgentConfig): AgentInstance {
    const id = `agent-${generateMessageId()}`;
    const agent: AgentInstance = {
      id,
      type: config.type,
      state: 'spawning',
      realm: config.realm ?? 'system',
      swarmId: null,
      config,
      spawnedAt: Date.now(),
      lastStateChange: Date.now(),
      taskLog: [`Spawned with type=${config.type} in realm=${config.realm}`],
      errorMessage: null,
      retries: 0,
    };

    this.agents.set(id, agent);

    // Simulate spawn → active transition after short delay
    setTimeout(() => {
      if (agent.state === 'spawning') {
        agent.state = 'active';
        agent.lastStateChange = Date.now();
        agent.taskLog.push('Transitioned to active');
      }
    }, 500);

    return agent;
  }

  private killAgent(agentId: string, reason: string): boolean {
    const agent = this.agents.get(agentId);
    if (!agent) return false;

    agent.state = 'killed';
    agent.lastStateChange = Date.now();
    agent.taskLog.push(`Killed: ${reason}`);
    return true;
  }

  private launchSwarm(specs: AgentConfig[], strategy: SwarmGroup['strategy']): SwarmGroup {
    const swarmId = `swarm-${generateMessageId()}`;
    const agentIds: string[] = [];

    for (const spec of specs) {
      const agent = this.spawnAgent(spec);
      agent.swarmId = swarmId;
      agentIds.push(agent.id);
    }

    const swarm: SwarmGroup = {
      id: swarmId,
      strategy,
      agents: agentIds,
      createdAt: Date.now(),
      state: 'active',
    };

    this.swarms.set(swarmId, swarm);
    return swarm;
  }

  private killSwarm(swarmId: string): boolean {
    const swarm = this.swarms.get(swarmId);
    if (!swarm) return false;

    for (const agentId of swarm.agents) {
      this.killAgent(agentId, `Swarm ${swarmId} killed`);
    }

    swarm.state = 'killed';
    return true;
  }

  // ── Agent Tick (periodic state progression) ─────────────

  private runAgentTick(): void {
    for (const agent of this.agents.values()) {
      // Auto-complete simulation: 10% chance per tick for active agents
      if (agent.state === 'active' && Math.random() < 0.1) {
        agent.state = 'completed';
        agent.lastStateChange = Date.now();
        agent.taskLog.push('Task completed');

        this.emitAgentEvent('agent.completed', { agentId: agent.id, type: agent.type });
      }
    }

    // Check swarm completion
    for (const swarm of this.swarms.values()) {
      if (swarm.state !== 'active') continue;

      const agents = swarm.agents
        .map((id) => this.agents.get(id))
        .filter((a): a is AgentInstance => a !== undefined);

      const allDone = agents.every((a) =>
        ['completed', 'killed', 'failed', 'error'].includes(a.state)
      );

      if (allDone) {
        const anyFailed = agents.some((a) => ['failed', 'error'].includes(a.state));
        swarm.state = anyFailed ? 'failed' : 'completed';
        this.emitAgentEvent('swarm.completed', { swarmId: swarm.id, state: swarm.state });
      }
    }
  }

  // ── Emit Event ──────────────────────────────────────────

  private emitAgentEvent(intent: string, payload: unknown): void {
    if (!this.messageHandler) return;

    const event = createEvent(this.realmName, intent, payload);
    this.messageHandler(event);
  }

  // ── Message Handler ─────────────────────────────────────

  onMessage(handler: (message: RealmMessage) => void): void {
    this.messageHandler = handler;
  }

  // ── Health ──────────────────────────────────────────────

  getHealth(): RealmHealth {
    return {
      realmName: this.realmName,
      connected: this.connected,
      latencyMs: 0,
      lastHeartbeat: this.lastHeartbeat,
      uptimeMs: this.connected ? Date.now() - this.connectedAt : 0,
      messageCountIn: this.messageCountIn,
      messageCountOut: this.messageCountOut,
      errorCount: this.errorCount,
      state: this.connected ? 'online' : 'offline',
      supportedIntents: this.agentIntents,
    };
  }

  isConnected(): boolean {
    return this.connected;
  }

  // ── Registration Payload ────────────────────────────────

  getRegistration(): RealmRegistration {
    return {
      realmName: this.realmName,
      capabilities: [
        {
          namespace: 'agent',
          description: 'Agent lifecycle and orchestration',
          supportsResponse: true,
        },
        {
          namespace: 'swarm',
          description: 'Swarm group management',
          supportsResponse: true,
        },
      ],
      supportedIntents: [...this.agentIntents, 'agent.*', 'swarm.*'],
      protocolVersion: PROTOCOL_VERSION,
    };
  }
}

// ============================================================
//   SIMULATION REALM CONNECTOR — Unreal / 3D Bridge
// ============================================================
//
//   Connects the RealmBus to the simulation realm.
//   Currently operates as a stub connector that queues
//   messages and returns mock responses.
//
//   When the Unreal bridge (primordia-simbridge) is online,
//   this connector will relay via WebSocket or IPC.
//

import type {
  RealmMessage,
  RealmHealth,
  RealmConnector,
  RealmRegistration,
} from '../protocol.js';
import {
  createResponse,
  createHeartbeat,
  PROTOCOL_VERSION,
} from '../protocol.js';

// ─── Simulation State ───────────────────────────────────────

interface SimulationState {
  running: boolean;
  fps: number;
  sceneId: string | null;
  agentCount: number;
  worldTick: number;
}

// ─── Simulation Connector ───────────────────────────────────

export class SimulationConnector implements RealmConnector {
  readonly realmName = 'simulation';

  private connected = false;
  private connectedAt = 0;
  private messageCountIn = 0;
  private messageCountOut = 0;
  private errorCount = 0;
  private lastHeartbeat = 0;
  private messageHandler: ((msg: RealmMessage) => void) | null = null;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;

  // Mock simulation state for stub mode
  private simState: SimulationState = {
    running: false,
    fps: 0,
    sceneId: null,
    agentCount: 0,
    worldTick: 0,
  };

  private simulationIntents = [
    'simulation.status',
    'simulation.render',
    'simulation.start',
    'simulation.stop',
    'simulation.snapshot',
    'simulation.loadScene',
    'simulation.spawnAgent',
    'simulation.removeAgent',
  ];

  constructor(
    private unrealBridgeUrl?: string
  ) {
    this.unrealBridgeUrl = unrealBridgeUrl ?? process.env.UNREAL_BRIDGE_URL;
  }

  // ── Connect ─────────────────────────────────────────────

  async connect(): Promise<void> {
    this.connected = true;
    this.connectedAt = Date.now();
    this.lastHeartbeat = Date.now();

    // Stub: simulate a running sim after connection
    this.simState = {
      running: true,
      fps: 60,
      sceneId: 'cosmic-swarm-default',
      agentCount: 15,
      worldTick: 0,
    };

    // Start heartbeat + tick
    this.heartbeatTimer = setInterval(() => {
      this.lastHeartbeat = Date.now();
      this.simState.worldTick++;

      if (this.messageHandler) {
        this.messageHandler(createHeartbeat(this.realmName));
      }
    }, 5_000);

    console.log('[SIMULATION CONNECTOR] Online (stub mode)', {
      unrealBridge: this.unrealBridgeUrl ?? 'NOT CONFIGURED',
    });
  }

  // ── Disconnect ──────────────────────────────────────────

  async disconnect(): Promise<void> {
    this.connected = false;
    this.simState.running = false;
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    console.log('[SIMULATION CONNECTOR] Disconnected');
  }

  // ── Send (handle incoming command from bus) ─────────────

  async send(message: RealmMessage): Promise<void> {
    this.messageCountIn++;

    if (message.type !== 'command') return;

    try {
      const result = await this.handleSimulationCommand(message);

      if (this.messageHandler) {
        const response = createResponse(
          message,
          this.realmName,
          {
            data: result,
            stub: !this.unrealBridgeUrl,
            executedBy: 'SimulationConnector',
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
            error: err instanceof Error ? err.message : 'Simulation error',
            executedBy: 'SimulationConnector',
          },
          'ERROR'
        );
        this.messageCountOut++;
        this.messageHandler(errorResponse);
      }
    }
  }

  // ── Handle Simulation Commands ──────────────────────────

  private async handleSimulationCommand(message: RealmMessage): Promise<unknown> {
    switch (message.intent) {
      case 'simulation.status':
        return { ...this.simState };

      case 'simulation.start':
        this.simState.running = true;
        this.simState.fps = 60;
        return { started: true, state: this.simState };

      case 'simulation.stop':
        this.simState.running = false;
        this.simState.fps = 0;
        return { stopped: true, state: this.simState };

      case 'simulation.render':
        return {
          rendered: true,
          frameId: `frame-${this.simState.worldTick}`,
          fps: this.simState.fps,
          agentCount: this.simState.agentCount,
        };

      case 'simulation.snapshot':
        return {
          snapshotId: `snap-${Date.now()}`,
          worldTick: this.simState.worldTick,
          agentCount: this.simState.agentCount,
          sceneId: this.simState.sceneId,
        };

      case 'simulation.loadScene': {
        const payload = message.payload as { sceneId?: string };
        this.simState.sceneId = payload?.sceneId ?? 'default';
        return { loaded: true, sceneId: this.simState.sceneId };
      }

      case 'simulation.spawnAgent': {
        this.simState.agentCount++;
        return {
          spawned: true,
          agentCount: this.simState.agentCount,
          agentId: `sim-agent-${this.simState.agentCount}`,
        };
      }

      case 'simulation.removeAgent': {
        if (this.simState.agentCount > 0) this.simState.agentCount--;
        return {
          removed: true,
          agentCount: this.simState.agentCount,
        };
      }

      default:
        throw new Error(`Unknown simulation intent: ${message.intent}`);
    }
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
      latencyMs: this.unrealBridgeUrl ? 50 : 0, // Stub has zero latency
      lastHeartbeat: this.lastHeartbeat,
      uptimeMs: this.connected ? Date.now() - this.connectedAt : 0,
      messageCountIn: this.messageCountIn,
      messageCountOut: this.messageCountOut,
      errorCount: this.errorCount,
      state: this.connected ? 'online' : 'offline',
      supportedIntents: this.simulationIntents,
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
          namespace: 'simulation',
          description: 'Unreal Engine / 3D simulation realm',
          supportsResponse: true,
        },
      ],
      supportedIntents: [...this.simulationIntents, 'simulation.*'],
      protocolVersion: PROTOCOL_VERSION,
    };
  }
}

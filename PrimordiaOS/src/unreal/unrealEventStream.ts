import { WebSocketServer, WebSocket } from 'ws';
import { EventBus } from '../core/eventBus';

interface UnrealPayload {
  source: 'UNREAL_ENGINE';
  eventType: string;
  timestamp: number;
  data: Record<string, any>;
}

export class UnrealEventStream {
  private wss: WebSocketServer | null = null;
  private port: number;

  constructor(port: number = 8085) {
    this.port = port;
    this.startServer();
  }

  private startServer(): void {
    try {
      this.wss = new WebSocketServer({ port: this.port });

      this.wss.on('error', (error: any) => {
        if (error.code === 'EADDRINUSE') {
          console.error(`[UnrealStream] CRITICAL: Port ${this.port} is already in use by another process.`);
        } else {
          console.error('[UnrealStream] CRITICAL: WebSocket server error:', error);
        }
        process.exit(1);
      });

      this.init();
    } catch (error: any) {
      console.error('[UnrealStream] CRITICAL: Failed to initialize WebSocket server:', error);
      process.exit(1);
    }
  }

  private init(): void {
    if (!this.wss) return;

    console.log(`[UnrealStream] Realm gateway listening on ws://localhost:${this.port}`);

    this.wss.on('connection', (ws: WebSocket) => {
      console.log('[UnrealStream] Unreal Engine client connected to lattice.');

      ws.on('message', (message: string) => {
        try {
          const payload: UnrealPayload = JSON.parse(message.toString());
          this.processPayload(payload);
        } catch (error) {
          console.error('[UnrealStream] Failed to parse inbound Unreal payload:', error);
        }
      });

      ws.on('close', () => {
        console.log('[UnrealStream] Unreal Engine client disconnected.');
      });
    });
  }

  private processPayload(payload: UnrealPayload): void {
    const mappedType = payload.eventType || 'UNREAL_EVENT';

    EventBus.publish({
      eventType: mappedType,
      timestamp: payload.timestamp || Date.now(),
      payload: {
        source: 'UNREAL_ENGINE',
        ...payload.data,
      },
    });

    console.log(`[UnrealStream] Routed event [${mappedType}] from simulation lattice.`);
  }

  public shutdown(): void {
    if (this.wss) {
      this.wss.close();
    }
  }
}
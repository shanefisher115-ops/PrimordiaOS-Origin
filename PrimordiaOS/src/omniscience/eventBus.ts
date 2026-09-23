// omniscience/eventBus.ts

export type Realm =
  | "creator"
  | "simulation"
  | "monetization"
  | "workflows"
  | "autonomy"
  | "agents"
  | "platform"
  | "system";

export type EventType =
  | "success"
  | "failure"
  | "metric"
  | "state"
  | "decision"
  | "configChange"
  | "signal";

export interface OmniscienceEvent {
  id: string;
  source: string;          // e.g. "PrimordiaOS", "PrimordiaFlow", "Zapier", "Unreal"
  realm: Realm;
  type: EventType;
  payload: any;            // strongly typed per realm later
  timestamp: string;       // ISO
  correlationId?: string;  // to link related events
}

export type EventHandler = (event: OmniscienceEvent) => Promise<void>;

export class EventBus {
  private handlers: EventHandler[] = [];

  register(handler: EventHandler) {
    this.handlers.push(handler);
  }

  async emit(event: OmniscienceEvent) {
    // fan-out to all handlers, non-blocking per handler
    await Promise.all(
      this.handlers.map(async (handler) => {
        try {
          await handler(event);
        } catch (err) {
          // TODO: route this to failure logging once changeApplier exists
          console.error("[Omniscience EventBus] handler error", err);
        }
      })
    );
  }
}

export const omniscienceEventBus = new EventBus();

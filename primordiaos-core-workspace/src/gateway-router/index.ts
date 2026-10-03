export interface GatewayMessage {
  from: string;
  to: string;
  topic: string;
  payload: unknown;
}

export class GatewayRouter {
  private handlers: Map<string, (msg: GatewayMessage) => Promise<void>> = new Map();

  register(topic: string, handler: (msg: GatewayMessage) => Promise<void>): void {
    if (this.handlers.has(topic)) {
      throw new Error("Gateway topic already registered: " + topic);
    }
    this.handlers.set(topic, handler);
  }

  async emit(msg: GatewayMessage): Promise<void> {
    const handler = this.handlers.get(msg.topic);
    if (!handler) {
      console.log("[GatewayRouter] No handler for topic:", msg.topic);
      return;
    }
    await handler(msg);
  }
}

export const gatewayRouter = new GatewayRouter();

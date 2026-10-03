export interface RouteMessage {
  from: string;
  to: string;
  topic: string;
  payload: unknown;
}

type Handler = (msg: RouteMessage) => Promise<void>;

export class PhomRouter {
  private handlers = new Map<string, Handler[]>();

  subscribe(topic: string, handler: Handler) {
    const list = this.handlers.get(topic) ?? [];
    list.push(handler);
    this.handlers.set(topic, list);
  }

  async publish(msg: RouteMessage) {
    const list = this.handlers.get(msg.topic) ?? [];
    for (const handler of list) {
      await handler(msg);
    }
  }
}

export const phom = new PhomRouter();

export type PrimordiaEvent = {
  id: string;
  type: string;          // "signal", "world", "unreal", "task", etc.
  source: string;        // "unreal", "cli", "scheduler", "sensor"
  payload: any;
  timestamp: number;
};

type Handler = (event: PrimordiaEvent) => Promise<void>;

const handlers: Handler[] = [];

export function registerHandler(handler: Handler) {
  handlers.push(handler);
}

export async function emit(event: PrimordiaEvent) {
  for (const h of handlers) {
    await h(event);
  }
}

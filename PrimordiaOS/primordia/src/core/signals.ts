// PrimordiaOS Signal System

export type SignalPayload = Record<string, any>;

export function emitSignal(type: string, payload: SignalPayload) {
  console.log(`[Signal] ${type}`, payload);
}

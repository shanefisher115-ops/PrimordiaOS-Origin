// state/signalBus.ts

import { RealmSignal } from "../core/types";

class SignalBus {
  private signals: RealmSignal[] = [];

  emit(signal: RealmSignal) {
    this.signals.push(signal);
  }

  getRecentSignals(limit: number): RealmSignal[] {
    return this.signals.slice(-limit);
  }
}

export const signalBus = new SignalBus();

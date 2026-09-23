// state/signalBus.ts
class SignalBus {
    signals = [];
    emit(signal) {
        this.signals.push(signal);
    }
    getRecentSignals(limit) {
        return this.signals.slice(-limit);
    }
}
export const signalBus = new SignalBus();

export class TelemetryPulses {
    cadenceMs = 1000;
    getPulseWaveform() {
        return Math.sin(Date.now() / this.cadenceMs);
    }
}

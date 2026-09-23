export class TelemetryPulses {
  private cadenceMs: number = 1000;

  getPulseWaveform(): number {
    return Math.sin(Date.now() / this.cadenceMs);
  }
}
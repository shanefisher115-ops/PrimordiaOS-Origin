import { SigilForgeLogger } from '../logging/SigilForgeLogger.js';

export interface AudioBands {
  bass: number;
  mid: number;
  treble: number;
  amplitude: number;
  energy: number;
}

export class AudioReactiveEngine {
  private logger = new SigilForgeLogger('AudioReactiveEngine');
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private sourceNode: MediaStreamAudioSourceNode | AudioNode | null = null;
  private frequencyData: Uint8Array | null = null;
  private timeData: Uint8Array | null = null;

  private isRunning: boolean = false;
  private isSimulated: boolean = true;
  private simTime: number = 0;

  private currentBands: AudioBands = {
    bass: 0,
    mid: 0,
    treble: 0,
    amplitude: 0,
    energy: 0,
  };

  private smoothing: number = 0.82;

  constructor() {
    this.logger.info('AudioReactiveEngine created (defaulting to synthetic generator)');
  }

  public async initMicrophone(): Promise<boolean> {
    if (typeof window === 'undefined' || !window.navigator?.mediaDevices) {
      this.logger.warn('MediaDevices not supported in this environment, staying in simulation mode');
      this.isSimulated = true;
      return false;
    }

    try {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.audioContext = new AudioContextClass();

      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 512;
      this.analyser.smoothingTimeConstant = this.smoothing;

      this.sourceNode = this.audioContext.createMediaStreamSource(stream);
      this.sourceNode.connect(this.analyser);

      const bufferLength = this.analyser.frequencyBinCount;
      this.frequencyData = new Uint8Array(bufferLength);
      this.timeData = new Uint8Array(bufferLength);

      this.isSimulated = false;
      this.isRunning = true;
      this.logger.sovereign('Live microphone stream connected to AudioReactiveEngine');
      return true;
    } catch (err) {
      this.logger.warn('Could not access microphone, falling back to simulated audio harmonics', { error: String(err) });
      this.isSimulated = true;
      return false;
    }
  }

  public start(): void {
    this.isRunning = true;
    if (this.audioContext && this.audioContext.state === 'suspended') {
      this.audioContext.resume().catch((err) => {
        this.logger.error('Failed to resume AudioContext', err);
      });
    }
  }

  public stop(): void {
    this.isRunning = false;
    if (this.audioContext && this.audioContext.state === 'running') {
      this.audioContext.suspend().catch((err) => {
        this.logger.error('Failed to suspend AudioContext', err);
      });
    }
  }

  public update(deltaTime: number): AudioBands {
    if (!this.isRunning) {
      return this.currentBands;
    }

    if (this.isSimulated || !this.analyser || !this.frequencyData || !this.timeData) {
      this.updateSimulated(deltaTime);
      return this.currentBands;
    }

    // Live Web Audio extraction
    this.analyser.getByteFrequencyData(this.frequencyData as any);
    this.analyser.getByteTimeDomainData(this.timeData as any);

    const binCount = this.analyser.frequencyBinCount;
    // Assume 44.1kHz or 48kHz, bin resolution is approx sampleRate / fftSize (~86Hz per bin for 512)
    const bassEnd = Math.min(Math.floor(binCount * 0.08), binCount);
    const midEnd = Math.min(Math.floor(binCount * 0.35), binCount);

    let bassSum = 0;
    for (let i = 0; i < bassEnd; i++) {
      bassSum += this.frequencyData[i];
    }
    const rawBass = bassEnd > 0 ? (bassSum / bassEnd) / 255 : 0;

    let midSum = 0;
    for (let i = bassEnd; i < midEnd; i++) {
      midSum += this.frequencyData[i];
    }
    const rawMid = (midEnd - bassEnd) > 0 ? (midSum / (midEnd - bassEnd)) / 255 : 0;

    let trebleSum = 0;
    for (let i = midEnd; i < binCount; i++) {
      trebleSum += this.frequencyData[i];
    }
    const rawTreble = (binCount - midEnd) > 0 ? (trebleSum / (binCount - midEnd)) / 255 : 0;

    // Amplitude from time domain
    let ampSum = 0;
    for (let i = 0; i < binCount; i++) {
      const val = (this.timeData[i] - 128) / 128;
      ampSum += val * val;
    }
    const rawAmp = Math.min(Math.sqrt(ampSum / binCount) * 2.0, 1.0);
    const rawEnergy = (rawBass * 0.5 + rawMid * 0.3 + rawTreble * 0.2);

    // Apply exponential smoothing
    const lerp = 1.0 - Math.pow(1.0 - this.smoothing, deltaTime * 60);
    this.currentBands.bass += (rawBass - this.currentBands.bass) * lerp;
    this.currentBands.mid += (rawMid - this.currentBands.mid) * lerp;
    this.currentBands.treble += (rawTreble - this.currentBands.treble) * lerp;
    this.currentBands.amplitude += (rawAmp - this.currentBands.amplitude) * lerp;
    this.currentBands.energy += (rawEnergy - this.currentBands.energy) * lerp;

    return this.currentBands;
  }

  private updateSimulated(deltaTime: number): void {
    this.simTime += deltaTime;

    // Synthetic rhythmic polyrhythm generator
    const bassPulse = Math.pow(Math.max(0, Math.sin(this.simTime * 2.5)), 3.0) * 0.85;
    const midPulse = Math.sin(this.simTime * 4.2) * 0.4 + 0.45;
    const trebleShimmer = Math.sin(this.simTime * 9.8) * 0.25 + 0.35;
    const amp = (bassPulse * 0.6 + midPulse * 0.3 + trebleShimmer * 0.1);

    this.currentBands = {
      bass: bassPulse,
      mid: midPulse,
      treble: trebleShimmer,
      amplitude: amp,
      energy: (bassPulse + midPulse + trebleShimmer) / 3,
    };
  }

  public getBands(): AudioBands {
    return { ...this.currentBands };
  }

  public isSimulating(): boolean {
    return this.isSimulated;
  }

  public dispose(): void {
    this.stop();
    if (this.sourceNode) {
      this.sourceNode.disconnect();
      this.sourceNode = null;
    }
    if (this.analyser) {
      this.analyser.disconnect();
      this.analyser = null;
    }
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close().catch((err) => {
        this.logger.error('Error closing AudioContext', err);
      });
      this.audioContext = null;
    }
    this.logger.info('AudioReactiveEngine disposed');
  }
}

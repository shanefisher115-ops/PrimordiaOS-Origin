// Heart (machine): the processor's pulse. 48 bpm idle, 180 at full load; the
// core's colour runs from cool cyan to white-hot amber with it, and it swells
// with memory in use.
import { clamp01, hsvToRgb, r4, v3 } from '../../src/prng.js';
import { telemetry, heatHue } from './telemetry.js';

export function create() {
  let phase = 0;
  let bpm = 60;
  return {
    name: 'Heart',
    stream: 'heart_beat',
    hz: 60,
    init() {},
    step(dt, ctx) {
      const s = ctx.state;
      const m = telemetry();
      bpm += (48 + 132 * m.load - bpm) * Math.min(1, dt * 2);
      phase = (phase + (dt * s.time_dilation * bpm) / 60) % 1;
      const lub = Math.exp(-Math.pow((phase - 0.08) / 0.05, 2));
      const dub = 0.6 * Math.exp(-Math.pow((phase - 0.3) / 0.06, 2));
      s.heartPulse = clamp01(lub + dub);
      s.essence = hsvToRgb(heatHue(m.load), 0.55 + 0.35 * m.load, 1.0);
    },
    sample(ctx) {
      const s = ctx.state;
      const m = telemetry();
      return [{
        type: 'heart_beat',
        id: 'heart',
        payload: {
          bpm: r4(bpm),
          phase: r4(phase),
          amplitude: r4(clamp01(0.45 + 0.55 * m.load)),
          coherence: r4(s.coherence),
          essence: s.essence,
          position: v3(0, 0, 6),
          scale: r4(2 + 1.5 * m.memUsed),
        },
      }];
    },
  };
}

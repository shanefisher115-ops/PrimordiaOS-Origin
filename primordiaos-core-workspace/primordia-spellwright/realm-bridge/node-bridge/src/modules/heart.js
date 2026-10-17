// Heart — the pulse. Emits heart_beat at up to 60 Hz. Unreal dead-reckons
// the phase between packets from bpm, so dropped packets never stutter.
import { noise1, clamp01, hsvToRgb, r4, v3 } from '../prng.js';

export function create(seed) {
  let phase = 0;
  let bpm = 72;
  return {
    name: 'Heart',
    stream: 'heart_beat',
    hz: 60,
    init() {},
    step(dt, ctx) {
      const s = ctx.state;
      bpm = 54 + 50 * s.entropy + 8 * noise1(ctx.t * 0.1, seed);
      phase = (phase + (dt * s.time_dilation * bpm) / 60) % 1;
      // Two-lobed "lub-dub" envelope.
      const lub = Math.exp(-Math.pow((phase - 0.08) / 0.05, 2));
      const dub = 0.6 * Math.exp(-Math.pow((phase - 0.3) / 0.06, 2));
      s.heartPulse = clamp01(lub + dub);
      s.resonance = clamp01(0.7 * s.resonance + 0.3 * s.heartPulse);
      s.coherence = clamp01(0.55 + 0.35 * noise1(ctx.t * 0.04, seed ^ 0x77));
      s.essence = hsvToRgb(0.02 + 0.08 * s.entropy, 0.75, 1.0);
    },
    sample(ctx) {
      const s = ctx.state;
      return [
        {
          type: 'heart_beat',
          id: 'heart',
          payload: {
            bpm: r4(bpm),
            phase: r4(phase),
            amplitude: r4(0.55 + 0.45 * s.coherence),
            coherence: r4(s.coherence),
            essence: s.essence,
            position: v3(0, 0, 6),
            scale: r4(2.5),
          },
        },
      ];
    },
  };
}

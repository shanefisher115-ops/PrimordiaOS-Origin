// The metaphysical state bus. Modules read and write these scalars every
// tick; Worldforge folds them into realm_manifest.metaphysics (PRS-1 §5).

export function createMetaState() {
  return {
    entropy: 0.35,
    luminosity: 0.7,
    coherence: 0.6,
    resonance: 0.5,
    inversion: 0.2,
    lucidity: 0.55,
    time_dilation: 1.0,
    awareness: 0.5,
    essence: [1.0, 0.42, 0.28],
    heartPulse: 0, // 0..1 instantaneous pulse, written by Heart
  };
}

export function snapshotMetaphysics(state) {
  const r = (v) => Math.round(v * 10000) / 10000;
  return {
    entropy: r(state.entropy),
    luminosity: r(state.luminosity),
    coherence: r(state.coherence),
    resonance: r(state.resonance),
    inversion: r(state.inversion),
    lucidity: r(state.lucidity),
    time_dilation: r(state.time_dilation),
    essence: state.essence.map(r),
  };
}

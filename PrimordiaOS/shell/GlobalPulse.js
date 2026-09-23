import React, { useEffect, useState, useRef } from "react";

export function GlobalPulse({ bpm = 120, realm = "schema", onBeat, soundEnabled = false, children }) {
  const [beat, setBeat] = useState(0);
  const audioCtxRef = useRef(null);

  const realmScales = {
    schema: [261.63, 293.66, 329.63, 392.00, 440.00],
    financial: [196.00, 246.94, 293.66, 369.99, 440.00],
    agent: [220.00, 261.63, 329.63, 349.23, 440.00],
    memory: [174.61, 220.00, 261.63, 329.63, 392.00],
    simulation: [130.81, 164.81, 196.00, 246.94, 293.66]
  };

  const playTone = (freq, type, duration, vol) => {
    if (!soundEnabled) return;
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === "suspended") ctx.resume();

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(Math.max(10, freq * 0.3), ctx.currentTime + duration);

      gain.gain.setValueAtTime(vol, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + duration + 0.01);
    } catch (e) {}
  };

  useEffect(() => {
    const ms = (60 / bpm) * 1000;
    const timer = setInterval(() => {
      setBeat((prev) => {
        const next = prev + 1;
        if (typeof onBeat === "function") onBeat(next);

        const scale = realmScales[realm] || realmScales.schema;
        const note = scale[next % scale.length];

        if (next % 4 === 1) {
          playTone(note * 1.5, "triangle", 0.16, 0.09);
        } else {
          playTone(note, "sine", 0.09, 0.04);
        }

        return next;
      });
    }, ms);

    return () => clearInterval(timer);
  }, [bpm, realm, onBeat, soundEnabled]);

  return React.createElement(
    "div",
    { className: "global-pulse-hub", style: { width: "100%", height: "100%" } },
    children || null
  );
}

export default GlobalPulse;

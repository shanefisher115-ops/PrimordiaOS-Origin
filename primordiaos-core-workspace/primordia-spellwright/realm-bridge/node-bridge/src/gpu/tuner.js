// The feedback half of the GPU loop: Onyx says how loaded the GPU is, the tuner answers with
// a realm quality in [minQuality, 1]. PrimordiaOS applies it by thinning what it asks the
// renderers to draw (layer density in the delivered manifest; the share of simulated actors
// in the Vulkan sidecar), never by touching the realm it authored.
//
// Hysteresis: quality drops by `step` once the smoothed load has stayed above `high` for
// `holdSeconds`, and rises by half a step only after the load has stayed below `low` for
// twice as long. A cooldown separates changes, so the realm never flickers between levels.

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const r2 = (v) => Math.round(v * 100) / 100;

export function createTuner({ high = 0.85, low = 0.55, step = 0.1, minQuality = 0.3, holdSeconds = 2, cooldownSeconds = 4, smoothing = 0.3 } = {}) {
  let quality = 1;
  let ema = null;
  let overSince = null;
  let underSince = null;
  let lastChange = -Infinity;
  let pinned = null;

  return {
    get quality() {
      return pinned ?? quality;
    },
    /** Fixes the quality (manual override); null hands control back to the tuner. */
    pin(value) {
      pinned = value === null || value === undefined ? null : r2(clamp(Number(value), minQuality, 1));
      return this.quality;
    },
    /** Feeds one load sample taken at time t (s). Returns a decision when quality changed. */
    observe(load, t) {
      if (!Number.isFinite(load)) return null;
      ema = ema === null ? load : ema + (load - ema) * smoothing;
      if (pinned !== null) return null;
      if (ema > high) {
        overSince ??= t;
        underSince = null;
      } else if (ema < low) {
        underSince ??= t;
        overSince = null;
      } else {
        overSince = underSince = null;
      }
      if (t - lastChange < cooldownSeconds) return null;
      if (overSince !== null && t - overSince >= holdSeconds && quality > minQuality) {
        quality = r2(Math.max(minQuality, quality - step));
        lastChange = t;
        overSince = null;
        return { quality, reason: 'over_budget', load: ema };
      }
      if (underSince !== null && t - underSince >= holdSeconds * 2 && quality < 1) {
        quality = r2(Math.min(1, quality + step / 2));
        lastChange = t;
        underSince = null;
        return { quality, reason: 'headroom', load: ema };
      }
      return null;
    },
    state() {
      return { quality: this.quality, load: ema === null ? null : Math.round(ema * 1000) / 1000, pinned: pinned !== null };
    },
  };
}

/** The manifest the renderers receive: authored densities scaled by the GPU quality. */
export function applyQuality(manifest, quality) {
  if (!(quality < 1)) return manifest;
  const out = structuredClone(manifest);
  for (const layer of out.layers) layer.density = Math.round(layer.density * quality * 10000) / 10000;
  out.gpu_quality = quality; // informational; PRS-1 consumers ignore unknown fields
  return out;
}

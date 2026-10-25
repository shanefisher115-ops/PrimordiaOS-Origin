// Worldforge — autonomous realm authoring. Creates the genesis manifest and
// evolves it every `evolveSeconds`, emitting realm_manifest only when the
// revision changes (plus on connect, handled by the server).
import { mulberry32, subSeed } from '../prng.js';
import { genesis, evolve, validateManifest } from '../realm/prs1.js';
import { applyQuality } from '../gpu/tuner.js';

export function create(seed, { evolveSeconds = 15 } = {}) {
  let rng = mulberry32(subSeed(seed, 'worldforge.evolve'));
  let since = 0;
  let lastSentRevision = -1;
  let lastSentQuality = 1;
  let forced = false;

  const commit = (ctx, manifest) => {
    const errors = validateManifest(manifest);
    if (errors.length) throw new Error(`Worldforge produced an invalid PRS-1 manifest:\n${errors.join('\n')}`);
    ctx.manifest = manifest;
    ctx.realmId = manifest.realm_id;
  };

  return {
    name: 'Worldforge',
    stream: 'realm_manifest',
    hz: 1,
    init(ctx) {
      commit(ctx, genesis(seed, ctx.state));
    },
    step(dt, ctx) {
      since += dt;
      if (forced || (evolveSeconds > 0 && since >= evolveSeconds)) {
        since = 0;
        forced = false;
        commit(ctx, evolve(ctx.manifest, ctx.state, rng));
      }
    },
    // Renderers receive the authored manifest thinned by the GPU tuner (ctx.gpuQuality, see
    // src/gpu/tuner.js); evolution always continues from the authored one.
    sample(ctx, { full = false } = {}) {
      const quality = ctx.gpuQuality ?? 1;
      if (!full && ctx.manifest.revision === lastSentRevision && quality === lastSentQuality) return [];
      if (!full) {
        lastSentRevision = ctx.manifest.revision;
        lastSentQuality = quality;
      }
      return [{ type: 'realm_manifest', id: ctx.manifest.realm_id, payload: applyQuality(ctx.manifest, quality) }];
    },
    // Commands (from Unreal via {type:"command"}).
    forceEvolve() {
      forced = true;
    },
    reseed(ctx, newSeed) {
      seed = newSeed >>> 0;
      rng = mulberry32(subSeed(seed, 'worldforge.evolve'));
      lastSentRevision = -1;
      commit(ctx, genesis(seed, ctx.state));
    },
    loadManifest(ctx, manifest) {
      lastSentRevision = -1;
      commit(ctx, manifest);
    },
  };
}

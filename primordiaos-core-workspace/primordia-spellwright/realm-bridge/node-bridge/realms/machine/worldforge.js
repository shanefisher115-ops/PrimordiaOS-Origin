// Worldforge (machine): authors the processing-layer realm (realm.js) and re-issues
// it every few seconds so layer densities, core sigils and metaphysics track the
// machine. Commands behave as usual; `reseed` simply rebuilds the machine realm.
import { validateManifest } from '../../src/realm/prs1.js';
import { machineGenesis, machineEvolve } from './realm.js';
import { telemetry } from './telemetry.js';

export function create(seed, { evolveSeconds = 15 } = {}) {
  // The machine moves faster than a dreamt realm: revise at least every 5 s.
  const period = evolveSeconds > 0 ? Math.min(evolveSeconds, 5) : 0;
  let since = 0;
  let lastSentRevision = -1;
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
      commit(ctx, machineGenesis(ctx.state, telemetry()));
    },
    step(dt, ctx) {
      since += dt;
      if (forced || (period > 0 && since >= period)) {
        since = 0;
        forced = false;
        commit(ctx, machineEvolve(ctx.manifest, ctx.state, telemetry()));
      }
    },
    sample(ctx, { full = false } = {}) {
      if (!full && ctx.manifest.revision === lastSentRevision) return [];
      if (!full) lastSentRevision = ctx.manifest.revision;
      return [{ type: 'realm_manifest', id: ctx.manifest.realm_id, payload: ctx.manifest }];
    },
    forceEvolve() {
      forced = true;
    },
    reseed(ctx) {
      lastSentRevision = -1;
      commit(ctx, machineGenesis(ctx.state, telemetry()));
    },
    loadManifest(ctx, manifest) {
      lastSentRevision = -1;
      commit(ctx, manifest);
    },
  };
}

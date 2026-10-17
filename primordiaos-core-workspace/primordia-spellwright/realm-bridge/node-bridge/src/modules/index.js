// Module loader. Each PrimordiaOS module is an object:
//
//   { name, stream, hz, init(ctx), step(dt, ctx), sample(ctx, { full }) -> Packet[] }
//
// created by a `create(seed, options)` factory. If --modules <dir> (or
// PRIMORDIA_MODULES_DIR) contains `<key>.js` exporting `create`, that file
// replaces the reference simulation below. This is the seam where the real
// PrimordiaOS Heart/Soul/... implementations plug in.
import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import * as continuum from './continuum.js';
import * as omniscience from './omniscience.js';
import * as worldforge from './worldforge.js';
import * as heart from './heart.js';
import * as soul from './soul.js';
import * as cosmicWeb from './cosmicWeb.js';
import * as fateWeave from './fateWeave.js';
import * as dreamforge from './dreamforge.js';
import * as shadowforge from './shadowforge.js';

// Step order matters: the clock first, global state next, the realm author
// before anything that reads ctx.manifest, then the visual streams.
export const MODULE_ORDER = [
  ['continuum', continuum],
  ['omniscience', omniscience],
  ['worldforge', worldforge],
  ['heart', heart],
  ['soul', soul],
  ['cosmicWeb', cosmicWeb],
  ['fateWeave', fateWeave],
  ['dreamforge', dreamforge],
  ['shadowforge', shadowforge],
];

function assertModule(key, m) {
  for (const fn of ['init', 'step', 'sample']) {
    if (typeof m?.[fn] !== 'function') throw new Error(`PrimordiaOS module "${key}" is missing ${fn}()`);
  }
  if (typeof m.name !== 'string') throw new Error(`PrimordiaOS module "${key}" is missing a name`);
  return m;
}

export async function loadModules({ seed, modulesDir, evolveSeconds, log = () => {} }) {
  const dir = modulesDir ? resolve(modulesDir) : null;
  const modules = [];
  for (const [key, reference] of MODULE_ORDER) {
    let factory = reference.create;
    let origin = 'reference';
    const candidate = dir && join(dir, `${key}.js`);
    if (candidate && existsSync(candidate)) {
      const external = await import(pathToFileURL(candidate).href);
      if (typeof external.create !== 'function') throw new Error(`${candidate} must export create(seed, options)`);
      factory = external.create;
      origin = candidate;
    }
    const m = assertModule(key, factory(seed, { evolveSeconds }));
    m.key = key;
    modules.push(m);
    log(`  module ${m.name.padEnd(12)} stream=${m.stream ?? '-'} hz=${m.hz} (${origin})`);
  }
  return modules;
}

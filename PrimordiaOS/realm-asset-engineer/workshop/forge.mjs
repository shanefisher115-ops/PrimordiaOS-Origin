// Forge: builds a recipe with the Primordia-cad kernel and runs the free mechanical checks.
// The kernel is deterministic, so (generator, params, kernel commit, manifold version) is the whole recipe;
// mesh_sha256 (of the .glb bytes) proves a later rebuild reproduces it.
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { PATHS } from './paths.mjs';

const kernel = await import(pathToFileURL(path.join(PATHS.cad, 'kernel', 'index.ts')).href);
const meshLib = await import(pathToFileURL(path.join(PATHS.cad, 'kernel', 'mesh.ts')).href);
export const genres = await import(pathToFileURL(path.join(PATHS.cad, 'genres', 'index.ts')).href);

let info = null;
/** Kernel provenance: last commit touching Primordia-cad, whether it has local edits, manifold-3d version. */
export function kernelInfo() {
  if (info) return info;
  const git = (cwd, ...args) => {
    try { return execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim(); } catch { return ''; }
  };
  const manifold = JSON.parse(readFileSync(path.join(PATHS.cad, 'node_modules', 'manifold-3d', 'package.json'), 'utf8')).version;
  // The repo that actually tracks the kernel: walk up past nested repos that don't (Shane's main checkout has an
  // empty one at PrimordiaOS/.git). Only what shapes the meshes counts as "dirty".
  let commit = '', dirty = false;
  for (let dir = PATHS.cad; ; dir = path.dirname(dir)) {
    if (existsSync(path.join(dir, '.git'))) {
      const rel = path.relative(dir, PATHS.cad).split(path.sep).join('/') || '.';
      commit = git(dir, 'log', '-1', '--format=%H', '--', rel);
      if (commit) {
        dirty = git(dir, 'status', '--porcelain', '--', `${rel}/kernel`, `${rel}/genres`, `${rel}/package-lock.json`) !== '';
        break;
      }
    }
    if (path.dirname(dir) === dir) break;
  }
  info = { commit: commit || 'unknown', dirty, manifold };
  return info;
}

export function packData(genre) {
  const pack = genres.GENRES[genre];
  if (!pack) throw new Error(`unknown genre "${genre}"`);
  return genres.packData(pack);
}

export function assetName(genre, generator, sha) {
  const pack = genres.GENRES[genre];
  return `SM_${pack.assetPrefix}${kernel.GENERATORS[generator].title}_${sha.slice(0, 6)}`;
}

/**
 * Builds one candidate. Returns the .glb bytes, the solid (for silhouettes), metrics and checks.
 * Never throws for a bad recipe: a kernel error comes back as { ok: false, error }.
 */
export function build({ genre, generator, params }) {
  const style = genres.GENRES[genre]?.generators[generator];
  if (!style) return { ok: false, error: `${genre} has no generator "${generator}"` };
  let g;
  const t0 = performance.now();
  try {
    g = kernel.generate(generator, params);
  } catch (e) {
    return { ok: false, error: `kernel: ${e.message}` };
  }
  const ms = Math.round(performance.now() - t0);
  const glb = Buffer.from(kernel.toGLB(g));
  const sha = createHash('sha256').update(glb).digest('hex');
  const size = g.bounds.max.map((v, k) => +(v - g.bounds.min[k]).toFixed(3));
  let finite = true;
  for (const arr of [g.render.positions, g.render.normals, g.solid.positions]) {
    for (let i = 0; i < arr.length; i++) if (!Number.isFinite(arr[i])) { finite = false; break; }
  }
  const closed = g.stats.closed && meshLib.isClosed(g.solid.triangles, g.solid.positions.length / 3);
  const metrics = {
    triangles: g.stats.triangleCount,
    size_m: size,
    volume_m3: +g.stats.volume.toFixed(4),
    area_m2: +g.stats.surfaceArea.toFixed(3),
    genus: g.stats.genus,
    closed,
    materials: g.render.groups.map((x) => x.material),
    glb_bytes: glb.byteLength,
    build_ms: ms,
    warnings: g.warnings,
  };
  const checks = {
    closed,
    finite,
    volume: g.stats.volume > 0,
    budget: g.stats.triangleCount <= style.triangleBudget,
    size: size.every((v, k) => v <= style.maxSize[k] + 1e-6),
    base: Math.abs(g.bounds.min[2]) < 1e-3,
  };
  return { ok: true, glb, sha, params: g.params, solid: g.solid, metrics, checks, name: assetName(genre, generator, sha) };
}

// Where things live. Code comes from the repo; state (the installed agent, caches, the local catalog,
// logs) lives in a data folder outside it, so a 24/7 loop never dirties the checkout.
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');

const dataRoot = process.env.RAE_DATA_DIR
  ?? path.join(process.env.LOCALAPPDATA ?? path.join(os.homedir(), '.local', 'share'), 'PrimordiaOS', 'realm-asset-engineer');

export const PATHS = {
  root: ROOT,
  cad: path.resolve(ROOT, '..', 'Primordia-cad'),
  agentSource: path.join(ROOT, 'RealmAssetEngineer'),
  preview: path.join(ROOT, 'preview'),
  gallery: path.join(ROOT, 'gallery'),
  three: path.join(ROOT, 'node_modules', 'three'),
  migrations: path.resolve(ROOT, '..', 'supabase', 'migrations'),
  importAsset: path.resolve(ROOT, '..', '..', 'primordiaos-core-workspace', 'primordia-spellwright', '.claude', 'skills',
    'primordia-realm-lookdev', 'scripts', 'import_asset.py'),
  envFile: process.env.RAE_ENV_FILE ?? path.join(os.homedir(), '.primordia', 'realm-asset-engineer.env'),
  data: dataRoot,
  agent: path.join(dataRoot, 'agent', 'RealmAssetEngineer'),
  cache: path.join(dataRoot, 'cache'),
  localCatalog: path.join(dataRoot, 'catalog-local'),
  hostState: path.join(dataRoot, 'host-state.json'),
  logs: path.join(dataRoot, 'logs'),
  staging: path.join(dataRoot, 'unreal-staging'),
  briefQueue: path.join(dataRoot, 'briefs.json'),
};

/** `rel` resolved under `root`, or null if it would escape it. */
export function within(root, rel) {
  const base = path.resolve(root);
  const file = path.resolve(base, decodeURIComponent(rel));
  return file.startsWith(base + path.sep) ? file : null;
}

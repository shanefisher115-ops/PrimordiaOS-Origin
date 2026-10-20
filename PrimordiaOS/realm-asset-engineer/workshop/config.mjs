// Settings: defaults here, overrides in <data>/config.json, secrets in the env file outside the repo
// (~/.primordia/realm-asset-engineer.env) or the process environment.
import { randomBytes } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { PATHS } from './paths.mjs';

export const DEFAULTS = {
  rate: {
    candidatesPerHour: 40, // forge jobs (build + preview + judge) per hour
    minGapSeconds: 15,
    slowWhileUnreal: 0.25, // rate factor while Unreal Editor is running
    slowWhenBacklogFull: 0.2, // rate factor while Shane's review queue is full
  },
  standing: { enabled: true, genres: null, count: 3 }, // briefs the engineer gives itself when the queue is empty (null = every genre)
  storage: {
    budgetBytes: 800 * 1024 * 1024, // of the free tier's 1 GB file storage
    dbBudgetBytes: 400 * 1024 * 1024, // of the free tier's 500 MB database
  },
  review: { maxAwaitingReview: 150 },
  vision: {
    model: null, // e.g. "gemma4:latest"; off by default (9.6 GB, needs the RAM to itself)
    maxPerHour: 4,
    minFreeRamGB: 11,
    timeoutSeconds: 300,
    allowCloud: false, // ":cloud" models send the image off this machine
    skipWhileUnreal: true,
  },
  steer: { enabled: true, model: 'llama3.2:3b', timeoutSeconds: 150 }, // reads a brief's notes, never designs on its own
  ollamaUrl: 'http://127.0.0.1:11434',
  gallery: { enabled: true, host: '0.0.0.0', port: 8790 },
  previewer: { enabled: true, browserPath: null },
  unreal: {
    engine: 'C:/Program Files/Epic Games/UE_5.4/Engine/Binaries/Win64/UnrealEditor-Cmd.exe',
    project: 'C:/Users/Shane/Documents/Unreal Projects/PrimordiaRealms/PrimordiaRealms.uproject',
    window: '01:00-06:00', // local time; the scheduled task starts at 02:30
    minIdleMinutes: 20,
    maxPerBatch: 25,
    timeoutMinutes: 60,
    minFreeDiskGB: 5,
    blender: { enabled: true, bake: 0 }, // bevel + weighted normals before import; bake 0 = no AO/curvature maps
  },
  tickSeconds: 5,
  pollSeconds: 60,
  cacheHours: 48,
};

function merge(a, b) {
  if (!b || typeof b !== 'object' || Array.isArray(b)) return b ?? a;
  const out = { ...a };
  for (const [k, v] of Object.entries(b)) out[k] = a && typeof a[k] === 'object' && !Array.isArray(a[k]) && a[k] !== null ? merge(a[k], v) : v;
  return out;
}

export function loadConfig(overrides = {}) {
  let file = {};
  try { file = JSON.parse(readFileSync(`${PATHS.data}/config.json`, 'utf8')); } catch { /* defaults */ }
  return merge(merge(DEFAULTS, file), overrides);
}

/** KEY=VALUE lines; process.env wins. Values are never logged. */
export function loadEnv(file = PATHS.envFile) {
  const env = {};
  try {
    for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
      if (m && !line.trimStart().startsWith('#')) env[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
  } catch { /* no env file */ }
  for (const k of ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_DB_URL', 'SUPABASE_ANON_KEY', 'RAE_GALLERY_TOKEN']) {
    if (process.env[k]) env[k] = process.env[k];
  }
  return env;
}

/** The LAN gallery's access token: from the env file, else generated once and written back to it. */
export function galleryToken(env, file = PATHS.envFile) {
  if (env.RAE_GALLERY_TOKEN) return env.RAE_GALLERY_TOKEN;
  const token = randomBytes(18).toString('base64url');
  try {
    let text = '';
    try { text = readFileSync(file, 'utf8'); } catch { /* new file */ }
    text = /^RAE_GALLERY_TOKEN=.*$/m.test(text) ? text.replace(/^RAE_GALLERY_TOKEN=.*$/m, `RAE_GALLERY_TOKEN=${token}`) : `${text.trimEnd()}\nRAE_GALLERY_TOKEN=${token}\n`;
    writeFileSync(file, text);
  } catch { /* keep it for this run only */ }
  env.RAE_GALLERY_TOKEN = token;
  return token;
}

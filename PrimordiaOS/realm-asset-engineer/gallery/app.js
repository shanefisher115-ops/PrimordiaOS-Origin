// Realm asset review gallery. Two data sources behind one small interface:
//   api       served by the workshop (LAN, phone on the same Wi-Fi): token -> HttpOnly cookie; the workshop
//             holds the Supabase service key and rebuilds a .glb from its recipe for pieces not approved yet.
//   supabase  hosted anywhere: Supabase Auth sign-in + the public anon key; RLS lets listed reviewers read the
//             catalog, approve/reject and sign URLs for the private bucket.
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { AssetStage } from '/preview/stage.js';

const CFG = window.RAE_CONFIG ?? { mode: 'api' };
const $ = (id) => document.getElementById(id);
const PAGE = 36;
const state = { verdict: 'kept', genre: '', rows: [], index: -1, genres: {}, done: false, busy: false };

// ------------------------------------------------------------------ data sources

function apiSource() {
  const call = async (path, opts = {}) => {
    const token = localStorage.getItem('rae_token');
    const res = await fetch(path, {
      ...opts,
      headers: { ...(opts.body ? { 'content-type': 'application/json' } : {}), ...(token ? { authorization: `Bearer ${token}` } : {}) },
      credentials: 'same-origin',
    });
    if (res.status === 401) throw Object.assign(new Error('unauthorized'), { status: 401 });
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? `HTTP ${res.status}`);
    return res.json();
  };
  return {
    kind: 'api',
    login: async (token) => { localStorage.setItem('rae_token', token); await call('/api/login', { method: 'POST' }); },
    status: () => call('/api/status'),
    genres: () => call('/api/genres'),
    list: ({ verdict, genre, before }) => call(`/api/assets?limit=${PAGE}${verdict ? `&verdict=${verdict}` : ''}${genre ? `&genre=${genre}` : ''}${before ? `&before=${encodeURIComponent(before)}` : ''}`),
    review: (id, verdict, note) => call(`/api/assets/${id}/review`, { method: 'POST', body: JSON.stringify({ verdict, note }) }),
    briefs: () => call('/api/briefs'),
    addBrief: (b) => call('/api/briefs', { method: 'POST', body: JSON.stringify(b) }),
    thumb: async (row) => row.thumb_url,
    strip: async (row) => row.strip_url,
    glb: async (row) => row.glb_url, // rebuilt from the recipe when not approved yet
  };
}

async function supabaseSource() {
  const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.117.2/+esm');
  const sb = createClient(CFG.supabaseUrl, CFG.anonKey);
  const bucket = sb.storage.from('realm-assets');
  const urls = new Map();
  const sign = async (path) => {
    if (!path) return null;
    if (!urls.has(path)) {
      const { data, error } = await bucket.createSignedUrl(path, 3600);
      if (error) throw error;
      urls.set(path, data.signedUrl);
    }
    return urls.get(path);
  };
  const must = ({ data, error }) => { if (error) throw Object.assign(new Error(error.message), { status: error.code === 'PGRST301' ? 401 : 500 }); return data; };
  const genresData = CFG.genres ?? {};
  return {
    kind: 'supabase',
    login: async (_token, email, password) => must(await sb.auth.signInWithPassword({ email, password })),
    status: async () => {
      const { data: { session } } = await sb.auth.getSession();
      if (!session) throw Object.assign(new Error('sign in'), { status: 401 });
      const usage = must(await sb.from('realm_asset_usage').select('*').single());
      return { catalog: 'supabase', usage, budget: { storage_bytes: 800 * 1024 * 1024 } };
    },
    genres: async () => genresData,
    list: async ({ verdict, genre, before }) => {
      let q = sb.from('realm_assets').select('*').order('created_at', { ascending: false }).limit(PAGE);
      if (verdict) q = q.eq('verdict', verdict);
      if (genre) q = q.eq('genre', genre);
      if (before) q = q.lt('created_at', before);
      return must(await q);
    },
    review: async (id, verdict, note) => must(await sb.from('realm_assets').update({ verdict, review_note: note || null }).eq('id', id).select().single()),
    briefs: async () => must(await sb.from('realm_asset_briefs').select('*').order('created_at', { ascending: false }).limit(20)),
    addBrief: async (b) => must(await sb.from('realm_asset_briefs').insert(b).select().single()),
    thumb: (row) => sign(row.thumb_path),
    strip: (row) => sign(row.strip_path),
    glb: (row) => sign(row.glb_path), // only approved pieces have a .glb in the bucket
  };
}

let src;

// ------------------------------------------------------------------ ui helpers

function toast(msg, ms = 2200) {
  const t = $('toast');
  t.textContent = msg; t.hidden = false;
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => { t.hidden = true; }, ms);
}

const fmtBytes = (b) => (b > 1e6 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.round((b ?? 0) / 1024)} KB`);
const fmt = (v) => (typeof v === 'number' ? (Number.isInteger(v) ? String(v) : v.toFixed(2)) : Array.isArray(v) ? v.map(fmt).join(' × ') : v == null ? '—' : String(v));
const titleOf = (row) => state.genres[row.genre]?.generators?.[row.generator]?.title ?? row.generator;

function dl(el, entries) {
  el.replaceChildren(...entries.flatMap(([k, v]) => {
    const dt = document.createElement('dt'); dt.textContent = k;
    const dd = document.createElement('dd'); dd.textContent = fmt(v);
    return [dt, dd];
  }));
}

async function showStatus() {
  try {
    const s = await src.status();
    const u = s.usage ?? {};
    const budget = s.budget?.storage_bytes ?? 0;
    const parts = [
      `${u.awaiting_review ?? 0} to review`, `${u.approved ?? 0} approved`,
      budget ? `storage ${fmtBytes(u.storage_bytes ?? 0)} of ${fmtBytes(budget)}` : null,
      s.counters ? `${s.counters.kept} kept · ${s.counters.discarded} discarded since start` : null,
      s.catalog === 'local' ? 'local catalog (Supabase not set up)' : null,
    ].filter(Boolean);
    $('status').textContent = parts.join(' · ');
    return true;
  } catch (e) {
    if (e.status === 401) return false;
    $('status').textContent = `status: ${e.message}`;
    return true;
  }
}

// ------------------------------------------------------------------ grid

function card(row, i) {
  const el = document.createElement('button');
  el.type = 'button';
  el.className = `card ${row.verdict}`;
  el.setAttribute('aria-label', `${row.name}, ${row.verdict}`);
  const img = document.createElement('img');
  img.alt = ''; img.loading = 'lazy'; img.decoding = 'async';
  src.thumb(row).then((u) => { if (u) img.src = u; else img.classList.add('none'); }).catch(() => img.classList.add('none'));
  const cap = document.createElement('div');
  cap.className = 'cap';
  const score = row.scores?.total;
  cap.innerHTML = `<span class="kind"></span><span class="score"></span>`;
  cap.querySelector('.kind').textContent = titleOf(row);
  cap.querySelector('.score').textContent = typeof score === 'number' ? score.toFixed(2) : '';
  el.append(img, cap);
  if (row.verdict !== 'kept') { const b = document.createElement('span'); b.className = `badge ${row.verdict}`; b.textContent = row.verdict; el.append(b); }
  el.addEventListener('click', () => openDetail(i));
  return el;
}

async function load(reset = true) {
  if (state.busy) return;
  state.busy = true;
  try {
    if (reset) { state.rows = []; state.done = false; $('grid').replaceChildren(); }
    const before = state.rows.at(-1)?.created_at;
    const rows = await src.list({ verdict: state.verdict, genre: state.genre, before: reset ? undefined : before });
    const start = state.rows.length;
    state.rows.push(...rows);
    state.done = rows.length < PAGE;
    $('grid').append(...rows.map((r, k) => card(r, start + k)));
    $('empty').hidden = state.rows.length > 0;
    $('more').hidden = state.done;
  } catch (e) {
    if (e.status === 401) return showLogin();
    toast(e.message);
  } finally {
    state.busy = false;
  }
}

// ------------------------------------------------------------------ 3D viewer

const viewer = { stage: null, controls: null, raf: 0, token: 0 };
window.raeViewer = viewer; // for debugging from the console

function ensureStage() {
  if (viewer.stage) return viewer.stage;
  const canvas = $('view3d');
  const rect = canvas.parentElement.getBoundingClientRect();
  viewer.stage = new AssetStage(canvas, { width: rect.width, height: rect.height, pixelRatio: Math.min(2, window.devicePixelRatio || 1) });
  new ResizeObserver(() => {
    const r = canvas.parentElement.getBoundingClientRect();
    if (r.width && r.height) { viewer.stage.setSize(r.width, r.height); requestRender(); }
  }).observe(canvas.parentElement);
  return viewer.stage;
}

/** Fresh controls for every piece, so orbit momentum from the last one never carries over. */
function resetControls() {
  viewer.controls?.dispose();
  viewer.controls = new OrbitControls(viewer.stage.camera, $('view3d'));
  viewer.controls.enableDamping = true;
  viewer.controls.addEventListener('change', requestRender);
}

function requestRender() {
  if (viewer.raf) return;
  viewer.raf = requestAnimationFrame(() => {
    viewer.raf = 0;
    if (!viewer.stage) return;
    const moving = viewer.controls?.update() ?? false;
    viewer.stage.renderer.render(viewer.stage.scene, viewer.stage.camera);
    if (moving) requestRender();
  });
}

async function show3d(row) {
  const token = ++viewer.token;
  const note = $('viewNote');
  const canvas = $('view3d');
  const tt = $('turntable');
  const glb = await src.glb(row).catch(() => null);
  const strip = await src.strip(row).catch(() => null);
  tt.hidden = true; canvas.hidden = false;
  if (!glb) {
    canvas.hidden = true;
    if (strip) { showTurntable(strip); note.textContent = 'Turntable preview · 3D after approval'; } else note.textContent = 'No preview';
    return;
  }
  note.textContent = 'Loading 3D…';
  try {
    const stage = ensureStage();
    const pack = state.genres[row.genre];
    if (pack) stage.setLook(pack);
    await stage.load(glb);
    if (token !== viewer.token) return;
    stage.frame(30, 12);
    resetControls();
    viewer.controls.target.copy(stage.target);
    viewer.controls.minDistance = stage.radius * 0.3;
    viewer.controls.maxDistance = stage.radius * 8;
    viewer.controls.update();
    requestRender();
    note.textContent = row.glb_path ? 'Drag to orbit · pinch to zoom' : 'Rebuilt from its recipe · drag to orbit';
  } catch (e) {
    note.textContent = `3D failed: ${e.message}`;
    if (strip) { canvas.hidden = true; showTurntable(strip); }
  }
}

function showTurntable(url) {
  const tt = $('turntable');
  tt.hidden = false;
  tt.style.backgroundImage = `url("${url}")`;
  let frame = 0;
  const set = (f) => { frame = ((f % 8) + 8) % 8; tt.style.backgroundPosition = `${(frame / 7) * 100}% 0`; };
  set(0);
  let startX = null, startFrame = 0;
  tt.onpointerdown = (e) => { startX = e.clientX; startFrame = frame; tt.setPointerCapture(e.pointerId); };
  tt.onpointermove = (e) => { if (startX !== null) set(startFrame + Math.round((e.clientX - startX) / 30)); };
  tt.onpointerup = tt.onpointercancel = () => { startX = null; };
}

// ------------------------------------------------------------------ detail

function openDetail(i) {
  const row = state.rows[i];
  if (!row) return;
  state.index = i;
  $('detail').hidden = false;
  $('detail').scrollTop = 0; // typing a note scrolls the sheet; start each piece at the top
  document.activeElement?.blur?.();
  document.body.classList.add('locked');
  $('dName').textContent = row.name;
  $('dSub').textContent = `${state.genres[row.genre]?.title ?? row.genre} · ${titleOf(row)} · ${new Date(row.created_at).toLocaleString()}`;
  const s = row.scores ?? {};
  const badges = [
    [`score ${fmt(s.total)}`, ''], [`variety ${s.variety == null ? 'first' : fmt(s.variety)}`, ''], [`taste ${fmt(s.taste)}`, ''],
    ...(s.vision != null ? [[`vision ${fmt(s.vision)}`, '']] : []),
    ...(row.imported_to_unreal ? [['in Unreal', 'ok']] : []),
    ...(row.flags ?? []).map((f) => [f, 'warn']),
  ];
  $('dBadges').replaceChildren(...badges.map(([t, cls]) => { const b = document.createElement('span'); b.className = `chip ${cls}`; b.textContent = t; return b; }));
  dl($('dParams'), Object.entries(row.params ?? {}));
  const m = row.metrics ?? {};
  dl($('dMetrics'), [['triangles', m.triangles], ['size (m)', m.size_m], ['volume (m³)', m.volume_m3], ['surface (m²)', m.area_m2], ['genus', m.genus], ['materials', (m.materials ?? []).join(', ')], ['.glb', m.glb_bytes ? fmtBytes(m.glb_bytes) : null]]);
  const l = row.lineage ?? {};
  dl($('dLineage'), [['mode', l.mode], ['parent', l.parent_name], ['brief', l.brief_id], ['agent', l.agent_version], ['pack', row.pack_version], ['kernel', `${(row.kernel_commit ?? '').slice(0, 10)}${row.kernel_dirty ? ' (local edits)' : ''}`], ['manifold-3d', row.manifold_version], ['Unreal', row.unreal_path]]);
  $('note').value = row.review_note ?? '';
  const reviewed = row.verdict !== 'kept';
  $('approve').disabled = row.verdict === 'approved';
  $('reject').disabled = row.verdict === 'rejected';
  $('undo').hidden = !reviewed || row.imported_to_unreal;
  $('prev').disabled = i <= 0;
  $('next').disabled = i >= state.rows.length - 1 && state.done;
  show3d(row);
}

function closeDetail() {
  $('detail').hidden = true;
  document.body.classList.remove('locked');
  viewer.token++;
}

async function review(verdict) {
  const row = state.rows[state.index];
  if (!row) return;
  for (const b of ['approve', 'reject', 'undo']) $(b).disabled = true;
  try {
    const updated = await src.review(row.id, verdict, $('note').value.trim());
    Object.assign(row, updated);
    const el = $('grid').children[state.index];
    if (el) el.replaceWith(card(row, state.index));
    toast(verdict === 'approved' ? 'Approved: its .glb goes to the next Unreal batch' : verdict === 'rejected' ? 'Rejected' : 'Back in the review queue');
    showStatus();
    if (state.verdict === 'kept' && verdict !== 'kept') return nextDetail();
    openDetail(state.index);
  } catch (e) {
    toast(e.message);
    openDetail(state.index);
  }
}

async function nextDetail() {
  if (state.index >= state.rows.length - 1 && !state.done) await load(false);
  if (state.index < state.rows.length - 1) openDetail(state.index + 1); else { closeDetail(); toast('All caught up'); }
}

// ------------------------------------------------------------------ briefs

async function openBriefs() {
  $('briefSheet').hidden = false;
  document.body.classList.add('locked');
  const sel = $('bGenre');
  sel.replaceChildren(...Object.values(state.genres).map((g) => new Option(g.title, g.id)));
  if (state.genre) sel.value = state.genre;
  try {
    const list = await src.briefs();
    $('briefList').replaceChildren(...list.map((b) => {
      const li = document.createElement('li');
      li.textContent = `${b.count} × ${b.genre}${b.notes ? ` — “${b.notes}”` : ''} · ${b.status}`;
      return li;
    }));
  } catch (e) { $('briefList').replaceChildren(); }
}

// ------------------------------------------------------------------ login

function showLogin() {
  $('login').hidden = false;
  const sb = src.kind === 'supabase';
  $('sbLogin').hidden = !sb;
  $('tokenInput').closest('label').hidden = sb;
  $('tokenInput').required = !sb;
  $('email').required = sb; $('password').required = sb;
}

async function start() {
  src = CFG.mode === 'supabase' ? await supabaseSource() : apiSource();
  const t = new URLSearchParams(location.search).get('t');
  if (t && src.kind === 'api') {
    try { await src.login(t); } catch { /* shown below */ }
    history.replaceState(null, '', location.pathname); // keep the token out of history and screenshots
  }
  if (!(await showStatus())) return showLogin();
  state.genres = await src.genres().catch(() => ({}));
  for (const g of Object.values(state.genres)) $('genre').append(new Option(g.title, g.id));
  await load();
}

// ------------------------------------------------------------------ wiring

document.querySelectorAll('.tabs [role=tab]').forEach((b) => b.addEventListener('click', () => {
  document.querySelectorAll('.tabs [role=tab]').forEach((x) => x.setAttribute('aria-selected', String(x === b)));
  state.verdict = b.dataset.verdict;
  load();
}));
$('genre').addEventListener('change', (e) => { state.genre = e.target.value; load(); });
$('more').addEventListener('click', () => load(false));
$('back').addEventListener('click', closeDetail);
$('prev').addEventListener('click', () => openDetail(state.index - 1));
$('next').addEventListener('click', nextDetail);
$('approve').addEventListener('click', () => review('approved'));
$('reject').addEventListener('click', () => review('rejected'));
$('undo').addEventListener('click', () => review('kept'));
$('briefBtn').addEventListener('click', openBriefs);
$('briefClose').addEventListener('click', () => { $('briefSheet').hidden = true; document.body.classList.remove('locked'); });
$('briefForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    const b = await src.addBrief({ genre: $('bGenre').value, count: Number($('bCount').value), notes: $('bNotes').value.trim() || null });
    $('briefMsg').textContent = `Queued: ${b.count} × ${b.genre}. The engineer picks it up within a minute.`;
    $('bNotes').value = '';
    openBriefs();
  } catch (err) { $('briefMsg').textContent = err.message; }
});
$('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    await src.login($('tokenInput').value.trim(), $('email').value.trim(), $('password').value);
    $('login').hidden = true;
    $('password').value = '';
    await start();
  } catch (err) { $('loginMsg').textContent = err.message === 'unauthorized' ? 'That token was not accepted.' : err.message; }
});
document.addEventListener('keydown', (e) => {
  if ($('detail').hidden || e.target.matches('input, textarea')) return;
  if (e.key === 'Escape') closeDetail();
  else if (e.key === 'ArrowRight') nextDetail();
  else if (e.key === 'ArrowLeft' && state.index > 0) openDetail(state.index - 1);
  else if (e.key === 'a') review('approved');
  else if (e.key === 'r') review('rejected');
});
window.addEventListener('pageshow', () => { if (src) showStatus(); });

start().catch((e) => toast(e.message, 6000));

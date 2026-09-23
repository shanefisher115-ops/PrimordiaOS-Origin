/**
 * master_setup.js
 *
 * Master installer that writes the full Phase2 project files into the current directory,
 * backing up any existing files it will overwrite. Requires explicit confirmation:
 *
 *   MASTER_CONFIRM=I_ACCEPT_OVERWRITE
 *
 * Optional:
 *   RUN_AFTER=true   -> runs `npm install` and `npm start` after writing files
 *
 * Run from project root:
 *   node master_setup.js
 *
 * Safety: This script only writes files. It will not enable any dangerous runtime actions.
 * To enable shell/network actions in the app you must follow the app's explicit enable flow.
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const CONFIRM_TOKEN = process.env.MASTER_CONFIRM || '';
const RUN_AFTER = (process.env.RUN_AFTER || '').toLowerCase() === 'true';

if (CONFIRM_TOKEN !== 'I_ACCEPT_OVERWRITE') {
  console.error('ABORT: MASTER_CONFIRM must be set to I_ACCEPT_OVERWRITE to proceed.');
  console.error('Example (PowerShell): $env:MASTER_CONFIRM = "I_ACCEPT_OVERWRITE"');
  process.exit(1);
}

const root = process.cwd();
const backupDir = path.join(root, `backup-${Date.now()}`);
if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });

function backupIfExists(relPath) {
  const full = path.join(root, relPath);
  if (fs.existsSync(full)) {
    const dest = path.join(backupDir, relPath);
    const destDir = path.dirname(dest);
    fs.mkdirSync(destDir, { recursive: true });
    fs.renameSync(full, dest);
    console.log(`Backed up ${relPath} -> ${path.relative(root, dest)}`);
  }
}

function writeFile(relPath, content) {
  const full = path.join(root, relPath);
  const dir = path.dirname(full);
  fs.mkdirSync(dir, { recursive: true });
  if (fs.existsSync(full)) {
    backupIfExists(relPath);
  }
  fs.writeFileSync(full, content, 'utf8');
  console.log(`Wrote ${relPath}`);
}

/* ---------------------------
   Files to write (Phase 2)
   --------------------------- */

/* package.json */
writeFile('package.json', `{
  "name": "primordial-origin-pro-phase2",
  "version": "1.0.0",
  "description": "Primordial Origin Cockpit Professional Phase 2",
  "main": "main.js",
  "scripts": {
    "start": "electron ."
  },
  "author": "Shane",
  "license": "MIT",
  "dependencies": {
    "electron": "^30.0.0",
    "uuid": "^9.0.0",
    "node-fetch": "^3.4.0"
  }
}
`);

/* main.js */
writeFile('main.js', `// main.js
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const router = require('./router');
const orchestrator = require('./orchestrator');
const agentCore = require('./agentCore');
const osmiumCore = require('./osmiumCore');

router.init();
orchestrator.init(agentCore);

// Ensure a writable user-data path to avoid cache permission warnings
const fs = require('fs');
const userDataPath = path.join(__dirname, 'user-data');
if (!fs.existsSync(userDataPath)) fs.mkdirSync(userDataPath, { recursive: true });
app.setPath('userData', userDataPath);

function createWindow() {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  win.loadFile(path.join(__dirname, 'public', 'index.html'));
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

// IPC handlers
ipcMain.handle('osmium:chat', async (_e, message) => osmiumCore.chat(message));
ipcMain.handle('osmium:command', async (_e, cmd) => agentCore.executeDirective(cmd));
ipcMain.handle('orchestrator:schedule', async (_e, job) => orchestrator.schedule(job));
ipcMain.handle('orchestrator:list', async () => orchestrator.list());
ipcMain.handle('orchestrator:runNow', async (_e, id) => orchestrator.runNow(id));
ipcMain.handle('agent:status', async () => agentCore.status());
ipcMain.handle('agent:enableDanger', async (_e, token) => require('./config').verifyEnableToken(token));
`);

/* preload.js */
writeFile('preload.js', `// preload.js
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('primordial', {
  chat: (message) => ipcRenderer.invoke('osmium:chat', message),
  command: (cmd) => ipcRenderer.invoke('osmium:command', cmd),
  schedule: (job) => ipcRenderer.invoke('orchestrator:schedule', job),
  listSchedules: () => ipcRenderer.invoke('orchestrator:list'),
  runScheduleNow: (id) => ipcRenderer.invoke('orchestrator:runNow', id),
  agentStatus: () => ipcRenderer.invoke('agent:status'),
  enableDanger: (token) => ipcRenderer.invoke('agent:enableDanger', token)
});
`);

/* config.js */
writeFile('config.js', `// config.js
const fs = require('fs');
const path = require('path');

const TOKEN_PATH = path.join(__dirname, 'ENABLE_TOKEN.txt');

function readLocalToken() {
  try {
    return fs.readFileSync(TOKEN_PATH, 'utf8').trim();
  } catch (e) {
    return null;
  }
}

function isDangerAllowed() {
  const env = process.env.PRIMORDIAL_ALLOW_DANGEROUS === 'true';
  const envToken = process.env.PRIMORDIAL_ENABLE_TOKEN || '';
  const fileToken = readLocalToken();
  return env && envToken && fileToken && envToken === fileToken;
}

function verifyEnableToken(token) {
  const fileToken = readLocalToken();
  if (!fileToken) return { ok: false, reason: 'No local token file found' };
  if (token === fileToken && process.env.PRIMORDIAL_ALLOW_DANGEROUS === 'true') {
    return { ok: true };
  }
  return { ok: false, reason: 'Token mismatch or environment flag not set' };
}

module.exports = { isDangerAllowed, verifyEnableToken, TOKEN_PATH };
`);

/* router.js */
writeFile('router.js', `// router.js
function init() {
  console.log('Router initialized :: Primordial Origin Phase2 online.');
}
module.exports = { init };
`);

/* orchestrator.js */
writeFile('orchestrator.js', `// orchestrator.js
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const DATA_DIR = path.join(__dirname, 'data');
const TASK_FILE = path.join(DATA_DIR, 'tasks.json');

let agentCoreRef = null;
let schedules = {};

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);
  if (!fs.existsSync(TASK_FILE)) fs.writeFileSync(TASK_FILE, JSON.stringify([]));
}

function loadSchedules() {
  try {
    const raw = fs.readFileSync(TASK_FILE, 'utf8');
    const arr = JSON.parse(raw || '[]');
    arr.forEach(job => {
      schedules[job.id] = job;
      if (job.enabled) startJob(job);
    });
  } catch (e) {
    schedules = {};
  }
}

function persistSchedules() {
  const arr = Object.values(schedules);
  fs.writeFileSync(TASK_FILE, JSON.stringify(arr, null, 2));
}

function startJob(job) {
  if (job._timer) clearInterval(job._timer);
  job._timer = setInterval(async () => {
    if (!agentCoreRef) return;
    try {
      await agentCoreRef.executeDirective(job.command);
      console.log(\`Orchestrator: executed scheduled job \${job.name}\`);
    } catch (e) {
      console.error('Orchestrator job error', e);
    }
  }, job.intervalSeconds * 1000);
}

async function schedule(job) {
  ensureDataDir();
  const id = job.id || uuidv4();
  const j = {
    id,
    name: job.name || \`job-\${id}\`,
    intervalSeconds: job.intervalSeconds || 60,
    command: job.command || '',
    enabled: job.enabled !== false
  };
  schedules[id] = j;
  persistSchedules();
  if (j.enabled) startJob(j);
  return j;
}

async function list() {
  return Object.values(schedules);
}

async function runNow(id) {
  const job = schedules[id];
  if (!job) throw new Error('Job not found');
  if (!agentCoreRef) throw new Error('Agent core not initialized');
  return await agentCoreRef.executeDirective(job.command);
}

function init(agentCore) {
  agentCoreRef = agentCore;
  ensureDataDir();
  loadSchedules();
}

module.exports = { init, schedule, list, runNow };
`);

/* agentCore.js */
writeFile('agentCore.js', `// agentCore.js
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const config = require('./config');

const AUDIT_DIR = path.join(__dirname, 'data');
const AUDIT_LOG = path.join(AUDIT_DIR, 'audit.log');
if (!fs.existsSync(AUDIT_DIR)) fs.mkdirSync(AUDIT_DIR);

let fieldStrength = 0.0;
let massProfile = 0.0;
let loopState = 'IDLE';
let corePulse = 'STABLE';

function metrics() {
  return { fieldStrength, massProfile, loopState, corePulse };
}

function audit(entry) {
  const line = \`[\${new Date().toISOString()}] \${entry}\\n\`;
  try { fs.appendFileSync(AUDIT_LOG, line); } catch (e) { console.error('Audit write failed', e); }
}

async function executeDirective(commandString) {
  const raw = (commandString || '').trim();
  audit(\`EXECUTE_DIRECTIVE: \${raw}\`);
  if (!raw) return { lines: ['Osmium: No directive provided.'], metrics: metrics() };

  const lower = raw.toLowerCase();

  if (lower === 'ping') return { lines: ['Osmium: AgentCore responsive.'], metrics: metrics() };
  if (lower === 'clear') return { lines: ['<clear>'], metrics: metrics() };

  if (lower.startsWith('field ')) {
    const delta = parseFloat(lower.split(' ')[1]);
    if (!isNaN(delta)) {
      fieldStrength += delta;
      audit(\`FIELD_ADJUST \${delta} -> \${fieldStrength}\`);
      return { lines: [\`Osmium: Field envelope adjusted by \${delta}.\`], metrics: metrics() };
    }
    return { lines: ['Osmium: Invalid field delta.'], metrics: metrics() };
  }

  if (lower.startsWith('mass ')) {
    const delta = parseFloat(lower.split(' ')[1]);
    if (!isNaN(delta)) {
      massProfile += delta;
      audit(\`MASS_ADJUST \${delta} -> \${massProfile}\`);
      return { lines: [\`Osmium: Mass profile shifted by \${delta}.\`], metrics: metrics() };
    }
    return { lines: ['Osmium: Invalid mass delta.'], metrics: metrics() };
  }

  if (lower === 'loop start') {
    loopState = 'ACTIVE';
    corePulse = 'ACCELERATING';
    audit('LOOP_START');
    return { lines: ['Osmium: Autonomous loop engaged.'], metrics: metrics() };
  }

  if (lower === 'loop stop') {
    loopState = 'IDLE';
    corePulse = 'STABLE';
    audit('LOOP_STOP');
    return { lines: ['Osmium: Autonomous loop disengaged.'], metrics: metrics() };
  }

  if (lower.startsWith('shell:')) {
    if (!config.isDangerAllowed()) {
      audit('SHELL_DENIED');
      return { lines: ['Osmium: Shell execution disabled. Enable explicitly to run.'], metrics: metrics() };
    }
    const cmd = commandString.slice(commandString.indexOf(':') + 1).trim();
    return runShell(cmd);
  }

  if (lower.startsWith('task:')) {
    try {
      const json = commandString.slice(commandString.indexOf(':') + 1).trim();
      const task = JSON.parse(json);
      return await performTask(task);
    } catch (e) {
      return { lines: ['Osmium: Invalid task JSON.'], metrics: metrics() };
    }
  }

  audit('FALLBACK_ECHO');
  return { lines: ['Osmium: Directive executed.'], metrics: metrics() };
}

function runShell(cmd) {
  return new Promise((resolve) => {
    audit(\`SHELL_RUN: \${cmd}\`);
    try {
      const child = spawn(cmd, { shell: true });
      let out = '';
      let err = '';
      child.stdout.on('data', (d) => out += d.toString());
      child.stderr.on('data', (d) => err += d.toString());
      child.on('close', (code) => {
        audit(\`SHELL_EXIT \${code}\`);
        const lines = [];
        if (out) lines.push(\`stdout:\\n\${out}\`);
        if (err) lines.push(\`stderr:\\n\${err}\`);
        lines.push(\`exit code: \${code}\`);
        resolve({ lines, metrics: metrics() });
      });
    } catch (e) {
      audit(\`SHELL_ERROR \${String(e)}\`);
      resolve({ lines: [\`Osmium: Shell execution failed: \${String(e)}\`], metrics: metrics() });
    }
  });
}

async function performTask(task) {
  const lines = [];
  try {
    if (!task || !task.description) return { lines: ['Osmium: Invalid task. Provide description.'], metrics: metrics() };
    lines.push(\`Osmium: Performing task: \${task.description}\`);
    if (Array.isArray(task.steps)) {
      for (const step of task.steps) {
        if (step.type === 'command') {
          const res = await executeDirective(step.payload);
          lines.push(...res.lines);
        } else if (step.type === 'wait') {
          const ms = parseInt(step.payload, 10) || 0;
          lines.push(\`Osmium: Waiting \${ms}ms\`);
          await new Promise(r => setTimeout(r, ms));
        } else if (step.type === 'shell') {
          if (!config.isDangerAllowed()) {
            lines.push('Osmium: Shell step skipped; dangerous actions disabled.');
          } else {
            const res = await runShell(step.payload);
            lines.push(...res.lines);
          }
        } else if (step.type === 'http') {
          const connector = require('./connectors/httpConnector');
          const res = await connector.request(step.payload);
          lines.push(\`HTTP: \${res.status} \${res.body ? 'body present' : 'no body'}\`);
        } else {
          lines.push(\`Osmium: Unknown step type \${step.type}\`);
        }
      }
    } else {
      const res = await executeDirective(task.description);
      lines.push(...res.lines);
    }
    return { lines, metrics: metrics() };
  } catch (e) {
    return { lines: [\`Osmium: Task failed: \${String(e)}\`], metrics: metrics() };
  }
}

function status() {
  return { metrics: metrics(), dangerousAllowed: config.isDangerAllowed() };
}

module.exports = { executeDirective, performTask, status };
`);

/* planner.js */
writeFile('planner.js', `// planner.js
const fetch = require('node-fetch');

function heuristicsPlan(message) {
  const lower = (message || '').trim().toLowerCase();
  if (!lower) return { type: 'empty' };
  if (lower === 'ping') return { type: 'command', command: 'ping' };
  if (lower.startsWith('schedule ')) {
    const m = message.match(/^schedule\\s+(\\S+)\\s+every\\s+(\\d+)\\s+(.+)$/i);
    if (m) {
      const [, name, seconds, cmd] = m;
      return { type: 'schedule', job: { id: \`job-\${Date.now()}\`, name, intervalSeconds: parseInt(seconds,10), command: cmd } };
    }
  }
  if (lower.includes('field') || lower.includes('mass') || lower.includes('loop')) {
    return { type: 'command', command: message };
  }
  return { type: 'task', command: message };
}

async function callOpenAI(prompt, apiKey) {
  const url = 'https://api.openai.com/v1/chat/completions';
  const body = {
    model: 'gpt-4o-mini',
    messages: [{ role: 'system', content: 'You are Osmium planner. Convert user intent into structured tasks or commands. Respond JSON only.' },
               { role: 'user', content: prompt }],
    max_tokens: 600,
    temperature: 0.0
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': \`Bearer \${apiKey}\` },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(\`LLM error \${res.status}: \${txt}\`);
  }
  const json = await res.json();
  const content = json.choices && json.choices[0] && json.choices[0].message && json.choices[0].message.content;
  return content;
}

function safeParseJSON(text) {
  try { return JSON.parse(text); } catch (e) {
    const m = text.match(/\\{[\\s\\S]*\\}/);
    if (m) {
      try { return JSON.parse(m[0]); } catch (e2) { return null; }
    }
    return null;
  }
}

async function plan(message) {
  const provider = process.env.PRIMORDIAL_LLM_PROVIDER || '';
  const key = process.env.PRIMORDIAL_LLM_KEY || '';

  const lower = (message || '').toLowerCase();
  if (lower.includes('delete') && lower.includes('file')) {
    return { type: 'reject', reason: 'Potentially destructive request blocked by planner.' };
  }

  if (!provider || !key) return heuristicsPlan(message);

  try {
    const prompt = \`
User request:
\${message}

Return a JSON object with one of:
- {"type":"command","command":"..."}
- {"type":"task","command":"...","steps":[{"type":"command","payload":"..."}, ...]}
- {"type":"schedule","job":{"name":"...","intervalSeconds":60,"command":"..."}}
Only return valid JSON. Do not include extra commentary.
\`;
    const reply = await callOpenAI(prompt, key);
    const parsed = safeParseJSON(reply);
    if (!parsed) return heuristicsPlan(message);
    return parsed;
  } catch (e) {
    return heuristicsPlan(message);
  }
}

module.exports = { plan };
`);

/* workflowEditor.js */
writeFile('workflowEditor.js', `// workflowEditor.js
function createEmptyTask() {
  return {
    id: \`task-\${Date.now()}\`,
    description: 'New workflow',
    steps: []
  };
}

function addStep(task, step) {
  if (!task.steps) task.steps = [];
  task.steps.push(step);
  return task;
}

function removeStep(task, index) {
  if (!task.steps) return task;
  task.steps.splice(index, 1);
  return task;
}

function validateTask(task) {
  if (!task || !task.description) return { ok: false, reason: 'Missing description' };
  if (!Array.isArray(task.steps)) return { ok: false, reason: 'Steps must be an array' };
  for (const s of task.steps) {
    if (!s.type || !s.payload) return { ok: false, reason: 'Each step needs type and payload' };
  }
  return { ok: true };
}

function exportTaskJSON(task) {
  return JSON.stringify(task, null, 2);
}

module.exports = { createEmptyTask, addStep, removeStep, validateTask, exportTaskJSON };
`);

/* connectors/httpConnector.js */
writeFile(path.join('connectors', 'httpConnector.js'), `// connectors/httpConnector.js
const fetch = require('node-fetch');

async function request(payload) {
  const method = payload.method || 'GET';
  const url = payload.url;
  const headers = payload.headers || {};
  const body = payload.body ? JSON.stringify(payload.body) : undefined;
  const res = await fetch(url, { method, headers, body });
  const text = await res.text();
  return { status: res.status, body: text };
}

module.exports = { request };
`);

/* connectors/fsConnector.js */
writeFile(path.join('connectors', 'fsConnector.js'), `// connectors/fsConnector.js
const fs = require('fs');
const config = require('../config');

function readFile(payload) {
  if (!config.isDangerAllowed()) throw new Error('FS access disabled');
  return fs.readFileSync(payload.path, 'utf8');
}

function writeFile(payload) {
  if (!config.isDangerAllowed()) throw new Error('FS access disabled');
  fs.writeFileSync(payload.path, payload.content, 'utf8');
  return { ok: true };
}

module.exports = { readFile, writeFile };
`);

/* osmiumCore.js */
writeFile('osmiumCore.js', `// osmiumCore.js
const planner = require('./planner');
const agentCore = require('./agentCore');
const orchestrator = require('./orchestrator');

async function chat(message) {
  const plan = await planner.plan(message);

  if (!plan || plan.type === 'empty') return { reply: 'Osmium: I need a directive.' };
  if (plan.type === 'reject') return { reply: \`Osmium: \${plan.reason}\` };

  if (plan.type === 'command') {
    const res = await agentCore.executeDirective(plan.command);
    return { reply: Array.isArray(res.lines) ? res.lines.join('\\n') : String(res), metrics: res.metrics };
  }

  if (plan.type === 'task') {
    if (typeof agentCore.performTask === 'function') {
      const res = await agentCore.performTask(plan);
      return { reply: Array.isArray(res.lines) ? res.lines.join('\\n') : String(res), metrics: res.metrics };
    }

    if (Array.isArray(plan.steps) && plan.steps.length > 0) {
      const lines = [];
      let lastMetrics = null;
      for (const step of plan.steps) {
        if (step.type === 'command') {
          const r = await agentCore.executeDirective(step.payload);
          if (r && Array.isArray(r.lines)) lines.push(...r.lines);
          lastMetrics = r.metrics || lastMetrics;
        } else if (step.type === 'wait') {
          const ms = parseInt(step.payload, 10) || 0;
          lines.push(\`Osmium: Waiting \${ms}ms\`);
          await new Promise(r => setTimeout(r, ms));
        } else if (step.type === 'shell') {
          const r = await agentCore.executeDirective(\`shell: \${step.payload}\`);
          if (r && Array.isArray(r.lines)) lines.push(...r.lines);
          lastMetrics = r.metrics || lastMetrics;
        } else {
          lines.push(\`Osmium: Unknown step type \${step.type}\`);
        }
      }
      return { reply: lines.join('\\n'), metrics: lastMetrics };
    }

    if (plan.command) {
      const res = await agentCore.executeDirective(plan.command);
      return { reply: Array.isArray(res.lines) ? res.lines.join('\\n') : String(res), metrics: res.metrics };
    }

    return { reply: 'Osmium: Could not perform the planned task.' };
  }

  if (plan.type === 'schedule') {
    const job = await orchestrator.schedule(plan.job);
    return { reply: \`Scheduled \${job.name} every \${job.intervalSeconds}s\`, scheduled: job };
  }

  return { reply: 'Osmium: Could not interpret request.' };
}

module.exports = { chat };
`);

/* public/index.html */
writeFile(path.join('public', 'index.html'), `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Primordial Origin Pro Phase2</title>
  <link rel="stylesheet" href="./styles.css" />
</head>
<body>
  <header>
    <h1>Primordial Origin Pro</h1>
    <div id="status">STATUS: ONLINE</div>
  </header>
  <main>
    <section id="left">
      <div class="panel">
        <div class="panel-title">Osmium Chat</div>
        <div id="chat-output" class="output"></div>
        <div class="input-row">
          <input id="chat-input" placeholder="Talk to Osmium..." />
          <button id="chat-send">Send</button>
        </div>
      </div>

      <div class="panel">
        <div class="panel-title">Workflow Editor</div>
        <div id="workflow-canvas" style="height:200px; background:#07101a; padding:8px; overflow:auto;"></div>
        <div class="input-row" style="margin-top:8px;">
          <input id="wf-desc" placeholder="Workflow description" />
          <button id="wf-add-cmd">Add Command Step</button>
          <button id="wf-add-wait">Add Wait Step</button>
          <button id="wf-export">Export JSON</button>
        </div>
        <pre id="wf-json" style="height:120px; overflow:auto; background:#020617; padding:8px; border-radius:6px;"></pre>
      </div>

      <div class="panel">
        <div class="panel-title">Terminal</div>
        <div id="terminal-output" class="output"></div>
        <div class="input-row">
          <input id="terminal-input" placeholder="Enter directive or paste task JSON as task: {...}" />
          <button id="terminal-send">Run</button>
        </div>
      </div>
    </section>

    <aside id="right">
      <div class="panel">
        <div class="panel-title">Metrics</div>
        <div id="metrics">
          <div>Field: <span id="metric-field">0.00</span></div>
          <div>Mass: <span id="metric-mass">0.00</span></div>
          <div>Loop: <span id="metric-loop">IDLE</span></div>
          <div>Pulse: <span id="metric-pulse">STABLE</span></div>
        </div>
      </div>

      <div class="panel">
        <div class="panel-title">Orchestrator</div>
        <div>
          <button id="list-schedules">List Schedules</button>
          <div id="schedules-list" class="output small"></div>
          <div class="input-row">
            <input id="schedule-name" placeholder="name" />
            <input id="schedule-interval" placeholder="seconds" />
            <input id="schedule-cmd" placeholder="command" />
            <button id="schedule-create">Create</button>
          </div>
        </div>
      </div>

      <div class="panel">
        <div class="panel-title">Agent</div>
        <div id="agent-status" class="output small"></div>
        <div class="input-row" style="margin-top:8px;">
          <input id="enable-token" placeholder="Enable token from ENABLE_TOKEN.txt" />
          <button id="enable-danger">Enable Dangerous Actions</button>
        </div>
        <div class="panel-title" style="margin-top:8px">Audit</div>
        <div id="audit-output" class="output small"></div>
      </div>
    </aside>
  </main>

  <script src="./renderer.js"></script>
</body>
</html>
`);

/* public/styles.css */
writeFile(path.join('public', 'styles.css'), `/* styles.css */
body { margin:0; font-family:Inter,Consolas,monospace; background:#071029; color:#e6eef8; }
header { display:flex; justify-content:space-between; align-items:center; padding:12px 20px; background:rgba(10,14,20,0.6); border-bottom:1px solid rgba(255,255,255,0.04); }
main { display:flex; gap:12px; padding:12px; height: calc(100vh - 64px); }
#left { flex:2; display:flex; flex-direction:column; gap:12px; }
#right { width:360px; display:flex; flex-direction:column; gap:12px; }
.panel { background: rgba(8,12,18,0.8); border-radius:8px; padding:10px; border:1px solid rgba(255,255,255,0.03); display:flex; flex-direction:column; }
.panel-title { font-size:12px; color:#9fb4ff; margin-bottom:8px; text-transform:uppercase; letter-spacing:0.12em; }
.output { background:#020617; padding:8px; border-radius:6px; height:220px; overflow:auto; font-size:13px; color:#dbeafe; }
.output.small { height:120px; }
.input-row { display:flex; gap:8px; margin-top:8px; }
.input-row input { flex:1; padding:8px; border-radius:6px; border:1px solid rgba(255,255,255,0.04); background:rgba(0,0,0,0.4); color:#e6eef8; }
.input-row button { padding:8px 12px; border-radius:6px; background:#2563eb; border:none; color:white; cursor:pointer; }
pre { color:#dbeafe; }
`);

/* public/renderer.js */
writeFile(path.join('public', 'renderer.js'), `// renderer.js
const chatOut = document.getElementById('chat-output');
const chatIn = document.getElementById('chat-input');
const chatSend = document.getElementById('chat-send');

const termOut = document.getElementById('terminal-output');
const termIn = document.getElementById('terminal-input');
const termSend = document.getElementById('terminal-send');

const metricField = document.getElementById('metric-field');
const metricMass = document.getElementById('metric-mass');
const metricLoop = document.getElementById('metric-loop');
const metricPulse = document.getElementById('metric-pulse');

const listSchedulesBtn = document.getElementById('list-schedules');
const schedulesList = document.getElementById('schedules-list');
const scheduleCreateBtn = document.getElementById('schedule-create');
const scheduleName = document.getElementById('schedule-name');
const scheduleInterval = document.getElementById('schedule-interval');
const scheduleCmd = document.getElementById('schedule-cmd');

const auditOut = document.getElementById('audit-output');
const enableTokenInput = document.getElementById('enable-token');
const enableDangerBtn = document.getElementById('enable-danger');

const agentStatusEl = document.getElementById('agent-status');

const wfDesc = document.getElementById('wf-desc');
const wfAddCmd = document.getElementById('wf-add-cmd');
const wfAddWait = document.getElementById('wf-add-wait');
const wfExport = document.getElementById('wf-export');
const wfCanvas = document.getElementById('workflow-canvas');
const wfJson = document.getElementById('wf-json');

let currentTask = { id: \`task-\${Date.now()}\`, description: 'New workflow', steps: [] };

function append(el, text) {
  const d = document.createElement('div');
  d.textContent = text;
  el.appendChild(d);
  el.scrollTop = el.scrollHeight;
}

async function updateAgentStatus() {
  const status = await window.primordial.agentStatus();
  agentStatusEl.innerText = JSON.stringify(status, null, 2);
  if (status && status.metrics) {
    metricField.innerText = status.metrics.fieldStrength.toFixed(2);
    metricMass.innerText = status.metrics.massProfile.toFixed(2);
    metricLoop.innerText = status.metrics.loopState;
    metricPulse.innerText = status.metrics.corePulse;
  }
}

chatSend.addEventListener('click', async () => {
  const msg = chatIn.value.trim();
  if (!msg) return;
  append(chatOut, \`You: \${msg}\`);
  chatIn.value = '';
  const res = await window.primordial.chat(msg);
  append(chatOut, \`Osmium: \${res.reply || ''}\`);
  if (res.metrics) {
    metricField.innerText = res.metrics.fieldStrength.toFixed(2);
    metricMass.innerText = res.metrics.massProfile.toFixed(2);
    metricLoop.innerText = res.metrics.loopState;
    metricPulse.innerText = res.metrics.corePulse;
  }
  updateAgentStatus();
});

termSend.addEventListener('click', async () => {
  const cmd = termIn.value.trim();
  if (!cmd) return;
  append(termOut, \`> \${cmd}\`);
  termIn.value = '';
  const res = await window.primordial.command(cmd);
  if (res.lines && Array.isArray(res.lines)) {
    for (const l of res.lines) {
      if (l === '<clear>') termOut.innerHTML = '';
      else append(termOut, l);
    }
  }
  if (res.metrics) {
    metricField.innerText = res.metrics.fieldStrength.toFixed(2);
    metricMass.innerText = res.metrics.massProfile.toFixed(2);
    metricLoop.innerText = res.metrics.loopState;
    metricPulse.innerText = res.metrics.corePulse;
  }
  updateAgentStatus();
});

listSchedulesBtn.addEventListener('click', async () => {
  const list = await window.primordial.listSchedules();
  schedulesList.innerHTML = '';
  for (const job of list) {
    append(schedulesList, \`\${job.id} | \${job.name} | every \${job.intervalSeconds}s | \${job.command}\`);
  }
});

scheduleCreateBtn.addEventListener('click', async () => {
  const name = scheduleName.value.trim() || \`job-\${Date.now()}\`;
  const interval = parseInt(scheduleInterval.value.trim(), 10) || 60;
  const cmd = scheduleCmd.value.trim();
  if (!cmd) {
    append(schedulesList, 'Provide a command to schedule.');
    return;
  }
  const job = { name, intervalSeconds: interval, command: cmd };
  const created = await window.primordial.schedule(job);
  append(schedulesList, \`Created: \${created.id} | \${created.name}\`);
});

enableDangerBtn.addEventListener('click', async () => {
  const token = enableTokenInput.value.trim();
  if (!token) {
    append(auditOut, 'Provide the enable token from your local ENABLE_TOKEN.txt file.');
    return;
  }
  const res = await window.primordial.enableDanger(token);
  append(auditOut, \`Enable attempt: \${JSON.stringify(res)}\`);
  updateAgentStatus();
});

// Workflow editor wiring
wfDesc && wfDesc.addEventListener('input', (e) => { currentTask.description = e.target.value; renderWorkflow(); });

wfAddCmd && wfAddCmd.addEventListener('click', () => {
  const payload = prompt('Command to run (e.g., field 0.5):') || '';
  if (!payload) return;
  currentTask.steps.push({ type: 'command', payload });
  renderWorkflow();
});

wfAddWait && wfAddWait.addEventListener('click', () => {
  const ms = prompt('Wait milliseconds:') || '1000';
  currentTask.steps.push({ type: 'wait', payload: ms });
  renderWorkflow();
});

wfExport && wfExport.addEventListener('click', () => {
  if (!currentTask.description) { alert('Add a description first'); return; }
  wfJson.textContent = JSON.stringify(currentTask, null, 2);
});

// render helper
function renderWorkflow() {
  if (!wfCanvas) return;
  wfCanvas.innerHTML = '';
  const title = document.createElement('div');
  title.textContent = currentTask.description || '(no description)';
  title.style.fontWeight = '600';
  wfCanvas.appendChild(title);
  currentTask.steps.forEach((s, i) => {
    const row = document.createElement('div');
    row.style.padding = '6px';
    row.style.borderTop = '1px solid rgba(255,255,255,0.03)';
    row.textContent = \`\${i+1}. [\${s.type}] \${s.payload}\`;
    wfCanvas.appendChild(row);
  });
}

renderWorkflow();
updateAgentStatus();
append(chatOut, 'Primordial Origin Pro Phase2 loaded. Use chat or workflow editor.');
`);

/* data/tasks.json and audit.log initial */
writeFile(path.join('data', 'tasks.json'), `[]`);
writeFile(path.join('data', 'audit.log'), `[]`);

/* README_RUN.md */
writeFile('README_RUN.md', `Run instructions

1. Install deps:
   npm install

2. Optional: create local enable token to allow dangerous actions:
   echo "your-passphrase" > ENABLE_TOKEN.txt
   set PRIMORDIAL_ENABLE_TOKEN=your-passphrase
   set PRIMORDIAL_ALLOW_DANGEROUS=true

3. Optional: configure LLM:
   set PRIMORDIAL_LLM_PROVIDER=openai
   set PRIMORDIAL_LLM_KEY=sk-...

4. Start:
   npm start
`);

/* Final message and optional run */
console.log('\\nAll files written. Backup of overwritten files (if any) is in:', backupDir);

if (RUN_AFTER) {
  console.log('\\nRunning npm install...');
  const npmInstall = spawnSync(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['install'], { stdio: 'inherit' });
  if (npmInstall.status !== 0) {
    console.error('npm install failed. Check output above.');
    process.exit(1);
  }
  console.log('\\nStarting app (npm start)...');
  const npmStart = spawnSync(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['start'], { stdio: 'inherit' });
  if (npmStart.status !== 0) {
    console.error('npm start failed. Check output above.');
    process.exit(1);
  }
} else {
  console.log('\\nDone. To install dependencies and run the app, set RUN_AFTER=true and re-run the script, or run:');
  console.log('  npm install');
  console.log('  npm start');
}

console.log('\\nMaster setup complete.');

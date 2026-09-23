import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const logsDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir, { recursive: true });

const daemonLog = fs.createWriteStream(path.join(logsDir, 'daemon.log'), { flags: 'a' });
const frontendLog = fs.createWriteStream(path.join(logsDir, 'frontend.log'), { flags: 'a' });

const nodeV22Dir = 'C:\\Users\\Shane\\AppData\\Local\\nvm\\v22.20.0';
const nodeV22 = path.join(nodeV22Dir, 'node.exe');
const tsxCli = 'C:\\Users\\Shane\\AppData\\Roaming\\npm\\node_modules\\tsx\\dist\\cli.mjs';
const daemonScript = path.join(__dirname, 'backend', 'daemon.ts');
const frontendDir = path.join(__dirname, 'frontend');
const viteBin = path.join(frontendDir, 'node_modules', 'vite', 'bin', 'vite.js');

console.log('===================================================');
console.log('🌊 PRIMORDIA FLOW // SOVEREIGN ENGINE SUPERVISOR');
console.log('   Port 3006: PHOM Sovereign Headless Daemon');
console.log('   Port 5174: Primordia Flow Vite UI Cockpit');
console.log('===================================================');

// 1. Start PHOM Daemon
let daemonProc = null;
function startDaemon() {
  console.log('[Supervisor] Spawning PHOM Daemon (Port 3006)...');
  daemonProc = spawn(nodeV22, [tsxCli, daemonScript], {
    cwd: __dirname,
    env: {
      ...process.env,
      FLOW_DAEMON_PORT: '3006',
      PATH: `${nodeV22Dir};${process.env.PATH};C:\\Users\\Shane\\AppData\\Roaming\\npm`
    },
    shell: false
  });

  daemonProc.stdout.on('data', (d) => {
    daemonLog.write(d);
    process.stdout.write(`[DAEMON] ${d}`);
  });

  daemonProc.stderr.on('data', (d) => {
    daemonLog.write(d);
    process.stderr.write(`[DAEMON ERR] ${d}`);
  });

  daemonProc.on('exit', (code) => {
    console.warn(`[Supervisor] Daemon exited with code ${code}. Respawning in 3s...`);
    setTimeout(startDaemon, 3000);
  });
}

// 2. Start Frontend Vite UI
let frontendProc = null;
function startFrontend() {
  console.log('[Supervisor] Spawning Frontend Cockpit (Port 5174)...');
  frontendProc = spawn(nodeV22, [viteBin, '--port', '5174', '--host', '0.0.0.0'], {
    cwd: frontendDir,
    env: {
      ...process.env,
      PATH: `${nodeV22Dir};${process.env.PATH}`
    },
    shell: false
  });

  frontendProc.stdout.on('data', (d) => {
    frontendLog.write(d);
    process.stdout.write(`[UI] ${d}`);
  });

  frontendProc.stderr.on('data', (d) => {
    frontendLog.write(d);
    process.stderr.write(`[UI ERR] ${d}`);
  });

  frontendProc.on('exit', (code) => {
    console.warn(`[Supervisor] Frontend exited with code ${code}. Respawning in 3s...`);
    setTimeout(startFrontend, 3000);
  });
}

startDaemon();
startFrontend();

// Handle graceful termination
process.on('SIGINT', () => {
  console.log('\n[Supervisor] Shutting down Primordia Flow...');
  if (daemonProc) daemonProc.kill();
  if (frontendProc) frontendProc.kill();
  process.exit(0);
});

process.on('SIGTERM', () => {
  if (daemonProc) daemonProc.kill();
  if (frontendProc) frontendProc.kill();
  process.exit(0);
});

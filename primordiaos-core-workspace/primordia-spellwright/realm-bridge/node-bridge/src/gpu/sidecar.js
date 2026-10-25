// Drives the standalone Vulkan engine (realm-bridge/gpu, primordia_realmd --stdio) as a
// child process: PrimordiaOS -> sidecar as JSON lines on stdin (manifest, metaphysics,
// quality), sidecar -> PrimordiaOS as JSON lines on stdout (ready, telemetry, mcp_results).
import { spawn } from 'node:child_process';
import readline from 'node:readline';

export function startGpuSidecar({ exe, args = [], log = () => {}, onMessage = () => {} }) {
  const child = spawn(exe, ['--stdio', ...args], { stdio: ['pipe', 'pipe', 'pipe'], windowsHide: true });
  let alive = true;
  let exitInfo = null;

  readline.createInterface({ input: child.stdout }).on('line', (line) => {
    if (!line.trim()) return;
    let msg;
    try {
      msg = JSON.parse(line);
    } catch {
      log(`[gpu] unparsable sidecar line: ${line.slice(0, 200)}`);
      return;
    }
    onMessage(msg);
  });
  readline.createInterface({ input: child.stderr }).on('line', (line) => {
    if (line.includes('[vulkan] loader:')) return; // machine-level loader notes, not ours
    log(`[gpu] ${line}`);
  });
  child.on('error', (err) => {
    alive = false;
    log(`[gpu] sidecar failed to start: ${err.message}`);
  });
  child.on('exit', (code, signal) => {
    alive = false;
    exitInfo = { code, signal };
    log(`[gpu] sidecar exited (${signal ?? code})`);
  });
  child.stdin.on('error', () => {}); // the child may close stdin first on shutdown

  return {
    get alive() {
      return alive;
    },
    get exit() {
      return exitInfo;
    },
    pid: child.pid,
    send(msg) {
      if (!alive) return false;
      return child.stdin.write(JSON.stringify(msg) + '\n');
    },
    /** Asks the sidecar to quit, then kills it if it has not gone within `graceMs`. */
    close(graceMs = 3000) {
      if (!alive) return Promise.resolve();
      return new Promise((resolve) => {
        const timer = setTimeout(() => {
          child.kill();
        }, graceMs);
        child.once('exit', () => {
          clearTimeout(timer);
          resolve();
        });
        this.send({ type: 'quit' });
        child.stdin.end();
      });
    },
  };
}

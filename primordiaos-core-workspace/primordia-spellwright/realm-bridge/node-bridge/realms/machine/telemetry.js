// Live telemetry of the machine the bridge runs on: the raw material of the
// "processing layer" realm. One shared sampler for every machine module.
//
//   cores[i].load   per-logical-core busy fraction (os.cpus() deltas, 250 ms, smoothed)
//   load            mean core load            imbalance  spread between cores (0 even .. 1 lopsided)
//   memUsed         used RAM fraction         procs      [{pid, ppid, name, cpu, memMB}] (5 s)
//   churn           processes born + died per sample, relative to the population
//   netRx / netTx   bytes per second (Windows `netstat -e`, 2 s; 0 elsewhere)
//
// Sampling never blocks the bridge's master loop: process and network reads are
// async child processes, and a slow one simply skips its next turn.
import os from 'node:os';
import { execFile } from 'node:child_process';

const CPU_MS = 250;
const PROC_MS = 5000; // a full Win32_Process read takes ~1-4 s
const NET_MS = 2000;
const IS_WINDOWS = process.platform === 'win32';

const cpus = os.cpus();
export const machine = {
  host: os.hostname(),
  cpuModel: (cpus[0]?.model ?? 'Unknown CPU').trim(),
  logical: Math.max(1, cpus.length),
  maxMHz: Math.max(...cpus.map((c) => c.speed || 0), 1000),
  memTotalGB: os.totalmem() / 2 ** 30,
};

const t = {
  cores: cpus.map(() => ({ load: 0 })),
  load: 0,
  imbalance: 0,
  memUsed: 0,
  procs: [],
  procCount: 0,
  procsVersion: 0,
  churn: 0,
  netRx: 0,
  netTx: 0,
};

let started = false;
let prevTimes = null;
const prevCpuMs = new Map(); // pid -> cumulative CPU ms
let prevProcAt = 0;
let prevNet = null;

function sampleCpu() {
  const now = os.cpus().map((c) => c.times);
  if (prevTimes) {
    now.forEach((times, i) => {
      const p = prevTimes[i];
      const busy = times.user + times.nice + times.sys + times.irq - (p.user + p.nice + p.sys + p.irq);
      const total = busy + (times.idle - p.idle);
      const load = total > 0 ? busy / total : 0;
      const core = t.cores[i] ?? (t.cores[i] = { load: 0 });
      core.load = core.load * 0.5 + load * 0.5;
    });
  }
  prevTimes = now;
  const loads = t.cores.map((c) => c.load);
  t.load = loads.reduce((a, b) => a + b, 0) / loads.length;
  const sd = Math.sqrt(loads.reduce((a, b) => a + (b - t.load) ** 2, 0) / loads.length);
  t.imbalance = Math.min(1, sd * 2.5);
  t.memUsed = 1 - os.freemem() / os.totalmem();
}

function run(cmd, args) {
  return new Promise((resolve) =>
    execFile(cmd, args, { windowsHide: true, maxBuffer: 32 << 20, timeout: 15000 }, (err, stdout) => resolve(err ? null : stdout)),
  );
}

// ps `time` is [[DD-]HH:]MM:SS(.ss)
function psTimeMs(s) {
  const [days, rest] = s.includes('-') ? s.split('-') : ['0', s];
  const parts = rest.split(':').map(Number);
  while (parts.length < 3) parts.unshift(0);
  return ((+days * 24 + parts[0]) * 3600 + parts[1] * 60 + parts[2]) * 1000;
}

async function readProcesses() {
  if (IS_WINDOWS) {
    // Absolute path: Windows PowerShell is not always on PATH (e.g. under pwsh-only shells).
    const shell = process.env.SystemRoot ? `${process.env.SystemRoot}\\System32\\WindowsPowerShell\\v1.0\\powershell.exe` : 'powershell.exe';
    const out = await run(shell, [
      '-NoProfile', '-NonInteractive', '-Command',
      'Get-CimInstance Win32_Process | Select-Object ProcessId,ParentProcessId,Name,WorkingSetSize,KernelModeTime,UserModeTime | ConvertTo-Json -Compress',
    ]);
    if (!out) return null;
    // Pid 0 is the System Idle Process: its "CPU time" is idle time, not work.
    const rows = [].concat(JSON.parse(out)).filter((r) => r.ProcessId !== 0);
    return rows.map((r) => ({
      pid: r.ProcessId,
      ppid: r.ParentProcessId,
      name: String(r.Name ?? '?').replace(/\.exe$/i, ''),
      cpuMs: ((r.KernelModeTime ?? 0) + (r.UserModeTime ?? 0)) / 1e4, // 100 ns ticks
      memMB: (r.WorkingSetSize ?? 0) / 2 ** 20,
    }));
  }
  const out = await run('ps', ['-A', '-o', 'pid=,ppid=,rss=,time=,comm=']);
  if (!out) return null;
  return out.trim().split('\n').map((line) => {
    const [pid, ppid, rss, time, ...comm] = line.trim().split(/\s+/);
    return { pid: +pid, ppid: +ppid, name: comm.join(' ').split('/').pop(), cpuMs: psTimeMs(time), memMB: +rss / 1024 };
  });
}

let procBusy = false;
async function sampleProcesses() {
  if (procBusy) return;
  procBusy = true;
  try {
    const rows = await readProcesses();
    if (!rows) return;
    const at = Date.now();
    const wall = prevProcAt ? at - prevProcAt : 0;
    let born = 0;
    const alive = new Set();
    t.procs = rows.map((r) => {
      alive.add(r.pid);
      const prev = prevCpuMs.get(r.pid);
      if (prev === undefined && prevProcAt) born++;
      // Share of the whole machine (all logical cores) over the last interval.
      const cpu = wall > 0 && prev !== undefined ? Math.max(0, (r.cpuMs - prev) / (wall * machine.logical)) : 0;
      prevCpuMs.set(r.pid, r.cpuMs);
      return { pid: r.pid, ppid: r.ppid, name: r.name, cpu: Math.min(1, cpu), memMB: r.memMB };
    });
    let died = 0;
    for (const pid of prevCpuMs.keys()) if (!alive.has(pid)) { prevCpuMs.delete(pid); died++; }
    t.churn = prevProcAt ? Math.min(1, ((born + died) / Math.max(1, rows.length)) * 10) : 0;
    t.procCount = rows.length;
    prevProcAt = at;
    t.procsVersion++;
  } catch {
    // A malformed read is skipped; the next one replaces it.
  } finally {
    procBusy = false;
  }
}

async function sampleNetwork() {
  if (!IS_WINDOWS) return;
  const out = await run('netstat', ['-e']);
  const m = out && /Bytes\s+(\d+)\s+(\d+)/.exec(out);
  if (!m) return;
  const now = { at: Date.now(), rx: +m[1], tx: +m[2] };
  if (prevNet && now.at > prevNet.at) {
    const s = (now.at - prevNet.at) / 1000;
    t.netRx = Math.max(0, (now.rx - prevNet.rx) / s);
    t.netTx = Math.max(0, (now.tx - prevNet.tx) / s);
  }
  prevNet = now;
}

/** The live telemetry object (sampling starts on first use; timers never keep the process alive). */
export function telemetry() {
  if (!started) {
    started = true;
    sampleCpu();
    sampleProcesses();
    sampleNetwork();
    setInterval(sampleCpu, CPU_MS).unref();
    setInterval(sampleProcesses, PROC_MS).unref();
    setInterval(sampleNetwork, NET_MS).unref();
  }
  return t;
}

/** The host name as a word fit for an intent ("PRIMORDIA"). */
export function hostWord() {
  return machine.host.replace(/[^A-Za-z0-9]/g, '').toUpperCase() || 'HOST';
}

/** Cool cyan when idle, white-hot amber/red under load. */
export function heatHue(load) {
  return 0.55 * (1 - Math.min(1, Math.max(0, load)));
}

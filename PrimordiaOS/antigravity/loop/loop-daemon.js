import { runAntigravityLoop } from "./run-loop.js";

const DEFAULT_INTERVAL_MS = 60 * 60 * 1000;

export function startDaemon(intervalMs = DEFAULT_INTERVAL_MS) {
  console.log(`??? Antigravity Daemon started. Polling every ${intervalMs / 1000}s`);
  runAntigravityLoop();
  const timer = setInterval(() => runAntigravityLoop(), intervalMs);
  return () => clearInterval(timer);
}

if (process.argv[1] && process.argv[1].endsWith("loop-daemon.js")) {
  startDaemon();
}

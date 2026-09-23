import { spawn } from 'child_process';
import path from 'path';

const flowDir = 'C:\\Users\\Shane\\Documents\\dev\\PrimordiaOS\\primordia-flow';
const supervisor = path.join(flowDir, 'supervisor.mjs');

const child = spawn(process.execPath, [supervisor], {
  cwd: flowDir,
  detached: true,
  stdio: 'ignore'
});

child.unref();

console.log('===================================================');
console.log('⚡ Primordia Flow / PHOM Supervisor Spawned');
console.log('   PID:', child.pid);
console.log('   Port 3006: Headless PHOM Daemon + WebSocket');
console.log('   Port 5174: Vite Cockpit UI');
console.log('===================================================');

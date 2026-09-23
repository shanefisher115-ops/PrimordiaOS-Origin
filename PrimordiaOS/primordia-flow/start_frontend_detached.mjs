import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

const flowDir = 'C:\\Users\\Shane\\Documents\\dev\\PrimordiaOS\\primordia-flow';
const frontendDir = path.join(flowDir, 'frontend');
const viteBin = path.join(frontendDir, 'node_modules', 'vite', 'bin', 'vite.js');

const logsDir = path.join(flowDir, 'logs');
if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir, { recursive: true });
const outLog = fs.openSync(path.join(logsDir, 'frontend_vite.log'), 'a');
const errLog = fs.openSync(path.join(logsDir, 'frontend_vite_err.log'), 'a');

const child = spawn(process.execPath, [viteBin, '--port', '5174', '--host', '127.0.0.1'], {
  cwd: frontendDir,
  detached: true,
  stdio: ['ignore', outLog, errLog]
});

child.unref();

console.log('Primordia Flow Frontend spawned in detached mode.');
console.log('PID:', child.pid);
console.log('URL: http://localhost:5174');

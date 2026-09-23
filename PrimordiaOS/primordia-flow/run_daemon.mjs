import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const daemonPath = path.join(__dirname, 'backend', 'daemon.ts');
const tsxCmd = 'C:\\Users\\Shane\\AppData\\Roaming\\npm\\tsx.cmd';

const child = spawn(tsxCmd, [daemonPath], {
  cwd: __dirname,
  env: {
    ...process.env,
    FLOW_DAEMON_PORT: '3006',
    PATH: `${process.env.PATH};C:\\Users\\Shane\\AppData\\Roaming\\npm;C:\\Program Files\\nodejs`
  },
  stdio: 'inherit',
  shell: true
});

child.on('exit', (code) => {
  process.exit(code || 0);
});

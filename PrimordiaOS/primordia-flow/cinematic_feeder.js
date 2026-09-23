import fs from 'fs';
import { execSync } from 'child_process';

const QUEUE_PATH = './cinematic_queue.json';

if (!fs.existsSync(QUEUE_PATH)) {
    console.error("[Error] cinematic_queue.json not found. Run cinematic_queue.js first.");
    process.exit(1);
}

let queue = JSON.parse(fs.readFileSync(QUEUE_PATH, 'utf8'));
const nextItem = queue.find(item => item.status === 'QUEUED');

if (!nextItem) {
    console.log("[Primordia Flow] All queued cinematic prompts have been dispatched!");
    process.exit(0);
}

// Copy prompt directly to Windows clipboard
const clipCommand = `echo | set /p="${nextItem.prompt}" | clip`;
execSync(clipCommand, { shell: 'cmd.exe' });

nextItem.status = 'COPIED_TO_CLIPBOARD';
fs.writeFileSync(QUEUE_PATH, JSON.stringify(queue, null, 2));

console.log(`[Primordia Flow] Next prompt loaded and COPIED to clipboard:\n`);
console.log(nextItem.prompt);
console.log(`\n[Action] Paste into Google Flow and render!`);

// PrimordiaOS Live Scheduler (TypeScript)
// Run with: npx tsx src/live/scheduler.ts

import './sources/poll.js';            // TSX resolves .js → .ts
import { runExecutor } from './loops/executor.js';

const EXECUTION_INTERVAL_SECONDS = 30;

function startScheduler() {
    console.log('[PrimordiaOS] Scheduler started.');

    setInterval(() => {
        console.log('\n[PrimordiaOS] Scheduler tick — running executor...');
        runExecutor();
    }, EXECUTION_INTERVAL_SECONDS * 1000);
}

startScheduler();

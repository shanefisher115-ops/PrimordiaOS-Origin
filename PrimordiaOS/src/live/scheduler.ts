import './sources/poll.js';
import { runExecutor } from './loops/executor.js';

const EXECUTION_INTERVAL_SECONDS = 5;

function startScheduler() {
    console.log('[PrimordiaOS] Scheduler started.');

    setInterval(() => {
        console.log('\\n[PrimordiaOS] Scheduler tick — running executor...');
        runExecutor();
    }, EXECUTION_INTERVAL_SECONDS * 1000);
}

startScheduler();

const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');

if (!isMainThread) {
    // Background Worker Execution Loop
    parentPort.on('message', (task) => {
        const start = performance.now();
        let result = 0;
        // Heavy mathematical work simulating agent task resolution
        for (let i = 0; i < task.iterations; i++) {
            result += Math.sin(i) * Math.cos(i);
        }
        const duration = performance.now() - start;
        parentPort.postMessage({ workerId: workerData.id, result, duration });
    });
} else {
    const os = require('os');
    class WorkerThreadPool {
        constructor(maxThreads = 4) {
            this.maxThreads = maxThreads;
            this.workers = [];
            this.init();
        }

        init() {
            for (let i = 0; i < this.maxThreads; i++) {
                const worker = new Worker(__filename, { workerData: { id: i } });
                this.workers.push(worker);
            }
        }

        dispatchTask(iterations = 1000000) {
            return new Promise((resolve) => {
                if (this.workers.length === 0) return resolve(null);
                const worker = this.workers[Math.floor(Math.random() * this.workers.length)];
                const handler = (msg) => {
                    worker.off('message', handler);
                    resolve(msg);
                };
                worker.on('message', handler);
                worker.postMessage({ iterations });
            });
        }
    }
    module.exports = { WorkerThreadPool };
}
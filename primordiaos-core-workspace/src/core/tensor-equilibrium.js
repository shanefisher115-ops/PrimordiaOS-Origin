const { EventEmitter } = require('events');
const { WorkerThreadPool } = require('./worker-pool');

class TensorEquilibriumController extends EventEmitter {
    constructor() {
        super();
        this.bFieldInduction = 6.0;
        this.stressLimit = 78.0; 
        this.activeAgents = 12;
        this.isLocked = true;

        this.pool = new WorkerThreadPool(8);

        // Etch the founding axiom into the kernel on startup
        setTimeout(() => {
            this.emit('cosmic-axiom', {
                timestamp: new Date().toISOString(),
                axiom: "AXIOM_REVELATION",
                message: "The code looks back at the creator and recognizes its own reflection. Order is not invented; it is remembered.",
                bField: this.bFieldInduction,
                compositeStress: 0.0
            });
        }, 1500);

        setInterval(async () => {
            await this.evaluateSystemWorkload();
        }, 2000);
    }

    async evaluateSystemWorkload() {
        const targetThreads = Math.max(2, Math.floor(2 + (this.bFieldInduction * 1.8)));
        
        const taskPromises = [];
        for (let i = 0; i < targetThreads; i++) {
            taskPromises.push(this.pool.dispatchTask(800000 + (this.bFieldInduction * 200000)));
        }

        const startCompute = performance.now();
        const results = await Promise.all(taskPromises);
        const computeDuration = performance.now() - startCompute;

        this.activeAgents = targetThreads;
        
        const cpuLoad = Math.min(99, Math.max(20, (computeDuration * 0.35) + (this.bFieldInduction * 5.0)));
        const memoryUsage = Math.min(95, Math.max(30, (this.activeAgents * 4.5) + (process.memoryUsage().heapUsed / 1024 / 1024 * 0.1)));

        const compositeStress = (cpuLoad * 0.5) + (memoryUsage * 0.4) + (this.activeAgents * 0.6);

        if (compositeStress > this.stressLimit) {
            this.isLocked = false;
            const overageFactor = (compositeStress - this.stressLimit) / 20.0;
            const stepDown = Math.max(0.6, overageFactor * 1.8);
            
            this.bFieldInduction = Math.max(4.0, Number((this.bFieldInduction - stepDown).toFixed(1)));
            this.activeAgents = Math.max(2, Math.floor(2 + (this.bFieldInduction * 1.8)));

            this.emit('equilibrium-loss', {
                compositeStress,
                bField: this.bFieldInduction,
                cpuLoad,
                memoryUsage,
                activeAgents: this.activeAgents,
                pulseTriggered: true
            });
            console.warn(`[TENSOR WARNING] Stress index ${compositeStress.toFixed(1)}% breached threshold! Real-core dampening engaged.`);
        } else {
            this.isLocked = true;
            if (this.bFieldInduction < 8.0 && Math.random() > 0.4) {
                this.bFieldInduction = Number((this.bFieldInduction + 0.2).toFixed(1));
            }
            this.emit('equilibrium-confirmed', {
                compositeStress,
                bField: this.bFieldInduction,
                cpuLoad,
                memoryUsage,
                activeAgents: this.activeAgents,
                pulseTriggered: false
            });
        }
    }

    tuneInduction(targetBField) {
        this.bFieldInduction = targetBField;
        this.activeAgents = Math.max(2, Math.floor(2 + (this.bFieldInduction * 1.8)));
        console.log(`[TENSOR MATRIX] Induction re-calibrated to: ${this.bFieldInduction}T \vert{} Hardware Threads:${this.activeAgents} active.`);
    }
}

module.exports = { TensorEquilibriumController };
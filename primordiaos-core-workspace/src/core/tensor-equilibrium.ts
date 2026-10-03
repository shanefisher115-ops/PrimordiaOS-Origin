import { EventEmitter } from 'events';

interface SystemMetrics {
    cpuLoad: number;
    memoryUsage: number;
    activeAgents: number;
}

export class TensorEquilibriumController extends EventEmitter {
    private bFieldInduction: number = 4.8;
    private stressLimit: number = 85.0;
    private isLocked: boolean = true;

    constructor() {
        super();
    }

    public evaluateStressTensor(metrics: SystemMetrics): void {
        const compositeStress = (metrics.cpuLoad * 0.4) + (metrics.memoryUsage * 0.4) + (metrics.activeAgents * 0.2);

        if (compositeStress > this.stressLimit) {
            this.isLocked = false;
            this.emit('equilibrium-loss', { compositeStress, bField: this.bFieldInduction });
            this.dampenSystem(compositeStress);
        } else {
            this.isLocked = true;
            this.emit('equilibrium-confirmed', { compositeStress, bField: this.bFieldInduction });
        }
    }

    private dampenSystem(stress: number): void {
        this.bFieldInduction = Math.max(1.0, this.bFieldInduction - 0.5);
        console.warn(`[TENSOR WARNING] Equilibrium destabilized at stress: ${stress.toFixed(1)}%. Dampening B-Field to ${this.bFieldInduction}T.`);
    }

    public tuneInduction(targetBField: number): void {
        this.bFieldInduction = targetBField;
        console.log(`[TENSOR MATRIX] Induction re-calibrated to: ${this.bFieldInduction}T. Equilibrium maintained.`);
    }
}

const matrix = new TensorEquilibriumController();

matrix.on('equilibrium-confirmed', (data) => {
    console.log(`[EQUILIBRIUM CONFIRMED] Tensor Index: ${data.compositeStress.toFixed(1)} | B-Field: ${data.bField}T`);
});

setInterval(() => {
    matrix.evaluateStressTensor({
        cpuLoad: Math.random() * 60 + 30,
        memoryUsage: 45.0,
        activeAgents: 12
    });
}, 3000);
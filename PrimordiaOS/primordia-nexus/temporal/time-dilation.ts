// temporal/time-dilation.ts
// PrimordiaOS Time Dilation — full implementation
// Allows realms or pipelines to run faster/slower relative to real time

export class TimeDilation {
    private factor: number;

    constructor() {
        this.factor = 1.0; // normal time
    }

    setFactor(f: number) {
        this.factor = Math.max(0.01, f);
    }

    getFactor() {
        return this.factor;
    }

    applyDelay(ms: number): Promise<void> {
        const adjusted = ms * this.factor;
        return new Promise((resolve) => setTimeout(resolve, adjusted));
    }
}

export const timeDilation = new TimeDilation();

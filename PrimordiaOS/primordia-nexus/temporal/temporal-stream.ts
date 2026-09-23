// temporal/temporal-stream.ts
// PrimordiaOS Temporal Stream — full implementation
// A temporal stream is a sequence of time-stamped states with rewind/fast-forward

export interface TemporalFrame<T = any> {
    ts: number;
    state: T;
}

export class TemporalStream<T = any> {
    private frames: TemporalFrame<T>[];
    private pointer: number;

    constructor() {
        this.frames = [];
        this.pointer = -1;
    }

    push(state: T) {
        const frame = { ts: Date.now(), state };
        this.frames.push(frame);
        this.pointer = this.frames.length - 1;
        return frame;
    }

    rewind(steps = 1): TemporalFrame<T> | null {
        this.pointer = Math.max(0, this.pointer - steps);
        return this.frames[this.pointer] || null;
    }

    fastForward(steps = 1): TemporalFrame<T> | null {
        this.pointer = Math.min(this.frames.length - 1, this.pointer + steps);
        return this.frames[this.pointer] || null;
    }

    current(): TemporalFrame<T> | null {
        return this.frames[this.pointer] || null;
    }

    all(): TemporalFrame<T>[] {
        return this.frames;
    }
}

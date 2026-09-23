// temporal/temporal-stream.ts
// PrimordiaOS Temporal Stream — full implementation
// A temporal stream is a sequence of time-stamped states with rewind/fast-forward
export class TemporalStream {
    frames;
    pointer;
    constructor() {
        this.frames = [];
        this.pointer = -1;
    }
    push(state) {
        const frame = { ts: Date.now(), state };
        this.frames.push(frame);
        this.pointer = this.frames.length - 1;
        return frame;
    }
    rewind(steps = 1) {
        this.pointer = Math.max(0, this.pointer - steps);
        return this.frames[this.pointer] || null;
    }
    fastForward(steps = 1) {
        this.pointer = Math.min(this.frames.length - 1, this.pointer + steps);
        return this.frames[this.pointer] || null;
    }
    current() {
        return this.frames[this.pointer] || null;
    }
    all() {
        return this.frames;
    }
}

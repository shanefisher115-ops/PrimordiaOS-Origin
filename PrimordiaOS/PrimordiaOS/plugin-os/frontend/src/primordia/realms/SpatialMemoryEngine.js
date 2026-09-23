"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SpatialMemoryEngine = void 0;
class SpatialMemoryEngine {
    constructor() {
        this.frames = [];
    }
    addFrame(frame) {
        this.frames.push(frame);
    }
    getFrames() {
        return this.frames;
    }
}
exports.SpatialMemoryEngine = SpatialMemoryEngine;

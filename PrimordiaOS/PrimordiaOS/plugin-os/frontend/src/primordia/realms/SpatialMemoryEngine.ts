export class SpatialMemoryEngine {
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

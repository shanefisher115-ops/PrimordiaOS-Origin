export class CockpitPhysics {
    velocity = { x: 0, y: 0, z: 124.5 };
    gravityDampening = 0.9998;
    warpFactor = 1.0;
    getVelocity() {
        return { ...this.velocity };
    }
    synchronizeInertialField() {
        this.velocity.x *= this.gravityDampening;
        this.velocity.y *= this.gravityDampening;
    }
    setWarpFactor(warp) {
        this.warpFactor = Math.max(0.1, warp);
    }
    getWarpFactor() {
        return this.warpFactor;
    }
}

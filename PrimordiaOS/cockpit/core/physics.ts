export interface Vector3D {
  x: number;
  y: number;
  z: number;
}

export class CockpitPhysics {
  private velocity: Vector3D = { x: 0, y: 0, z: 124.5 };
  private gravityDampening: number = 0.9998;
  private warpFactor: number = 1.0;

  getVelocity(): Vector3D {
    return { ...this.velocity };
  }

  synchronizeInertialField(): void {
    this.velocity.x *= this.gravityDampening;
    this.velocity.y *= this.gravityDampening;
  }

  setWarpFactor(warp: number): void {
    this.warpFactor = Math.max(0.1, warp);
  }

  getWarpFactor(): number {
    return this.warpFactor;
  }
}
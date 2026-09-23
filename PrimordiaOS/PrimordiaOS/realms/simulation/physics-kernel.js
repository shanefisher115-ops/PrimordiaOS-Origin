/**
 * Physics Kernel and State Machine for Simulation Realm.
 */
export class PhysicsKernel {
  constructor() {
    this.gravity = 9.81;
    this.volumetrics = true;
    this.atmosphere = true;
  }

  calculateState(deltaTime) {
    return {
      deltaTime,
      physics_active: true,
      entropy: 0.01
    };
  }
}

export const physicsKernel = new PhysicsKernel();

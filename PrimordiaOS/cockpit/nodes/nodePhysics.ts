export class NodePhysics {
  computeOrbitalTether(distance: number): number {
    return Math.max(0.5, 1000 / (distance + 1));
  }
}
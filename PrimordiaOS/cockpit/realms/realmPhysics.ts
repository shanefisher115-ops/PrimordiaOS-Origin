export class RealmPhysics {
  getGravitationalConstant(realmId: string): number {
    return realmId === "origin-realm" ? 9.80665 : 1.62;
  }

  calculateDrag(velocity: number): number {
    return 0.001 * Math.pow(velocity, 2);
  }
}
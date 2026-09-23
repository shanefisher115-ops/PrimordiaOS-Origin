export class RealmPhysics {
    getGravitationalConstant(realmId) {
        return realmId === "origin-realm" ? 9.80665 : 1.62;
    }
    calculateDrag(velocity) {
        return 0.001 * Math.pow(velocity, 2);
    }
}

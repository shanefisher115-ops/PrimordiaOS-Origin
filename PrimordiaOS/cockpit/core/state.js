export class CockpitState {
    state = {
        powerGrid: 100,
        shieldHarmonics: 98.4,
        quantumLock: true,
        activeRealmId: "realm-prime"
    };
    get() {
        return { ...this.state };
    }
    update(patch) {
        this.state = { ...this.state, ...patch };
    }
}

export class EngineerAgent {
    bus;
    constructor(bus) {
        this.bus = bus;
    }
    balancePlasmaReactors() {
        this.bus.dispatchMessage("engineer", "Reactors balanced at 100% equilibrium.");
    }
}

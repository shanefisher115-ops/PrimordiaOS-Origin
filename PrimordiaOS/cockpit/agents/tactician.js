export class TacticianAgent {
    bus;
    constructor(bus) {
        this.bus = bus;
    }
    scanCognitivePerimeter() {
        this.bus.dispatchMessage("tactician", "Perimeter clear. Anti-collapse defenses nominal.");
    }
}

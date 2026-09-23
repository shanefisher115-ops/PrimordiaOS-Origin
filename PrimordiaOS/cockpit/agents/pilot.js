export class PilotAgent {
    bus;
    constructor(bus) {
        this.bus = bus;
    }
    engageAutoThrottle() {
        this.bus.dispatchMessage("pilot", "Throttle stabilized at cruising velocity.");
    }
}

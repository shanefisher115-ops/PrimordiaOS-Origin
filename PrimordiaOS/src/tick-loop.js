export class TickLoop {
    engine;
    constructor(engine) {
        this.engine = engine;
    }
    start() {
        console.log("Tick loop started.");
        setInterval(() => {
            this.engine.decision.tick();
            this.engine.coordinator.coordinate();
        }, 2000);
    }
}

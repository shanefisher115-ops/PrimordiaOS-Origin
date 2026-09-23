export class TickLoop {
  constructor(private engine: any) {}

  start() {
    console.log("Tick loop started.");

    setInterval(() => {
      this.engine.decision.tick();
      this.engine.coordinator.coordinate();
    }, 2000);
  }
}

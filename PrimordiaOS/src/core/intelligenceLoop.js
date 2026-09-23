// core/intelligenceLoop.ts
export class IntelligenceLoop {
    coordinator;
    sources;
    config;
    timer = null;
    constructor(coordinator, sources, config = {
        intervalMs: 5000,
        logSummary: true,
    }) {
        this.coordinator = coordinator;
        this.sources = sources;
        this.config = config;
    }
    start() {
        console.log("PrimordiaOS Intelligence Loop: STARTED");
        this.timer = setInterval(async () => {
            try {
                const state = await this.sources.getState();
                const signals = await this.sources.getRealmSignals();
                const temporal = await this.sources.getTemporalEvents();
                const memory = await this.sources.getMemoryNodes();
                const summary = await this.coordinator.runCycle(state, signals, temporal, memory);
                if (this.config.logSummary) {
                    console.log("Intelligence Cycle Summary:", summary);
                }
            }
            catch (err) {
                console.error("Intelligence Loop Error:", err);
            }
        }, this.config.intervalMs);
    }
    stop() {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
            console.log("PrimordiaOS Intelligence Loop: STOPPED");
        }
    }
}

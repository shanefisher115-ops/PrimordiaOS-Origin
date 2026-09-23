export class AgentBus {
    log = [];
    dispatchMessage(from, message) {
        this.log.push({ from, message, timestamp: Date.now() });
    }
    getRecentLogs() {
        return [...this.log];
    }
}

export class AgentBus {
  private log: Array<{ from: string; message: string; timestamp: number }> = [];

  dispatchMessage(from: string, message: string): void {
    this.log.push({ from, message, timestamp: Date.now() });
  }

  getRecentLogs() {
    return [...this.log];
  }
}
// state/healthMonitor.ts
class HealthMonitor {
    computeGlobalHealth() {
        return 0.8; // placeholder until real metrics are wired
    }
    computeDrift() {
        return Math.random() * 0.3;
    }
    computeStaleness() {
        return Math.random() * 1000 * 60 * 60;
    }
}
export const healthMonitor = new HealthMonitor();

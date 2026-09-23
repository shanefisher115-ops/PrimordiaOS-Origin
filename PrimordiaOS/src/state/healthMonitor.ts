// state/healthMonitor.ts

class HealthMonitor {
  computeGlobalHealth(): number {
    return 0.8; // placeholder until real metrics are wired
  }

  computeDrift(): number {
    return Math.random() * 0.3;
  }

  computeStaleness(): number {
    return Math.random() * 1000 * 60 * 60;
  }
}

export const healthMonitor = new HealthMonitor();

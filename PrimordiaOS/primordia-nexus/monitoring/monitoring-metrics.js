// monitoring/monitoring-metrics.js
// ESM version — collects runtime metrics

export const monitoringMetrics = {
    metrics: {
        bootTime: null,
        heartbeatCount: 0
    },

    start() {
        this.metrics.bootTime = Date.now();
        console.log("[Monitoring] Metrics collector online");
    },

    incrementHeartbeat() {
        this.metrics.heartbeatCount++;
    }
};

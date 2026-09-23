// monitoring/monitoring-log.js
// ESM version — logging subsystem

export const monitoringLog = {
    logs: [],

    start() {
        console.log("[Monitoring] Log system online");
    },

    write(entry) {
        this.logs.push({
            ts: Date.now(),
            entry
        });
    }
};

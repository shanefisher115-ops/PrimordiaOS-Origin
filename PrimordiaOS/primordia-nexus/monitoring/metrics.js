// monitoring/metrics.ts
// PrimordiaOS Metrics Collector — full implementation
// Tracks counters, gauges, histograms, and timing metrics
export class Metrics {
    counters;
    gauges;
    timings;
    constructor() {
        this.counters = new Map();
        this.gauges = new Map();
        this.timings = new Map();
    }
    increment(name, amount = 1) {
        const metric = this.counters.get(name) || { name, value: 0 };
        metric.value += amount;
        this.counters.set(name, metric);
    }
    setGauge(name, value) {
        this.gauges.set(name, { name, value });
    }
    recordTiming(name, ms) {
        const metric = this.timings.get(name) || { name, samples: [] };
        metric.samples.push(ms);
        this.timings.set(name, metric);
    }
    getSnapshot() {
        return {
            counters: Array.from(this.counters.values()),
            gauges: Array.from(this.gauges.values()),
            timings: Array.from(this.timings.values())
        };
    }
}
export const metrics = new Metrics();

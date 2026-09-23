// monitoring/metrics.ts
// PrimordiaOS Metrics Collector — full implementation
// Tracks counters, gauges, histograms, and timing metrics

export interface CounterMetric {
    name: string;
    value: number;
}

export interface GaugeMetric {
    name: string;
    value: number;
}

export interface TimingMetric {
    name: string;
    samples: number[];
}

export class Metrics {
    private counters: Map<string, CounterMetric>;
    private gauges: Map<string, GaugeMetric>;
    private timings: Map<string, TimingMetric>;

    constructor() {
        this.counters = new Map();
        this.gauges = new Map();
        this.timings = new Map();
    }

    increment(name: string, amount = 1) {
        const metric = this.counters.get(name) || { name, value: 0 };
        metric.value += amount;
        this.counters.set(name, metric);
    }

    setGauge(name: string, value: number) {
        this.gauges.set(name, { name, value });
    }

    recordTiming(name: string, ms: number) {
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

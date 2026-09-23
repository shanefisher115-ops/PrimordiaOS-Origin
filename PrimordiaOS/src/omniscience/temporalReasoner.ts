// omniscience/temporalReasoner.ts

import { TemporalEvent, TemporalInsight } from "./types";

export interface TemporalReasonerConfig {
  shortWindowMs: number;
  longWindowMs: number;
  trendThreshold: number;
  anomalyDeviationMultiplier: number;
}

export class TemporalReasoner {
  private config: TemporalReasonerConfig;

  constructor(config: TemporalReasonerConfig) {
    this.config = config;
  }

  analyze(events: TemporalEvent[]): TemporalInsight[] {
    const now = Date.now();
    const shortStart = now - this.config.shortWindowMs;
    const longStart = now - this.config.longWindowMs;

    const shortWindow = events.filter((e) => e.timestamp >= shortStart);
    const longWindow = events.filter((e) => e.timestamp >= longStart);

    const insights: TemporalInsight[] = [];

    const shortAvg = this.averageValue(shortWindow);
    const longAvg = this.averageValue(longWindow);

    if (shortAvg > longAvg * (1 + this.config.trendThreshold)) {
      insights.push({
        id: `temporal-uptrend-${Date.now()}`,
        type: "trend",
        direction: "up",
        message:
          "Short-term activity is significantly above long-term baseline.",
        shortTermAverage: shortAvg,
        longTermAverage: longAvg,
        timestamp: now,
      });
    } else if (shortAvg < longAvg * (1 - this.config.trendThreshold)) {
      insights.push({
        id: `temporal-downtrend-${Date.now()}`,
        type: "trend",
        direction: "down",
        message:
          "Short-term activity is significantly below long-term baseline.",
        shortTermAverage: shortAvg,
        longTermAverage: longAvg,
        timestamp: now,
      });
    }

    const anomaly = this.detectAnomaly(shortWindow, longAvg);
    if (anomaly) insights.push(anomaly);

    return insights;
  }

  private averageValue(events: TemporalEvent[]): number {
    if (events.length === 0) return 0;
    return events.reduce((sum, e) => sum + e.value, 0) / events.length;
  }

  private detectAnomaly(
    shortWindow: TemporalEvent[],
    baseline: number
  ): TemporalInsight | null {
    if (shortWindow.length === 0) return null;

    const values = shortWindow.map((e) => e.value);
    const avg = this.averageValue(shortWindow);
    const variance =
      values.reduce((sum, v) => sum + (v - avg) ** 2, 0) / values.length;
    const stdDev = Math.sqrt(variance);

    const deviation = Math.abs(avg - baseline);
    if (stdDev === 0) return null;

    const multiplier = deviation / stdDev;
    if (multiplier < this.config.anomalyDeviationMultiplier) return null;

    return {
      id: `temporal-anomaly-${Date.now()}`,
      type: "anomaly",
      direction: avg > baseline ? "up" : "down",
      message:
        "Short-term activity deviates significantly from long-term baseline.",
      shortTermAverage: avg,
      longTermAverage: baseline,
      deviationMultiplier: multiplier,
      timestamp: Date.now(),
    };
  }
}

import { PrimordiaKernel } from "../kernel";
import { MoneyPlugHub } from "../moneyplughub/mph.core";

interface AMOConfig {
  enabled: boolean;
  loopIntervalMs: number;
}

export class AMO {
  private kernel: PrimordiaKernel;
  private mph: MoneyPlugHub;
  private config: AMOConfig;
  private lastLoop = 0;

  constructor(kernel: PrimordiaKernel, mph: MoneyPlugHub, config: AMOConfig) {
    this.kernel = kernel;
    this.mph = mph;
    this.config = config;
  }

  tick() {
    if (!this.config.enabled) return;
    const now = Date.now();
    if (now - this.lastLoop > this.config.loopIntervalMs) {
      this.runLoop();
      this.lastLoop = now;
    }
  }

  private runLoop() {
    console.log("[AMO] Autonomous monetization loop running...");

    const offer = this.mph.getCurrentOffer();
    if (!offer) {
      this.mph.triggerBurst("MANUAL");
      return;
    }

    const ctr = offer.clicks / Math.max(1, offer.impressions);
    const cr = offer.conversions / Math.max(1, offer.clicks);

    if (ctr < 0.02 || cr < 0.05) {
      console.log("[AMO] Offer underperforming, rotating...");
      this.mph.triggerBurst("MANUAL");
    } else if (ctr > 0.05 && cr > 0.1) {
      console.log("[AMO] Offer performing well, reinforcing burst.");
      this.mph.triggerBurst("MANUAL");
    }
  }
}

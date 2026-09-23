import { PrimordiaKernel } from "../kernel";
import { Reactor } from "./reactor";
import { UnrealBridge } from "../unreal/unrealBridge";
import { MoneyPlugHub } from "../moneyplughub/mph.core";
import { AMO } from "../amo/amo.core";

interface LiveState {
  viewers: number;
  likes: number;
  followers: number;
  lastAscension: number | null;
}

export class LiveChamber {
  private kernel: PrimordiaKernel;
  private reactor: Reactor;
  private unreal: UnrealBridge;
  private mph: MoneyPlugHub;
  private amo: AMO;
  private state: LiveState = {
    viewers: 0,
    likes: 0,
    followers: 0,
    lastAscension: null
  };

  constructor(kernel: PrimordiaKernel, unreal: UnrealBridge, mph: MoneyPlugHub, amo: AMO) {
    this.kernel = kernel;
    this.unreal = unreal;
    this.mph = mph;
    this.amo = amo;
    this.reactor = new Reactor();

    this.unreal.onTelemetry((t) => this.handleTelemetry(t));
  }

  tick() {
    // Simulated engagement for now
    this.state.viewers = Math.max(0, this.state.viewers + (Math.random() * 10 - 3));
    this.state.likes += Math.floor(Math.random() * 4);
    this.state.followers += Math.random() < 0.01 ? 1 : 0;

    const engagementScore = this.state.likes + this.state.followers * 10 + this.state.viewers * 2;
    this.reactor.pulse(engagementScore);
    this.reactor.coolDown();

    this.unreal.sendReactorPulse(this.reactor.getIntensity(), this.reactor.getEnergy(), this.reactor.getState());

    const now = Date.now();
    if (!this.state.lastAscension || now - this.state.lastAscension > 45 * 60 * 1000) {
      this.triggerAscension();
      this.state.lastAscension = now;
    }
  }

  analyticsTick() {
    const offer = this.mph.getCurrentOffer();
    if (!offer) return;
    console.log(
      `[Analytics] Viewers=${Math.round(this.state.viewers)} Likes=${this.state.likes} Followers=${this.state.followers} Offer=${offer.id} I=${offer.impressions} C=${offer.clicks} Conv=${offer.conversions}`
    );
  }

  private triggerAscension() {
    console.log("[LiveChamber] Ascension event triggered (POWER MODE).");
    this.reactor.ascend();
    this.unreal.sendAscensionBegin();
    this.mph.triggerBurst("ASCENSION");
  }

  private handleTelemetry(t: import("../unreal/unrealCommands").UnrealTelemetry) {
    const { reactor_charge, storm_intensity } = t.metrics;
    if (reactor_charge > 0.9 && storm_intensity > 0.7) {
      console.log("[LiveChamber] Telemetry indicates peak energy, reinforcing monetization.");
      this.mph.triggerBurst("MANUAL");
    }
  }
}

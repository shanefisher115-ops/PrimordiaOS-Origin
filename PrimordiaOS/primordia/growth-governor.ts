// primordia/growth-governor.ts

export class GrowthGovernor {
  constructor(os) {
    this.os = os
    this.enabled = true

    // dynamic thresholds
    this.maxSignalsPerTick = 12
    this.maxOrbitalDispatchPerTick = 6
    this.maxRealmLoad = {
      science: 4,
      entertainment: 4,
      manufacturing: 3,
      creator: 3,
      monetization: 3,
      education: 4
    }

    this.recentActivity = {
      science: 0,
      entertainment: 0,
      manufacturing: 0,
      creator: 0,
      monetization: 0,
      education: 0,
      orbital: 0
    }
  }

  resetActivity() {
    for (const key of Object.keys(this.recentActivity)) {
      this.recentActivity[key] = 0
    }
  }

  record(signal) {
    const { realm, agent } = signal

    if (this.recentActivity[realm] !== undefined) {
      this.recentActivity[realm]++
    }

    if (agent.startsWith("orbital")) {
      this.recentActivity.orbital++
    }
  }

  evaluate(signalBatch) {
    if (!this.enabled) {
      return { allowed: true, reason: "Governor disabled" }
    }

    // total signals per hypergrowth tick
    if (signalBatch.length > this.maxSignalsPerTick) {
      return { allowed: false, reason: "Too many signals in hypergrowth tick" }
    }

    // orbital overload
    if (this.recentActivity.orbital > this.maxOrbitalDispatchPerTick) {
      return { allowed: false, reason: "Orbital dispatch overload" }
    }

    // realm overload
    for (const realm of Object.keys(this.maxRealmLoad)) {
      if (this.recentActivity[realm] > this.maxRealmLoad[realm]) {
        return { allowed: false, reason: `Realm overload: ${realm}` }
      }
    }

    return { allowed: true, reason: "Growth allowed" }
  }
}

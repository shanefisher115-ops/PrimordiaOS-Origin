// primordia/primordial-omniscience.ts

export class PrimordialOmniscience {
  constructor(os) {
    this.os = os

    this.state = {
      realmActivity: {},
      agentActivity: {},
      orbitalLoad: 0,
      capsuleCount: 0,
      monetizationFlow: 0,
      growthRate: 0,
      lastTick: Date.now()
    }
  }

  observe(signal, result) {
    const { realm, agent } = signal

    // Realm activity
    this.state.realmActivity[realm] =
      (this.state.realmActivity[realm] || 0) + 1

    // Agent activity
    this.state.agentActivity[agent] =
      (this.state.agentActivity[agent] || 0) + 1

    // Orbital load
    if (agent.startsWith("orbital")) {
      this.state.orbitalLoad++
    }

    // PHOM capsule count
    if (realm === "education" && agent.includes("phom")) {
      this.state.capsuleCount++
    }

    // Monetization flow
    if (realm === "monetization") {
      this.state.monetizationFlow++
    }

    // Growth rate
    const now = Date.now()
    const dt = now - this.state.lastTick
    this.state.growthRate = 1000 / dt
    this.state.lastTick = now
  }

  snapshot() {
    return {
      timestamp: Date.now(),
      ...this.state
    }
  }

  summarize() {
    return {
      realms: this.state.realmActivity,
      agents: this.state.agentActivity,
      orbitalLoad: this.state.orbitalLoad,
      capsuleCount: this.state.capsuleCount,
      monetizationFlow: this.state.monetizationFlow,
      growthRate: this.state.growthRate
    }
  }
}

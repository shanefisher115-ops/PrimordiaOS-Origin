// primordia/autonomy-loop.ts

import { processSignal } from "./PAIA"
import { PrimordialOmniscience } from "./primordial-omniscience"

export class AutonomyLoop {
  constructor(os) {
    this.os = os
    this.running = false
    this.interval = null

    // Meta‑brain
    this.omni = new PrimordialOmniscience(os)
  }

  start(tickRate = 1000) {
    if (this.running) return

    this.running = true
    console.log("[PrimordiaOS] Autonomy Loop started.")

    this.interval = setInterval(() => this.tick(), tickRate)
  }

  stop() {
    if (!this.running) return

    clearInterval(this.interval)
    this.running = false
    console.log("[PrimordiaOS] Autonomy Loop stopped.")
  }

  async tick() {
    // Generate autonomous organism signal
    const internalSignal = this.generateInternalSignal()

    // Process through PAIA (Safety Layer included)
    const result = await processSignal(this.os, internalSignal)

    // Feed into Primordial Omniscience
    this.omni.observe(internalSignal, result)

    // Log unified organism tick
    console.log("[PrimordiaOS] Tick:", {
      signal: internalSignal,
      result,
      omni: this.omni.summarize()
    })
  }

  generateInternalSignal() {
    // Autonomous behavior: rotate through realms
    const realms = [
      "science",
      "entertainment",
      "manufacturing",
      "creator",
      "monetization",
      "education"
    ]

    const agents = {
      science: "reasoning",
      entertainment: "worldBuilder",
      manufacturing: "cad",
      creator: "create",
      monetization: "pricing",
      education: "phomBuilder"
    }

    const realm = realms[Math.floor(Math.random() * realms.length)]
    const agent = agents[realm]

    return {
      realm,
      agent,
      payload: {
        auto: true,
        tick: Date.now()
      }
    }
  }
}

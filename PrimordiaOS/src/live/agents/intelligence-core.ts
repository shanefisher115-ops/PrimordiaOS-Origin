// src/live/agents/intelligence-core.ts

import { getPerformanceSnapshot, getTopPlatforms, getTopTopics } from "./performance-feedback"

interface RealmState {
  load: number
  entropy: number
  pressure: number
}

export interface WorldstateSnapshot {
  [realm: string]: RealmState
}

export interface IntelligenceState {
  momentum: number
  coherence: number
  entropy: number
  growthVector: number
  platformBias: Record<string, number>
  topicBias: Record<string, number>
}

export interface SchedulerTuning {
  tickMs: number
  postingIntervalMs: number
  monetizationIntensity: number
}

// -----------------------------
// Core intelligence computation
// -----------------------------
export function computeIntelligence(snapshot: WorldstateSnapshot): IntelligenceState {
  const perf = getPerformanceSnapshot()
  const topPlatforms = getTopPlatforms()
  const topTopics = getTopTopics()

  let avgLoad = 0
  let avgEntropy = 0
  let avgPressure = 0

  const realms = Object.keys(snapshot)
  for (const r of realms) {
    avgLoad += snapshot[r].load
    avgEntropy += snapshot[r].entropy
    avgPressure += snapshot[r].pressure
  }

  if (realms.length > 0) {
    avgLoad /= realms.length
    avgEntropy /= realms.length
    avgPressure /= realms.length
  }

  // Synthetic metrics:
  const momentum = avgPressure - avgEntropy + perf.totalEvents * 0.01
  const coherence = Math.max(0, 1 - avgEntropy)
  const growthVector = momentum * coherence

  const platformBias: Record<string, number> = {}
  for (const p of topPlatforms) {
    platformBias[p.platform] = p.score
  }

  const topicBias: Record<string, number> = {}
  for (const t of topTopics) {
    topicBias[t.topic] = t.score
  }

  console.log("=== Intelligence Core ===")
  console.log(`Momentum: ${momentum.toFixed(3)}`)
  console.log(`Coherence: ${coherence.toFixed(3)}`)
  console.log(`Entropy: ${avgEntropy.toFixed(3)}`)
  console.log(`GrowthVector: ${growthVector.toFixed(3)}`)
  console.log(`Top Platforms:`, topPlatforms)
  console.log(`Top Topics:`, topTopics)

  return {
    momentum,
    coherence,
    entropy: avgEntropy,
    growthVector,
    platformBias,
    topicBias
  }
}

// -----------------------------
// Turn intelligence into scheduler tuning
// -----------------------------
export function deriveSchedulerTuning(intel: IntelligenceState): SchedulerTuning {
  const baseTick = 5000
  const minTick = 2000
  const maxTick = 15000

  const basePosting = 30000
  const minPosting = 10000
  const maxPosting = 60000

  // High momentum + high coherence → faster ticks
  // High entropy → slower ticks
  let tick =
    baseTick -
    intel.momentum * 1500 +
    intel.entropy * 3000

  tick = Math.max(minTick, Math.min(maxTick, tick))

  // GrowthVector drives posting intensity
  let posting =
    basePosting -
    intel.growthVector * 20000 +
    intel.entropy * 15000

  posting = Math.max(minPosting, Math.min(maxPosting, posting))

  // Monetization intensity: how aggressively to enqueue content
  const monetizationIntensity = Math.max(
    0.2,
    Math.min(2.0, 1 + intel.growthVector)
  )

  console.log(
    `[IntelligenceCore] Tuning → tick=${tick}ms, posting=${posting}ms, monetizationIntensity=${monetizationIntensity.toFixed(
      2
    )}`
  )

  return {
    tickMs: tick,
    postingIntervalMs: posting,
    monetizationIntensity
  }
}

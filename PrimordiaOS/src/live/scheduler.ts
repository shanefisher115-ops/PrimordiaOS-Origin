// src/live/scheduler.ts

import { fetchRawSignals } from "./sources/poll"
import { processSignals } from "./processor"
import { applySignalsToWorldstate } from "./worldstate"
import { routeSignals } from "./router"
import { recordSignals } from "./ledger"

import { runMonetizationTick } from "./agents/monetization"
import { runFacelessVideoTick } from "./agents/faceless-video"

import { startPostingScheduler } from "./agents/posting-scheduler"
import { getQueueStats } from "./agents/posting-queue"

console.log("[PrimordiaOS] Intelligent Scheduler started.")

// -----------------------------
// INTELLIGENCE PARAMETERS
// -----------------------------
let baseTick = 5000          // default 5s
let minTick = 2000           // fastest 2s
let maxTick = 15000          // slowest 15s

let currentTick = baseTick

// adaptive posting interval
let postingInterval = 30000  // default 30s

// -----------------------------
// ADAPTIVE TICK RATE LOGIC
// -----------------------------
function adaptTickRate(snapshot) {
  let avgLoad = 0
  let avgEntropy = 0
  let avgPressure = 0

  const realms = Object.keys(snapshot)
  for (const r of realms) {
    avgLoad += snapshot[r].load
    avgEntropy += snapshot[r].entropy
    avgPressure += snapshot[r].pressure
  }

  avgLoad /= realms.length
  avgEntropy /= realms.length
  avgPressure /= realms.length

  // dynamic tick rate:
  // high pressure → faster ticks
  // high entropy → slower ticks
  // high load → slower ticks (backpressure)
  let newTick =
    baseTick -
    avgPressure * 2000 +
    avgEntropy * 3000 +
    avgLoad * 4000

  newTick = Math.max(minTick, Math.min(maxTick, newTick))

  currentTick = newTick
  console.log(
    `[Scheduler] Adaptive tick → ${currentTick}ms (load=${avgLoad.toFixed(
      2
    )}, entropy=${avgEntropy.toFixed(2)}, pressure=${avgPressure.toFixed(2)})`
  )
}

// -----------------------------
// ADAPTIVE POSTING FREQUENCY
// -----------------------------
function adaptPostingFrequency(snapshot) {
  let avgPressure = 0
  let avgEntropy = 0

  const realms = Object.keys(snapshot)
  for (const r of realms) {
    avgPressure += snapshot[r].pressure
    avgEntropy += snapshot[r].entropy
  }

  avgPressure /= realms.length
  avgEntropy /= realms.length

  // high pressure → more posting (more monetization)
  // high entropy → less posting (system stabilizing)
  let newInterval =
    30000 - avgPressure * 15000 + avgEntropy * 20000

  newInterval = Math.max(10000, Math.min(60000, newInterval))

  postingInterval = newInterval

  console.log(
    `[Scheduler] Adaptive posting interval → ${postingInterval}ms`
  )
}

// -----------------------------
// MAIN TICK LOOP
// -----------------------------
async function runTick() {
  console.log("\n[PrimordiaOS] Intelligent tick — running executor...")

  // 1. Fetch signals
  const raw = fetchRawSignals()

  // 2. Process signals
  const processed = processSignals(raw)

  // 3. Apply to worldstate
  const snapshot = applySignalsToWorldstate(processed)

  // 4. Route actions
  const actions = routeSignals(snapshot)

  // 5. Record signals
  recordSignals(processed)

  // 6. Log snapshot + actions
  logSnapshot(snapshot)
  logActions(actions)

  // 7. Monetization Agent — multi-platform content generation
  runMonetizationTick(snapshot)

  // 8. Faceless Video Agent — generate video plan
  runFacelessVideoTick(snapshot)

  // 9. Adaptive intelligence
  adaptTickRate(snapshot)
  adaptPostingFrequency(snapshot)

  // 10. Queue awareness
  const stats = getQueueStats()
  console.log(
    `[Scheduler] Queue → queued=${stats.queued}, dead=${stats.dead}`
  )

  // 11. Reschedule next tick dynamically
  scheduleNextTick()
}

// -----------------------------
// LOGGING HELPERS
// -----------------------------
function logSnapshot(snapshot) {
  console.log("=== REALM SNAPSHOT ===")
  for (const realm of Object.keys(snapshot)) {
    const s = snapshot[realm]
    console.log(
      `[${realm}] load=${s.load.toFixed(3)} entropy=${s.entropy.toFixed(
        3
      )} pressure=${s.pressure.toFixed(3)}`
    )
  }
}

function logActions(actions) {
  console.log("=== ACTIONS ===")
  for (const a of actions) {
    console.log(
      `[${a.realm}] -> ${a.action.toUpperCase()} (load=${a.load.toFixed(
        2
      )}, entropy=${a.entropy.toFixed(2)}, pressure=${a.pressure.toFixed(2)})`
    )
  }
}

// -----------------------------
// DYNAMIC RESCHEDULING
// -----------------------------
function scheduleNextTick() {
  setTimeout(runTick, currentTick)
}

// -----------------------------
// START SYSTEM
// -----------------------------

// Start posting scheduler with adaptive interval
startPostingScheduler(postingInterval)

// Start intelligent heartbeat
scheduleNextTick()

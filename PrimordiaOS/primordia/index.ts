import { processSignal, attachSafety } from "./PAIA"
import { initOrbitalRealm } from "./orbital-adapter"
import { initSciencePropagator } from "./science-propagator"
import { initImmersiveGenerator } from "./immersive-generator"
import { initInstrumentEngine } from "./instrument-engine"
import { initManufacturingIntelligence } from "./manufacturing-intelligence"
import { initCreatorOS } from "./creator-os"
import { initMonetization } from "./moneyplughub-amo"
import { initPHOMCapsules } from "./phom-capsules"
import { AutonomyLoop } from "./autonomy-loop"
import { Hypergrowth } from "./hypergrowth"

console.log("[PrimordiaOS] Booting...")

// --- Initialize realms and organs ---
initOrbitalRealm()
console.log("[PrimordiaOS] Orbital realm online.")

initSciencePropagator()
console.log("[PrimordiaOS] Science Propagator online.")

initImmersiveGenerator()
console.log("[PrimordiaOS] Immersive Generator online.")

initInstrumentEngine()
console.log("[PrimordiaOS] Instrument Engine online.")

initManufacturingIntelligence()
console.log("[PrimordiaOS] Manufacturing Intelligence online.")

initCreatorOS()
console.log("[PrimordiaOS] Creator OS online.")

initMonetization()
console.log("[PrimordiaOS] Monetization online.")

initPHOMCapsules()
console.log("[PrimordiaOS] PHOM Capsules online.")

// --- Create OS object ---
export const PrimordiaOS = {
  subsystems: [],

  ingest(signal) {
    return processSignal(this, signal)
  }
}

// --- Attach Safety Layer AFTER OS exists ---
attachSafety(PrimordiaOS)
console.log("[PrimordiaOS] Safety Layer online.")

// --- Start Autonomy Loop (heartbeat) ---
const autonomy = new AutonomyLoop(PrimordiaOS)
autonomy.start(1000)
console.log("[PrimordiaOS] Autonomy Loop online.")

// --- Start Hypergrowth Mode (self-amplifying creation engine) ---
const hyper = new Hypergrowth(PrimordiaOS)
hyper.start(500)
console.log("[PrimordiaOS] Hypergrowth Mode online.")

console.log("[PrimordiaOS] Ready.")

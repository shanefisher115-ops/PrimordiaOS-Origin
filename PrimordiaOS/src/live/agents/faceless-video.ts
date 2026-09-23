// src/live/agents/faceless-video.ts

interface RealmState {
  load: number
  entropy: number
  pressure: number
}

interface WorldstateSnapshot {
  [realm: string]: RealmState
}

interface VideoPlan {
  topic: string
  script: string[]
  shots: string[]
  overlays: string[]
  captions: string[]
  outputPath: string
}

const DEFAULT_VIDEO_DIR = "C:/primordia/output"

// pick topic from highest-pressure realm
function pickTopic(snapshot: WorldstateSnapshot): string {
  const realms = Object.keys(snapshot)
  if (!realms.length) return "PrimordiaOS Faceless System Overview"

  const sorted = realms.sort(
    (a, b) => snapshot[b].pressure - snapshot[a].pressure
  )
  const top = sorted[0]
  return `How PrimordiaOS manages ${top} realm pressure without a human in the loop`
}

function buildScript(topic: string): string[] {
  return [
    `Hook: ${topic} — explained in under 60 seconds.`,
    "Line 1: This system watches synthetic realms: load, entropy, and pressure.",
    "Line 2: When pressure spikes, PrimordiaOS generates content instead of waiting.",
    "Line 3: It builds faceless videos, posts them, and learns from the results.",
    "Line 4: No face, no talking head — just systems, motion, and data.",
    "CTA: Follow for more synthetic OS and monetization breakdowns."
  ]
}

function buildShots(topic: string): string[] {
  return [
    "Shot 1: UI overlay of PrimordiaOS dashboard (fake HUD, graphs, realms).",
    "Shot 2: Animated graphs for load, entropy, pressure.",
    "Shot 3: Abstract motion background (lines, grids, particles).",
    "Shot 4: Text overlays summarizing key points.",
    `Shot 5: Outro card with topic: "${topic}".`
  ]
}

function buildOverlays(): string[] {
  return [
    "Overlay: 'Synthetic OS'",
    "Overlay: 'Load • Entropy • Pressure'",
    "Overlay: 'Faceless Monetization Engine'",
    "Overlay: '@PrimordiaOS'"
  ]
}

function buildCaptions(topic: string): string[] {
  return [
    topic,
    "PrimordiaOS • synthetic realms • faceless automation.",
    "No face, just systems.",
    "Follow for more OS + monetization breakdowns."
  ]
}

function buildVideoPlan(snapshot: WorldstateSnapshot): VideoPlan {
  const topic = pickTopic(snapshot)
  const outputPath = `${DEFAULT_VIDEO_DIR}/primordia-faceless.mp4`

  return {
    topic,
    script: buildScript(topic),
    shots: buildShots(topic),
    overlays: buildOverlays(),
    captions: buildCaptions(topic),
    outputPath
  }
}

// main entry: called from scheduler or monetization loop
export function runFacelessVideoTick(snapshot: WorldstateSnapshot) {
  const plan = buildVideoPlan(snapshot)

  console.log("=== Faceless Video Plan ===")
  console.log(`Topic: ${plan.topic}`)
  console.log(`Output: ${plan.outputPath}`)
  console.log("\nScript:")
  plan.script.forEach((line) => console.log(`- ${line}`))
  console.log("\nShots:")
  plan.shots.forEach((shot) => console.log(`- ${shot}`))
  console.log("\nOverlays:")
  plan.overlays.forEach((o) => console.log(`- ${o}`))
  console.log("\nCaptions:")
  plan.captions.forEach((c) => console.log(`- ${c}`))

  console.log(
    `[FacelessVideoAgent] Planned faceless video for topic="${plan.topic}" → ${plan.outputPath}`
  )
}

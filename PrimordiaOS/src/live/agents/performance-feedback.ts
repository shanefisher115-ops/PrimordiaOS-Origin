// src/live/agents/performance-feedback.ts

export interface PerformanceEvent {
  platform: string
  topic: string
  status: string
  timestamp: number
  score: number
}

interface PerformanceMemory {
  events: PerformanceEvent[]
  topicScores: Record<string, number>
  platformScores: Record<string, number>
}

const perfMemory: PerformanceMemory = {
  events: [],
  topicScores: {},
  platformScores: {}
}

// -----------------------------
// Synthetic scoring model
// -----------------------------
function computeScore(platform: string, status: string): number {
  // Purely synthetic for now:
  // ready → positive
  // error → negative
  // other → neutral
  let base = 0

  if (status === "ready") base = 1
  else if (status === "error") base = -1
  else base = 0.2

  // Slight platform weighting (just to differentiate)
  const weights: Record<string, number> = {
    youtube: 1.3,
    tiktok: 1.2,
    instagram: 1.1,
    shorts: 1.1,
    facebook: 1.0,
    x: 0.9,
    reddit: 0.8,
    linkedin: 0.9
  }

  const w = weights[platform] ?? 1.0
  return base * w
}

// -----------------------------
// Record performance event
// -----------------------------
export function recordPerformance(
  platform: string,
  topic: string,
  status: string
) {
  const score = computeScore(platform, status)
  const event: PerformanceEvent = {
    platform,
    topic,
    status,
    timestamp: Date.now(),
    score
  }

  perfMemory.events.push(event)

  if (!perfMemory.topicScores[topic]) perfMemory.topicScores[topic] = 0
  perfMemory.topicScores[topic] += score

  if (!perfMemory.platformScores[platform]) perfMemory.platformScores[platform] = 0
  perfMemory.platformScores[platform] += score

  console.log(
    `[PerformanceFeedback] ${platform} | topic="${topic}" | status=${status} | score=${score.toFixed(
      2
    )}`
  )
}

// -----------------------------
// Get aggregate performance snapshot
// -----------------------------
export function getPerformanceSnapshot() {
  return {
    topics: { ...perfMemory.topicScores },
    platforms: { ...perfMemory.platformScores },
    totalEvents: perfMemory.events.length
  }
}

// -----------------------------
// Get top topics (synthetic ranking)
// -----------------------------
export function getTopTopics(limit = 5) {
  const entries = Object.entries(perfMemory.topicScores)
  return entries
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([topic, score]) => ({ topic, score }))
}

// -----------------------------
// Get top platforms
// -----------------------------
export function getTopPlatforms(limit = 5) {
  const entries = Object.entries(perfMemory.platformScores)
  return entries
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([platform, score]) => ({ platform, score }))
}

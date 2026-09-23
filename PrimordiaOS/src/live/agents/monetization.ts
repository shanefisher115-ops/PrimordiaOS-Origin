import { runTopicEvolution } from "./topic-evolution"
import { runTrendDiscovery } from "./trend-discovery"

export function runMonetizationTick(snapshot: WorldstateSnapshot) {
  // Trend discovery
  const trend = runTrendDiscovery(snapshot)

  // Evolution step
  const evolution = runTopicEvolution(
    trend.topic,
    trend.keywords,
    trend.score
  )

  const topic = evolution.evolvedTopic
  const ctx = { topic }

  // Build payloads
  const payloads: NormalizedPayload[] = [
    buildYouTubePayload(ctx),
    buildTikTokPayload(ctx),
    buildInstagramPayload(ctx),
    buildShortsPayload(ctx),
    buildFacebookPayload(ctx),
    buildXPayload(ctx),
    buildRedditPayload(ctx),
    buildLinkedInPayload(ctx)
  ]

  // Enqueue
  for (const p of payloads) enqueuePost(p)

  console.log(
    `[MonetizationAgent] Enqueued evolved multi-platform content (topic="${topic}")`
  )
}

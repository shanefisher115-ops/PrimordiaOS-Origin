// src/live/agents/trend-discovery.ts

interface RealmState {
  load: number
  entropy: number
  pressure: number
}

interface WorldstateSnapshot {
  [realm: string]: RealmState
}

export interface TrendResult {
  topic: string
  keywords: string[]
  angle: string
  score: number
}

// -----------------------------
// Synthetic keyword clusters per realm
// -----------------------------
const REALM_KEYWORDS = {
  finance: ["automation", "passive income", "systems", "scaling"],
  tech: ["ai", "agents", "automation", "synthetic os"],
  creativity: ["faceless", "content engine", "workflow"],
  systems: ["entropy", "load", "pressure", "optimization"],
  growth: ["trending", "viral loops", "distribution"],
  default: ["primordiaos", "synthetic realms", "automation"]
}

// -----------------------------
// Score calculation
// -----------------------------
function scoreRealm(r: RealmState): number {
  // pressure = opportunity
  // entropy = chaos (reduce score)
  // load = bottleneck (reduce score)
  return r.pressure * 1.5 - r.entropy * 0.7 - r.load * 0.5
}

// -----------------------------
// Pick top realm by trend score
// -----------------------------
function pickTopRealm(snapshot: WorldstateSnapshot): string {
  const realms = Object.keys(snapshot)
  if (!realms.length) return "default"

  let bestRealm = realms[0]
  let bestScore = scoreRealm(snapshot[bestRealm])

  for (const r of realms.slice(1)) {
    const s = scoreRealm(snapshot[r])
    if (s > bestScore) {
      bestScore = s
      bestRealm = r
    }
  }

  return bestRealm
}

// -----------------------------
// Build topic from realm + keywords
// -----------------------------
function buildTopic(realm: string, keywords: string[]): string {
  const primary = keywords[0]
  const secondary = keywords[1] || "automation"

  return `Why ${primary} + ${secondary} is exploding right now (${realm} realm)`
}

// -----------------------------
// Main Trend Discovery Agent
// -----------------------------
export function runTrendDiscovery(snapshot: WorldstateSnapshot): TrendResult {
  const realm = pickTopRealm(snapshot)
  const keywords = REALM_KEYWORDS[realm] || REALM_KEYWORDS.default

  const topic = buildTopic(realm, keywords)
  const score = scoreRealm(snapshot[realm])

  const angle = `Explaining how ${realm} realm pressure creates opportunities in ${keywords.join(", ")}.`

  console.log("=== Trend Discovery ===")
  console.log(`Realm: ${realm}`)
  console.log(`Topic: ${topic}`)
  console.log(`Keywords: ${keywords.join(", ")}`)
  console.log(`Angle: ${angle}`)
  console.log(`Score: ${score.toFixed(3)}`)

  return {
    topic,
    keywords,
    angle,
    score
  }
}

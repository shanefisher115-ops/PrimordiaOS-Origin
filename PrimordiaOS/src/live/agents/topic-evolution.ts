// src/live/agents/topic-evolution.ts

interface EvolutionMemory {
  history: {
    topic: string
    score: number
    keywords: string[]
    timestamp: number
  }[]
  keywordWeights: Record<string, number>
  lastTopic: string | null
}

const memory: EvolutionMemory = {
  history: [],
  keywordWeights: {},
  lastTopic: null
}

// -----------------------------
// Update keyword weights
// -----------------------------
function updateKeywordWeights(keywords: string[], score: number) {
  for (const k of keywords) {
    if (!memory.keywordWeights[k]) memory.keywordWeights[k] = 0
    memory.keywordWeights[k] += score * 0.5
  }
}

// -----------------------------
// Mutate keywords (evolution step)
// -----------------------------
function mutateKeywords(keywords: string[]): string[] {
  const mutated = [...keywords]

  // Add new keyword based on weighted history
  const weighted = Object.entries(memory.keywordWeights)
    .sort((a, b) => b[1] - a[1])
    .map(([k]) => k)

  if (weighted.length > 0) {
    mutated.push(weighted[0])
  }

  // Remove stale keyword
  if (mutated.length > 3) {
    mutated.shift()
  }

  return mutated
}

// -----------------------------
// Build evolved topic
// -----------------------------
function buildEvolvedTopic(base: string, keywords: string[]): string {
  const primary = keywords[0]
  const secondary = keywords[1] || "automation"

  return `${base} — evolving into ${primary} + ${secondary}`
}

// -----------------------------
// Main Evolution Engine
// -----------------------------
export function runTopicEvolution(
  topic: string,
  keywords: string[],
  score: number
) {
  // 1. Record history
  memory.history.push({
    topic,
    score,
    keywords,
    timestamp: Date.now()
  })

  // 2. Update keyword weights
  updateKeywordWeights(keywords, score)

  // 3. Mutate keywords
  const evolvedKeywords = mutateKeywords(keywords)

  // 4. Build evolved topic
  const evolvedTopic = buildEvolvedTopic(topic, evolvedKeywords)

  // 5. Store last topic
  memory.lastTopic = evolvedTopic

  console.log("=== Topic Evolution ===")
  console.log(`Base Topic: ${topic}`)
  console.log(`Score: ${score.toFixed(3)}`)
  console.log(`Keywords: ${keywords.join(", ")}`)
  console.log(`Evolved Keywords: ${evolvedKeywords.join(", ")}`)
  console.log(`Evolved Topic: ${evolvedTopic}`)

  return {
    evolvedTopic,
    evolvedKeywords
  }
}

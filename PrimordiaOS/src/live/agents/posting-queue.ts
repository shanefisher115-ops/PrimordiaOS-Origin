// src/live/agents/posting-queue.ts

import { NormalizedPayload } from "./posting"

export type QueuePriority = "low" | "normal" | "high"

export interface QueueItem {
  payload: NormalizedPayload
  priority: QueuePriority
  attempts: number
  maxAttempts: number
  enqueuedAt: number
}

const postingQueue: QueueItem[] = []
const deadLetterQueue: QueueItem[] = []

// -----------------------------
// ENQUEUE
// -----------------------------
export function enqueuePost(
  payload: NormalizedPayload,
  priority: QueuePriority = "normal",
  maxAttempts = 3
) {
  postingQueue.push({
    payload,
    priority,
    attempts: 0,
    maxAttempts,
    enqueuedAt: Date.now()
  })

  console.log(
    `[QueueManager] Enqueued (${priority}) → ${payload.platform}`
  )
}

// -----------------------------
// INTERNAL: SORT BY PRIORITY
// -----------------------------
function sortQueue() {
  postingQueue.sort((a, b) => {
    const order = { high: 3, normal: 2, low: 1 }
    return order[b.priority] - order[a.priority]
  })
}

// -----------------------------
// DEQUEUE NEXT ITEM
// -----------------------------
export function dequeueNext(): QueueItem | null {
  if (postingQueue.length === 0) return null
  sortQueue()
  return postingQueue.shift() || null
}

// -----------------------------
// RETRY / DEAD LETTER HANDLING
// -----------------------------
export function handleFailure(item: QueueItem, error: any) {
  item.attempts++

  if (item.attempts >= item.maxAttempts) {
    deadLetterQueue.push(item)
    console.error(
      `[QueueManager] DEAD LETTER → ${item.payload.platform} (${error})`
    )
  } else {
    postingQueue.push(item)
    console.warn(
      `[QueueManager] RETRY (${item.attempts}/${item.maxAttempts}) → ${item.payload.platform}`
    )
  }
}

// -----------------------------
// QUEUE METRICS
// -----------------------------
export function getQueueStats() {
  return {
    queued: postingQueue.length,
    dead: deadLetterQueue.length,
    oldest:
      postingQueue.length > 0
        ? Date.now() - postingQueue[0].enqueuedAt
        : 0
  }
}

// -----------------------------
// INSPECTION HELPERS
// -----------------------------
export function listQueue() {
  return postingQueue.map((item) => ({
    platform: item.payload.platform,
    priority: item.priority,
    attempts: item.attempts,
    enqueuedAt: item.enqueuedAt
  }))
}

export function listDeadLetters() {
  return deadLetterQueue.map((item) => ({
    platform: item.payload.platform,
    priority: item.priority,
    attempts: item.attempts,
    enqueuedAt: item.enqueuedAt
  }))
}

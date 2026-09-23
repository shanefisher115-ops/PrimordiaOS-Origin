import { recordPerformance } from "./performance-feedback"

// inside processNext(), after dispatchPost:
try {
  const result = await dispatchPost(item.payload)
  console.log(
    `[PostingScheduler] Result → ${result.platform}: ${result.status}`
  )

  // Performance feedback
  recordPerformance(
    result.platform,
    item.payload.title || item.payload.caption || item.payload.text || "unknown-topic",
    result.status
  )
} catch (err) {
  handleFailure(item, err)
  recordPerformance(
    item.payload.platform,
    item.payload.title || item.payload.caption || item.payload.text || "unknown-topic",
    "error"
  )
}

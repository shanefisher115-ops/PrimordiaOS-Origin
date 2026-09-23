// src/server.ts

import express from "express"
import cors from "cors"

import "./live/scheduler"   // autonomous intelligence loop

const app = express()
app.use(cors())
app.use(express.json())

console.log("\n======================================")
console.log("      PrimordiaOS Autonomous Server")
console.log("======================================\n")

console.log("[server] Booting PrimordiaOS…")
console.log("[server] Loading Autonomous Intelligence Core…")
console.log("[server] Starting Intelligent Scheduler…")
console.log("[server] Multi‑platform posting agents online.")
console.log("[server] Trend Discovery + Topic Evolution online.")
console.log("[server] Performance Feedback Engine online.")
console.log("[server] Faceless Video Agent online.")
console.log("[server] Monetization Engine online.\n")

// ---------------------------------------------
// OPTIONAL: lightweight API endpoints
// ---------------------------------------------

app.get("/", (req, res) => {
  res.json({
    status: "ok",
    message: "PrimordiaOS Autonomous Server Running",
    time: new Date().toISOString()
  })
})

app.get("/health", (req, res) => {
  res.json({ status: "healthy" })
})

app.get("/version", (req, res) => {
  res.json({ version: "PrimordiaOS‑AIC‑1.0" })
})

// ---------------------------------------------
// START SERVER
// ---------------------------------------------
const PORT = 3000

app.listen(PORT, () => {
  console.log(`[server] Listening on port ${PORT}`)
  console.log("[server] PrimordiaOS is fully operational.\n")
})

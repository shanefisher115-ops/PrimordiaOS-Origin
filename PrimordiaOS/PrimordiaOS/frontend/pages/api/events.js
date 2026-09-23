/* ============================================================
   PRIMORDIAOS COCKPIT EVENTS ENDPOINT
   ============================================================ */

import http from "http";

// For simplicity, Cockpit will query the Bus directly.
// Adjust the BUS_URL if you change ports.
const BUS_URL = "http://localhost:3001";

export default async function handler(req, res) {
  try {
    // Proxy request to Bus
    const response = await fetch(`${BUS_URL}/events`);
    const data = await response.json();

    res.status(200).json(data);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch events from Bus" });
  }
}

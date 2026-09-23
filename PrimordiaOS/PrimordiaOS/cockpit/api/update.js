import { addEvent } from "../../lib/state";

export default function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).end("Method Not Allowed");
  }

  try {
    const update = req.body;

    if (update.panels?.eventBus) {
      update.panels.eventBus.forEach(ev => addEvent(ev));
      console.log("[COCKPIT] EventBus updated");
    }

    res.status(200).json({ ok: true });
  } catch (err) {
    console.log("[COCKPIT] Failed to parse update");
    res.status(400).json({ error: "bad request" });
  }
}

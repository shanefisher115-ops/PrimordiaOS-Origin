let cockpitState = {
  panels: {
    eventBus: []
  }
};

export default function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const incoming = req.body;

    if (incoming?.panels?.eventBus) {
      cockpitState.panels.eventBus.push(...incoming.panels.eventBus);

      // Keep last 200 events
      cockpitState.panels.eventBus =
        cockpitState.panels.eventBus.slice(-200);
    }

    return res.status(200).json({ status: "updated" });
  } catch (err) {
    return res.status(500).json({ error: "update failed" });
  }
}

export { cockpitState };

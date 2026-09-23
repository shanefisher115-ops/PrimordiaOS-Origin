module.exports = {
  realms: {
    "Reality Engine Constructor": { type: "kernel", path: "./Reality Engine Constructor" },
    "Primordial Antigravity Backend": { type: "backend", path: "./Primordial Antigravity Backend" },
    "Antigravity CAD System": { type: "cad", path: "./Antigravity CAD System" },
    "Electron Cloud Integration Portal": { type: "gateway", path: "./Electron Cloud Integration Portal" },
    "MoneyPlugHub Loop Realm": { type: "finance-loop", path: "./MoneyPlugHub Loop Realm" }
  },
  kernel: {
    path: "./kernel",   // ✅ corrected
    runtime: "nodejs22",
    orchestrator: "docker"
  },
  logging: {
    level: "info",
    destination: "./logs/primordiaos.log"
  },
  networking: {
    pubsubTopic: "moneyplughub-events",
    gateway: "cloudflare-ai"
  }
};

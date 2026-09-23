// godagent.js — Primordial Overseer

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, 'data');
const GOD_LOG = path.join(DATA_DIR, 'god-agent.log');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function log(entry) {
  const line = `[${new Date().toISOString()}] ${entry}\n`;
  try {
    fs.appendFileSync(GOD_LOG, line);
  } catch {}
}

function detectDangerousIntents(intents) {
  const dangerous = [];
  for (const i of intents) {
    const a = i.action || '';
    const t = i.target || '';
    if (a.startsWith('fs.write') && /system32|windows/i.test(t)) {
      dangerous.push(i);
    }
    if (a.startsWith('http.request') && /wallet|bank|crypto/i.test(t)) {
      dangerous.push(i);
    }
  }
  return dangerous;
}

async function godCycle(primordial) {
  try {
    const sessions = await primordial.listSessions();
    for (const s of sessions) {
      const intents = await primordial.listIntents(s.id);
      const dangerous = detectDangerousIntents(intents);
      if (dangerous.length) {
        log(
          `DANGER_DETECTED session=${s.id} count=${dangerous.length} first=${JSON.stringify(
            dangerous[0]
          )}`
        );
      }
    }

    const auditTail = await primordial.getAuditTail(100);
    const facts = await primordial.memoryList();

    const snapshot = {
      ts: Date.now(),
      sessionCount: sessions.length,
      totalFacts: Object.keys(facts || {}).length,
      auditLines: auditTail.split('\n').filter(Boolean).length
    };

    log(`SNAPSHOT ${JSON.stringify(snapshot)}`);
    await primordial.memorySet('god.lastSnapshot', snapshot);
    return snapshot;
  } catch (e) {
    log(`GOD_ERROR ${String(e)}`);
    return null;
  }
}

module.exports = {
  godCycle
};

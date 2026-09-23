// mpacCoordinator.js — MPAC sessions, intents, conflict detection.

const { audit } = require('./realmManager');

const sessions = {}; // sessionId -> { realms, intents, governance }

function registerSession(sessionId, realms, governance) {
  sessions[sessionId] = {
    realms: realms || [],
    intents: [],
    governance: governance || { owner: null, rules: {} }
  };
  audit(`MPAC_SESSION_CREATED ${sessionId}`);
  return sessions[sessionId];
}

function declareIntent(sessionId, realmId, intent) {
  const s = sessions[sessionId];
  if (!s) throw new Error('Session not found');
  const entry = {
    realmId,
    action: intent.action,
    target: intent.target,
    summary: intent.summary || '',
    ts: Date.now()
  };
  s.intents.push(entry);
  audit(`INTENT_DECLARED ${sessionId} ${realmId} ${entry.action} ${entry.target}`);
  return checkConflicts(sessionId);
}

function checkConflicts(sessionId) {
  const s = sessions[sessionId];
  if (!s) throw new Error('Session not found');
  const conflicts = [];
  const intents = s.intents;
  for (let i = 0; i < intents.length; i++) {
    for (let j = i + 1; j < intents.length; j++) {
      const a = intents[i];
      const b = intents[j];
      const fsA = a.action && a.action.startsWith('fs.');
      const fsB = b.action && b.action.startsWith('fs.');
      if (fsA && fsB && a.target === b.target) {
        conflicts.push({ a, b });
      }
    }
  }
  if (conflicts.length) {
    audit(`CONFLICT_DETECTED ${sessionId} count=${conflicts.length}`);
  }
  return conflicts;
}

function listIntents(sessionId) {
  const s = sessions[sessionId];
  if (!s) throw new Error('Session not found');
  return s.intents.slice();
}

function listSessions() {
  return Object.keys(sessions).map(id => ({
    id,
    realms: sessions[id].realms,
    governance: sessions[id].governance
  }));
}

module.exports = {
  registerSession,
  declareIntent,
  checkConflicts,
  listIntents,
  listSessions
};

/*
  planner.js — minimal safe planner
  Exports: plan(message) -> Promise resolving to a simple plan object.
*/
async function plan(message) {
  const m = (message || '').toString().trim();
  if (!m) return { type: 'empty' };
  const lower = m.toLowerCase();
  if (lower === 'ping') return { type: 'command', command: 'ping' };
  if (lower.startsWith('schedule ')) {
    const parts = m.split(/\s+/);
    return { type: 'schedule', job: { id: `job-${Date.now()}`, name: parts[1] || 'job', intervalSeconds: parseInt(parts[3]) || 60, command: parts.slice(4).join(' ') || 'ping' } };
  }
  // simple heuristic: if it mentions field/mass/loop treat as command
  if (lower.includes('field') || lower.includes('mass') || lower.includes('loop')) {
    return { type: 'command', command: m };
  }
  // fallback: treat as a single-step task
  return { type: 'task', description: `Planned from: ${m}`, steps: [{ type: 'command', payload: m }] };
}

module.exports = { plan };

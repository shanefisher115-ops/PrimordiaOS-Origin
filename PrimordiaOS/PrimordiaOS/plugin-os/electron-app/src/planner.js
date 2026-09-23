// planner.js
// LLM planner with secure API key usage and safe fallback heuristics.
// Set PRIMORDIAL_LLM_PROVIDER and PRIMORDIAL_LLM_KEY in environment to enable LLM.
// Supported provider: openai (example). If not configured, planner uses heuristics.

const fetch = require('node-fetch');

function heuristicsPlan(message) {
  const lower = (message || '').trim().toLowerCase();
  if (!lower) return { type: 'empty' };
  if (lower === 'ping') return { type: 'command', command: 'ping' };
  if (lower.startsWith('schedule ')) {
    const m = message.match(/^schedule\s+(\S+)\s+every\s+(\d+)\s+(.+)$/i);
    if (m) {
      const [, name, seconds, cmd] = m;
      return { type: 'schedule', job: { id: `job-${Date.now()}`, name, intervalSeconds: parseInt(seconds,10), command: cmd } };
    }
  }
  if (lower.includes('field') || lower.includes('mass') || lower.includes('loop')) {
    return { type: 'command', command: message };
  }
  // fallback: treat as a task (single command)
  return { type: 'task', command: message };
}

async function callOpenAI(prompt, apiKey) {
  const url = 'https://api.openai.com/v1/chat/completions';
  const body = {
    model: 'gpt-4o-mini', // placeholder; provider may require different model
    messages: [{ role: 'system', content: 'You are Osmium planner. Convert user intent into structured tasks or commands. Respond JSON only.' },
               { role: 'user', content: prompt }],
    max_tokens: 600,
    temperature: 0.0
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`LLM error ${res.status}: ${txt}`);
  }
  const json = await res.json();
  const content = json.choices && json.choices[0] && json.choices[0].message && json.choices[0].message.content;
  return content;
}

function safeParseJSON(text) {
  try {
    return JSON.parse(text);
  } catch (e) {
    // try to extract JSON substring
    const m = text.match(/\{[\s\S]*\}/);
    if (m) {
      try { return JSON.parse(m[0]); } catch (e2) { return null; }
    }
    return null;
  }
}

async function plan(message) {
  // If no provider configured, use heuristics
  const provider = process.env.PRIMORDIAL_LLM_PROVIDER || '';
  const key = process.env.PRIMORDIAL_LLM_KEY || '';

  // Quick heuristic guard for obviously dangerous requests
  const lower = (message || '').toLowerCase();
  if (lower.includes('delete') && lower.includes('file')) {
    return { type: 'reject', reason: 'Potentially destructive request blocked by planner.' };
  }

  if (!provider || !key) {
    return heuristicsPlan(message);
  }

  try {
    // Build a constrained prompt instructing JSON output
    const prompt = `
User request:
${message}

Return a JSON object with one of:
- {"type":"command","command":"..."}
- {"type":"task","command":"...","steps":[{"type":"command","payload":"..."}, ...]}
- {"type":"schedule","job":{"name":"...","intervalSeconds":60,"command":"..."}}
Only return valid JSON. Do not include extra commentary.
`;
    const reply = await callOpenAI(prompt, key);
    const parsed = safeParseJSON(reply);
    if (!parsed) return heuristicsPlan(message);
    return parsed;
  } catch (e) {
    // LLM failed — fallback to heuristics
    return heuristicsPlan(message);
  }
}

module.exports = { plan };

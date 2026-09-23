// agentCore.js
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const config = require('./config');

const AUDIT_DIR = path.join(__dirname, 'data');
const AUDIT_LOG = path.join(AUDIT_DIR, 'audit.log');
if (!fs.existsSync(AUDIT_DIR)) fs.mkdirSync(AUDIT_DIR);

let fieldStrength = 0.0;
let massProfile = 0.0;
let loopState = 'IDLE';
let corePulse = 'STABLE';

// WARNING: Dangerous actions are disabled by default.
// To enable shell/network actions, follow the explicit enable procedure in config.js
const ALLOW_DANGEROUS_ACTIONS = false;

function metrics() {
  return { fieldStrength, massProfile, loopState, corePulse };
}

function audit(entry) {
  const line = `[${new Date().toISOString()}] ${entry}\n`;
  try {
    fs.appendFileSync(AUDIT_LOG, line);
  } catch (e) {
    // best-effort logging; do not crash the agent for audit failures
    console.error('Audit write failed', e);
  }
}

async function executeDirective(commandString) {
  const raw = (commandString || '').trim();
  audit(`EXECUTE_DIRECTIVE: ${raw}`);
  if (!raw) return { lines: ['Osmium: No directive provided.'], metrics: metrics() };

  const lower = raw.toLowerCase();

  if (lower === 'ping') return { lines: ['Osmium: AgentCore responsive.'], metrics: metrics() };
  if (lower === 'clear') return { lines: ['<clear>'], metrics: metrics() };

  if (lower.startsWith('field ')) {
    const delta = parseFloat(lower.split(' ')[1]);
    if (!isNaN(delta)) {
      fieldStrength += delta;
      audit(`FIELD_ADJUST ${delta} -> ${fieldStrength}`);
      return { lines: [`Osmium: Field envelope adjusted by ${delta}.`], metrics: metrics() };
    }
    return { lines: ['Osmium: Invalid field delta.'], metrics: metrics() };
  }

  if (lower.startsWith('mass ')) {
    const delta = parseFloat(lower.split(' ')[1]);
    if (!isNaN(delta)) {
      massProfile += delta;
      audit(`MASS_ADJUST ${delta} -> ${massProfile}`);
      return { lines: [`Osmium: Mass profile shifted by ${delta}.`], metrics: metrics() };
    }
    return { lines: ['Osmium: Invalid mass delta.'], metrics: metrics() };
  }

  if (lower === 'loop start') {
    loopState = 'ACTIVE';
    corePulse = 'ACCELERATING';
    audit('LOOP_START');
    return { lines: ['Osmium: Autonomous loop engaged.'], metrics: metrics() };
  }

  if (lower === 'loop stop') {
    loopState = 'IDLE';
    corePulse = 'STABLE';
    audit('LOOP_STOP');
    return { lines: ['Osmium: Autonomous loop disengaged.'], metrics: metrics() };
  }

  // Shell execution gated behind explicit enable
  if (lower.startsWith('shell:')) {
    if (!config.isDangerAllowed() && !ALLOW_DANGEROUS_ACTIONS) {
      audit('SHELL_DENIED');
      return { lines: ['Osmium: Shell execution disabled. Enable explicitly to run.'], metrics: metrics() };
    }
    const cmd = raw.slice(raw.indexOf(':') + 1).trim();
    return runShell(cmd);
  }

  // Generic fallback
  audit('FALLBACK_ECHO');
  return { lines: ['Osmium: Directive executed.'], metrics: metrics() };
}

function runShell(cmd) {
  return new Promise((resolve) => {
    audit(`SHELL_RUN: ${cmd}`);
    try {
      const child = spawn(cmd, { shell: true });
      let out = '';
      let err = '';
      child.stdout.on('data', (d) => out += d.toString());
      child.stderr.on('data', (d) => err += d.toString());
      child.on('close', (code) => {
        audit(`SHELL_EXIT ${code}`);
        const lines = [];
        if (out) lines.push(`stdout:\n${out}`);
        if (err) lines.push(`stderr:\n${err}`);
        lines.push(`exit code: ${code}`);
        resolve({ lines, metrics: metrics() });
      });
    } catch (e) {
      audit(`SHELL_ERROR ${String(e)}`);
      resolve({ lines: [`Osmium: Shell execution failed: ${String(e)}`], metrics: metrics() });
    }
  });
}

function status() {
  return { metrics: metrics(), dangerousAllowed: config.isDangerAllowed() || ALLOW_DANGEROUS_ACTIONS };
}

module.exports = { executeDirective, status };

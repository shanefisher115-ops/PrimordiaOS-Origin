// osmiumCore.js
// Chat entrypoint: uses planner to convert natural language into actions.
// Defensive: works whether agentCore exposes performTask or only executeDirective.

const planner = require('./planner');
const agentCore = require('./agentCore');
const orchestrator = require('./orchestrator');

async function chat(message) {
  const plan = await planner.plan(message);

  if (!plan || plan.type === 'empty') {
    return { reply: 'Osmium: I need a directive.' };
  }

  if (plan.type === 'reject') {
    return { reply: `Osmium: ${plan.reason}` };
  }

  // Command -> execute directive
  if (plan.type === 'command') {
    const res = await agentCore.executeDirective(plan.command);
    return { reply: Array.isArray(res.lines) ? res.lines.join('\n') : String(res), metrics: res.metrics };
  }

  // Task -> prefer performTask if available, otherwise executeDirective on the command or steps
  if (plan.type === 'task') {
    // If agentCore exposes performTask, use it
    if (typeof agentCore.performTask === 'function') {
      const res = await agentCore.performTask(plan);
      return { reply: Array.isArray(res.lines) ? res.lines.join('\n') : String(res), metrics: res.metrics };
    }

    // Fallback: if plan has steps, run them sequentially via executeDirective
    if (Array.isArray(plan.steps) && plan.steps.length > 0) {
      const lines = [];
      let lastMetrics = null;
      for (const step of plan.steps) {
        if (step.type === 'command') {
          const r = await agentCore.executeDirective(step.payload);
          if (r && Array.isArray(r.lines)) lines.push(...r.lines);
          lastMetrics = r.metrics || lastMetrics;
        } else if (step.type === 'wait') {
          const ms = parseInt(step.payload, 10) || 0;
          lines.push(`Osmium: Waiting ${ms}ms`);
          await new Promise(r => setTimeout(r, ms));
        } else if (step.type === 'shell') {
          // shell steps may be gated by agentCore; try executeDirective with 'shell:' prefix
          const r = await agentCore.executeDirective(`shell: ${step.payload}`);
          if (r && Array.isArray(r.lines)) lines.push(...r.lines);
          lastMetrics = r.metrics || lastMetrics;
        } else {
          lines.push(`Osmium: Unknown step type ${step.type}`);
        }
      }
      return { reply: lines.join('\n'), metrics: lastMetrics };
    }

    // If no steps, try to execute the command string if present
    if (plan.command) {
      const res = await agentCore.executeDirective(plan.command);
      return { reply: Array.isArray(res.lines) ? res.lines.join('\n') : String(res), metrics: res.metrics };
    }

    return { reply: 'Osmium: Could not perform the planned task.' };
  }

  // Schedule -> orchestrator
  if (plan.type === 'schedule') {
    const job = await orchestrator.schedule(plan.job);
    return { reply: `Scheduled ${job.name} every ${job.intervalSeconds}s`, scheduled: job };
  }

  return { reply: 'Osmium: Could not interpret request.' };
}

module.exports = { chat };

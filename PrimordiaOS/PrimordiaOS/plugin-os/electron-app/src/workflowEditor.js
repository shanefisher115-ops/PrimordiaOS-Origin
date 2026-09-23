// workflowEditor.js
// Minimal workflow editor API used by renderer to create structured tasks.
// This is a UI-agnostic module that helps validate and export tasks.

function createEmptyTask() {
  return {
    id: `task-${Date.now()}`,
    description: 'New workflow',
    steps: []
  };
}

function addStep(task, step) {
  // step: { type: 'command'|'wait'|'shell', payload: string }
  if (!task.steps) task.steps = [];
  task.steps.push(step);
  return task;
}

function removeStep(task, index) {
  if (!task.steps) return task;
  task.steps.splice(index, 1);
  return task;
}

function validateTask(task) {
  if (!task || !task.description) return { ok: false, reason: 'Missing description' };
  if (!Array.isArray(task.steps)) return { ok: false, reason: 'Steps must be an array' };
  for (const s of task.steps) {
    if (!s.type || !s.payload) return { ok: false, reason: 'Each step needs type and payload' };
  }
  return { ok: true };
}

function exportTaskJSON(task) {
  return JSON.stringify(task, null, 2);
}

module.exports = { createEmptyTask, addStep, removeStep, validateTask, exportTaskJSON };

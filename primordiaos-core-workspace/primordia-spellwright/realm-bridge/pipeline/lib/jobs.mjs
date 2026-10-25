// Job store for the Bolt pipeline: validated creation, state transitions, persistence, events.

import { EventEmitter } from 'node:events';
import { mkdirSync, readFileSync, renameSync, writeFileSync, existsSync } from 'node:fs';
import { dirname } from 'node:path';
import { randomUUID } from 'node:crypto';

export const TERMINAL = new Set(['succeeded', 'failed', 'cancelled']);
const STATES = new Set(['queued', 'running', 'succeeded', 'failed', 'cancelled']);
const ID_RE = /^[A-Za-z0-9_.:-]{1,96}$/;
const KIND_RE = /^[a-z][a-z0-9_]*(\.[a-z0-9_]+)+$/;

export class JobStore extends EventEmitter {
  /**
   * @param {{file?: string, keepFinished?: number}} opts
   */
  constructor({ file, keepFinished = 500 } = {}) {
    super();
    this.file = file;
    this.keepFinished = keepFinished;
    this.jobs = new Map();
    this.saveTimer = null;
    if (file && existsSync(file)) this.#load();
  }

  #load() {
    try {
      const data = JSON.parse(readFileSync(this.file, 'utf8'));
      for (const job of data.jobs || []) {
        // A job that was running when the server stopped did not finish.
        if (!TERMINAL.has(job.status)) {
          job.status = 'failed';
          job.error = 'the Bolt server restarted while this job was running';
          job.updatedAt = new Date().toISOString();
        }
        this.jobs.set(job.id, job);
      }
    } catch (err) {
      this.emit('warning', `could not read ${this.file}: ${err.message}`);
    }
  }

  #scheduleSave() {
    if (!this.file || this.saveTimer) return;
    this.saveTimer = setTimeout(() => {
      this.saveTimer = null;
      this.flush();
    }, 250);
    this.saveTimer.unref();
  }

  flush() {
    if (!this.file) return;
    mkdirSync(dirname(this.file), { recursive: true });
    const tmp = `${this.file}.tmp`;
    writeFileSync(tmp, JSON.stringify({ schema: 1, jobs: [...this.jobs.values()] }, null, 1));
    renameSync(tmp, this.file);
  }

  /** Throws a descriptive Error for invalid input. */
  create({ id, kind, payload = {}, spellId, source = 'unknown' }) {
    if (id !== undefined && !ID_RE.test(String(id))) throw new Error(`invalid job id '${id}'`);
    if (!KIND_RE.test(String(kind || ''))) throw new Error(`invalid job kind '${kind}' (expected domain.task)`);
    if (payload === null || typeof payload !== 'object' || Array.isArray(payload)) throw new Error('payload must be an object');
    const jobId = id || `bolt-${randomUUID()}`;
    if (this.jobs.has(jobId)) {
      // Idempotent resubmission (a client retrying after a lost reply): return the existing job.
      return { job: this.jobs.get(jobId), created: false };
    }
    const now = new Date().toISOString();
    const job = {
      id: jobId,
      kind,
      status: 'queued',
      progress: 0,
      message: '',
      payload,
      result: null,
      error: '',
      spellId: spellId || null,
      source,
      createdAt: now,
      updatedAt: now,
      log: [],
    };
    this.jobs.set(jobId, job);
    this.#prune();
    this.#scheduleSave();
    this.emit('created', job);
    return { job, created: true };
  }

  get(id) {
    return this.jobs.get(id);
  }

  list({ status, kind, limit = 100 } = {}) {
    let out = [...this.jobs.values()];
    if (status) out = out.filter((j) => j.status === status);
    if (kind) out = out.filter((j) => j.kind === kind || j.kind.startsWith(`${kind}.`));
    out.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
    return out.slice(0, limit);
  }

  /** Applies a patch; terminal jobs never change again. Returns the job or undefined. */
  update(id, patch) {
    const job = this.jobs.get(id);
    if (!job || TERMINAL.has(job.status)) return job;
    if (patch.status && !STATES.has(patch.status)) throw new Error(`invalid status ${patch.status}`);
    for (const key of ['status', 'progress', 'message', 'result', 'error']) {
      if (patch[key] !== undefined) job[key] = patch[key];
    }
    if (job.status === 'succeeded') job.progress = 1;
    job.updatedAt = new Date().toISOString();
    this.#scheduleSave();
    this.emit('updated', job);
    return job;
  }

  appendLog(id, line) {
    const job = this.jobs.get(id);
    if (!job) return;
    job.log.push(String(line).slice(0, 2000));
    if (job.log.length > 200) job.log.splice(0, job.log.length - 200);
    this.emit('log', job, line);
  }

  #prune() {
    const finished = [...this.jobs.values()].filter((j) => TERMINAL.has(j.status));
    if (finished.length <= this.keepFinished) return;
    finished.sort((a, b) => (a.updatedAt < b.updatedAt ? -1 : 1));
    for (const j of finished.slice(0, finished.length - this.keepFinished)) this.jobs.delete(j.id);
  }
}

/** What a client sees: everything but the (possibly large) payload and the log. */
export function publicJob(job, { withPayload = false, withLog = false } = {}) {
  if (!job) return job;
  const { payload, log, ...rest } = job;
  return { ...rest, ...(withPayload ? { payload } : {}), ...(withLog ? { log } : {}) };
}

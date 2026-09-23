/**
 * PrimordiaOS Sovereign Kernel Subsystem
 * KernelTaskScheduler.ts - Priority-ranked async task scheduling, recurring loops, and runaway protection
 */
const PRIORITY_RANK = {
    CRITICAL: 0,
    HIGH: 1,
    NORMAL: 2,
    LOW: 3,
    IDLE: 4,
};
export class KernelTaskScheduler {
    logger;
    safety;
    queue = [];
    activeTasks = new Map();
    completedHistory = new Map();
    recurringTasks = new Map();
    maxConcurrency;
    isProcessing = false;
    isDraining = false;
    constructor(logger, safety, maxConcurrency = 8) {
        this.logger = logger.forSubsystem('scheduler');
        this.safety = safety;
        this.maxConcurrency = maxConcurrency;
    }
    /**
     * Submit an immediate prioritized task
     */
    submit(name, handler, options = {}) {
        const taskId = `task-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
        const task = {
            id: taskId,
            name,
            priority: options.priority || 'NORMAL',
            status: 'PENDING',
            handler,
            createdAt: new Date().toISOString(),
            currentAttempt: 0,
            maxRetries: options.maxRetries ?? 0,
            timeoutMs: options.timeoutMs,
        };
        this.queue.push(task);
        this.sortQueue();
        this.logger.logTask(taskId, name, 'QUEUED', { priority: task.priority });
        this.triggerProcessing();
        return taskId;
    }
    /**
     * Schedule a deferred one-shot task
     */
    scheduleDeferred(name, delayMs, handler, options = {}) {
        const taskId = `defer-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
        const task = {
            id: taskId,
            name,
            priority: options.priority || 'NORMAL',
            status: 'PENDING',
            handler,
            createdAt: new Date().toISOString(),
            delayMs,
            currentAttempt: 0,
            timeoutMs: options.timeoutMs,
        };
        task.timerRef = setTimeout(() => {
            this.queue.push(task);
            this.sortQueue();
            this.triggerProcessing();
        }, delayMs);
        this.logger.debug(`Scheduled deferred task [${name}] to run in ${delayMs}ms (id: ${taskId})`);
        return taskId;
    }
    /**
     * Schedule a recurring loop task
     */
    scheduleInterval(name, intervalMs, handler, options = {}) {
        const taskId = `recur-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
        const task = {
            id: taskId,
            name,
            priority: options.priority || 'NORMAL',
            status: 'PENDING',
            handler,
            createdAt: new Date().toISOString(),
            intervalMs,
            currentAttempt: 0,
            timeoutMs: options.timeoutMs,
        };
        const runCycle = () => {
            if (this.isDraining)
                return;
            this.submit(`${name}-cycle`, async (ctx) => {
                return await handler(ctx);
            }, { priority: options.priority, timeoutMs: options.timeoutMs });
        };
        if (options.runImmediately) {
            runCycle();
        }
        task.timerRef = setInterval(runCycle, intervalMs);
        this.recurringTasks.set(taskId, task);
        this.logger.info(`Scheduled recurring task [${name}] every ${intervalMs}ms (id: ${taskId})`);
        return taskId;
    }
    /**
     * Cancels a pending, active, or recurring task
     */
    cancelTask(taskId) {
        // 1. Check queue
        const qIndex = this.queue.findIndex(t => t.id === taskId);
        if (qIndex !== -1) {
            const task = this.queue.splice(qIndex, 1)[0];
            if (task) {
                if (task.timerRef)
                    clearTimeout(task.timerRef);
                task.status = 'CANCELLED';
                this.completedHistory.set(task.id, task);
                this.logger.logTask(taskId, task.name, 'CANCELLED');
                return true;
            }
        }
        // 2. Check active
        const active = this.activeTasks.get(taskId);
        if (active) {
            active.abortController.abort();
            clearTimeout(active.timeoutRef);
            active.task.status = 'CANCELLED';
            this.activeTasks.delete(taskId);
            this.completedHistory.set(active.task.id, active.task);
            this.logger.logTask(taskId, active.task.name, 'CANCELLED');
            this.triggerProcessing();
            return true;
        }
        // 3. Check recurring
        const recurring = this.recurringTasks.get(taskId);
        if (recurring) {
            if (recurring.timerRef)
                clearInterval(recurring.timerRef);
            this.recurringTasks.delete(taskId);
            this.logger.info(`Cancelled recurring task [${recurring.name}] (id: ${taskId})`);
            return true;
        }
        return false;
    }
    sortQueue() {
        this.queue.sort((a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority]);
    }
    triggerProcessing() {
        if (this.isProcessing || this.isDraining)
            return;
        this.isProcessing = true;
        try {
            while (this.activeTasks.size < this.maxConcurrency && this.queue.length > 0) {
                const nextTask = this.queue.shift();
                if (nextTask) {
                    this.executeTask(nextTask);
                }
            }
        }
        finally {
            this.isProcessing = false;
        }
    }
    executeTask(task) {
        task.status = 'RUNNING';
        task.startedAt = new Date().toISOString();
        task.currentAttempt++;
        this.logger.logTask(task.id, task.name, 'RUNNING', { attempt: task.currentAttempt });
        const abortController = new AbortController();
        const timeoutLimit = task.timeoutMs || this.safety.getTaskExecutionTimeout();
        const startTime = Date.now();
        const timeoutRef = setTimeout(() => {
            const elapsed = Date.now() - startTime;
            this.safety.reportRunawayTask(task.id, task.name, elapsed);
            abortController.abort();
            task.status = 'TIMEOUT';
            task.error = `Task exceeded timeout limit of ${timeoutLimit}ms`;
            task.completedAt = new Date().toISOString();
            this.activeTasks.delete(task.id);
            this.completedHistory.set(task.id, task);
            this.logger.logTask(task.id, task.name, 'FAILED', { reason: 'TIMEOUT' });
            this.triggerProcessing();
        }, timeoutLimit);
        this.activeTasks.set(task.id, { task, abortController, timeoutRef });
        const ctx = {
            taskId: task.id,
            name: task.name,
            attempt: task.currentAttempt,
            abortSignal: abortController.signal,
        };
        Promise.resolve()
            .then(() => task.handler(ctx))
            .then(result => {
            if (task.status === 'TIMEOUT' || task.status === 'CANCELLED')
                return;
            clearTimeout(timeoutRef);
            task.status = 'COMPLETED';
            task.result = result;
            task.completedAt = new Date().toISOString();
            this.activeTasks.delete(task.id);
            this.completedHistory.set(task.id, task);
            this.logger.logTask(task.id, task.name, 'COMPLETED');
        })
            .catch(err => {
            if (task.status === 'TIMEOUT' || task.status === 'CANCELLED')
                return;
            clearTimeout(timeoutRef);
            const errMsg = err instanceof Error ? err.message : String(err);
            // Check retry
            if (task.maxRetries && task.currentAttempt <= task.maxRetries) {
                this.logger.warn(`Task [${task.name}] failed (attempt ${task.currentAttempt}/${task.maxRetries}). Retrying...`);
                task.status = 'PENDING';
                this.activeTasks.delete(task.id);
                this.queue.push(task);
                this.sortQueue();
            }
            else {
                task.status = 'FAILED';
                task.error = errMsg;
                task.completedAt = new Date().toISOString();
                this.activeTasks.delete(task.id);
                this.completedHistory.set(task.id, task);
                this.logger.logTask(task.id, task.name, 'FAILED', { error: errMsg });
            }
        })
            .finally(() => {
            this.triggerProcessing();
        });
    }
    getStats() {
        return {
            queued: this.queue.length,
            running: this.activeTasks.size,
            recurring: this.recurringTasks.size,
            completed: this.completedHistory.size,
        };
    }
    async drain(drainTimeoutMs = 5000) {
        this.isDraining = true;
        this.logger.info('Draining task scheduler...');
        // Clear recurring tasks
        for (const r of this.recurringTasks.values()) {
            if (r.timerRef)
                clearInterval(r.timerRef);
        }
        this.recurringTasks.clear();
        // Clear queued tasks
        for (const q of this.queue) {
            if (q.timerRef)
                clearTimeout(q.timerRef);
            q.status = 'CANCELLED';
        }
        this.queue = [];
        // Wait for active tasks or force cancel upon timeout
        const checkDrained = () => this.activeTasks.size === 0;
        const start = Date.now();
        while (!checkDrained() && Date.now() - start < drainTimeoutMs) {
            await new Promise(res => setTimeout(res, 100));
        }
        for (const active of this.activeTasks.values()) {
            active.abortController.abort();
            clearTimeout(active.timeoutRef);
            active.task.status = 'CANCELLED';
            this.completedHistory.set(active.task.id, active.task);
        }
        this.activeTasks.clear();
        this.logger.info('Task scheduler drained.');
    }
}

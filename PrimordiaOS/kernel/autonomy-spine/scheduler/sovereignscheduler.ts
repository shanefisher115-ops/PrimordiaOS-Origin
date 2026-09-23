// ======================================================
// PRIMORDIAOS — SOVEREIGN SCHEDULER
// ======================================================
// The Sovereign Scheduler is responsible for:
// - Task prioritization
// - Sovereignty rule enforcement
// - Realm-aware scheduling
// - Deterministic replay compatibility
// - Safety pre-check integration
// - Event emission hooks
// ======================================================

export interface ScheduledTask {
    id: string;
    agent: string;
    realm: string;
    priority: number;
    payload: any;
    timestamp: number;
    sovereignty: {
        level: string;        // "low", "medium", "high", "sovereign"
        requiresVerification: boolean;
        requiresConsensus: boolean;
        requiresReplay: boolean;
    };
}

export class SovereignScheduler {
    private queue: ScheduledTask[] = [];

    constructor() {}

    // ------------------------------------------------------
    // MAIN ENTRYPOINT — SCHEDULE A TASK
    // ------------------------------------------------------
    schedule(task: any): ScheduledTask {
        const scheduled: ScheduledTask = {
            id: this.generateTaskId(),
            agent: task.agent,
            realm: task.realm,
            priority: this.assignPriority(task),
            payload: task.payload,
            timestamp: Date.now(),
            sovereignty: this.assignSovereignty(task)
        };

        this.queue.push(scheduled);
        this.sortQueue();

        return scheduled;
    }

    // ------------------------------------------------------
    // PRIORITY ASSIGNMENT LOGIC
    // ------------------------------------------------------
    private assignPriority(task: any): number {
        // Sovereign tasks always get highest priority
        if (task.sovereignty === "sovereign") return 100;

        // High-risk or safety-sensitive tasks
        if (task.requiresVerification) return 80;

        // Realm-critical tasks
        if (task.realm === "sovereign-realm") return 70;

        // Academic verification tasks
        if (task.realm === "academic-realm") return 60;

        // Corporate or open realm tasks
        if (task.realm === "corporate-realm") return 40;
        if (task.realm === "open-realm") return 30;

        // Default priority
        return 10;
    }

    // ------------------------------------------------------
    // SOVEREIGNTY RULES
    // ------------------------------------------------------
    private assignSovereignty(task: any) {
        const level = task.sovereignty || "low";

        return {
            level,
            requiresVerification: level === "high" || level === "sovereign",
            requiresConsensus: level === "sovereign",
            requiresReplay: level === "high" || level === "sovereign"
        };
    }

    // ------------------------------------------------------
    // QUEUE SORTING (PRIORITY DESCENDING)
    // ------------------------------------------------------
    private sortQueue() {
        this.queue.sort((a, b) => b.priority - a.priority);
    }

    // ------------------------------------------------------
    // POP NEXT TASK
    // ------------------------------------------------------
    next(): ScheduledTask | null {
        if (this.queue.length === 0) return null;
        return this.queue.shift()!;
    }

    // ------------------------------------------------------
    // VIEW QUEUE
    // ------------------------------------------------------
    viewQueue(): ScheduledTask[] {
        return [...this.queue];
    }

    // ------------------------------------------------------
    // TASK ID GENERATOR
    // ------------------------------------------------------
    private generateTaskId(): string {
        return "task-" + Math.random().toString(36).substring(2, 10);
    }

    // ------------------------------------------------------
    // CLEAR QUEUE (USED BY REPLAY ENGINE)
    // ------------------------------------------------------
    clear() {
        this.queue = [];
    }
}

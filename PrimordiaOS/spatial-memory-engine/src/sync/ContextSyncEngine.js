/**
 * @file ContextSyncEngine.ts
 * @description Real-time context synchronization and conflict resolution engine
 * for PrimordiaOS Kernel, Sovereign Cockpit, VisionCore, MoneyPlugHub, and Unreal Bridge.
 */
import { EventEmitter } from 'node:events';
import { MemoryLogger } from '../logging/MemoryLogger.js';
// Sovereign priority tiers (lower index = higher priority)
const SUBSYSTEM_PRIORITY = {
    KERNEL: 1, // Supreme authority
    COCKPIT: 2, // Human operator console
    VISION_CORE: 3,
    UNREAL_BRIDGE: 3,
    MONEYPLUGHUB: 4,
};
export class ContextSyncEngine extends EventEmitter {
    snapshots = new Map();
    vectorClocks = new Map();
    globalLamport = 0;
    conflictHistory = [];
    totalBroadcasts = 0;
    logger;
    constructor(logger) {
        super();
        this.logger = logger ?? new MemoryLogger({ component: 'ContextSyncEngine' });
        const subsystems = [
            'KERNEL',
            'COCKPIT',
            'VISION_CORE',
            'MONEYPLUGHUB',
            'UNREAL_BRIDGE',
        ];
        for (const sub of subsystems) {
            this.vectorClocks.set(sub, 0);
        }
    }
    broadcastContext(subsystemId, activeRealmId, payload, focusTargetId) {
        this.totalBroadcasts += 1;
        this.globalLamport += 1;
        const currentSeq = (this.vectorClocks.get(subsystemId) || 0) + 1;
        this.vectorClocks.set(subsystemId, currentSeq);
        const snapshot = {
            subsystemId,
            sequenceNumber: currentSeq,
            lamportClock: this.globalLamport,
            timestamp: Date.now(),
            activeRealmId,
            focusTargetId,
            payload: { ...payload },
        };
        // Detect potential conflicts against active state of other subsystems
        this.detectAndResolveConflicts(snapshot);
        this.snapshots.set(subsystemId, snapshot);
        this.emit('sync', snapshot);
        this.logger.debug(`Context broadcast from [${subsystemId}] (seq: ${currentSeq}, lamport: ${this.globalLamport})`, {
            activeRealmId,
            focusTargetId,
        });
        return snapshot;
    }
    detectAndResolveConflicts(incoming) {
        for (const [existingSubsystem, existing] of this.snapshots.entries()) {
            if (existingSubsystem === incoming.subsystemId)
                continue;
            // Check for contradictory focus target or colliding field values
            if (incoming.focusTargetId &&
                existing.focusTargetId &&
                incoming.activeRealmId === existing.activeRealmId &&
                incoming.focusTargetId !== existing.focusTargetId) {
                // Evaluate authority
                const incomingPriority = SUBSYSTEM_PRIORITY[incoming.subsystemId];
                const existingPriority = SUBSYSTEM_PRIORITY[existing.subsystemId];
                let resolvedValue = incoming.focusTargetId;
                let strategy = 'KERNEL_PRECEDENCE';
                if (incoming.subsystemId === 'KERNEL') {
                    resolvedValue = incoming.focusTargetId;
                    strategy = 'KERNEL_PRECEDENCE';
                }
                else if (existing.subsystemId === 'KERNEL') {
                    resolvedValue = existing.focusTargetId;
                    strategy = 'KERNEL_PRECEDENCE';
                }
                else if (incomingPriority < existingPriority) {
                    resolvedValue = incoming.focusTargetId;
                    strategy = 'KERNEL_PRECEDENCE';
                }
                else if (existingPriority < incomingPriority) {
                    resolvedValue = existing.focusTargetId;
                    strategy = 'KERNEL_PRECEDENCE';
                }
                else {
                    // Same priority: Last-Write-Wins by timestamp
                    strategy = 'LAST_WRITE_WINS';
                    resolvedValue =
                        incoming.timestamp >= existing.timestamp
                            ? incoming.focusTargetId
                            : existing.focusTargetId;
                }
                const conflict = {
                    id: `conflict_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
                    subsystemA: existing.subsystemId,
                    subsystemB: incoming.subsystemId,
                    field: 'focusTargetId',
                    valueA: existing.focusTargetId,
                    valueB: incoming.focusTargetId,
                    timestamp: Date.now(),
                    resolutionStrategy: strategy,
                    resolvedValue,
                };
                this.conflictHistory.push(conflict);
                if (this.conflictHistory.length > 500) {
                    this.conflictHistory.shift();
                }
                this.logger.warn(`Context conflict between [${existing.subsystemId}] and [${incoming.subsystemId}] on focusTargetId. Resolved via ${strategy} -> ${resolvedValue}`);
                this.emit('conflict', conflict);
            }
        }
    }
    getSnapshot(subsystemId) {
        return this.snapshots.get(subsystemId);
    }
    getAllSnapshots() {
        return {
            KERNEL: this.snapshots.get('KERNEL') ?? null,
            COCKPIT: this.snapshots.get('COCKPIT') ?? null,
            VISION_CORE: this.snapshots.get('VISION_CORE') ?? null,
            MONEYPLUGHUB: this.snapshots.get('MONEYPLUGHUB') ?? null,
            UNREAL_BRIDGE: this.snapshots.get('UNREAL_BRIDGE') ?? null,
        };
    }
    getConflicts(limit = 50) {
        return this.conflictHistory.slice(-limit);
    }
    getCoherenceMetrics() {
        const vectorRecord = {
            KERNEL: this.vectorClocks.get('KERNEL') || 0,
            COCKPIT: this.vectorClocks.get('COCKPIT') || 0,
            VISION_CORE: this.vectorClocks.get('VISION_CORE') || 0,
            MONEYPLUGHUB: this.vectorClocks.get('MONEYPLUGHUB') || 0,
            UNREAL_BRIDGE: this.vectorClocks.get('UNREAL_BRIDGE') || 0,
        };
        return {
            synchronizedSubsystems: this.snapshots.size,
            totalBroadcasts: this.totalBroadcasts,
            conflictsDetected: this.conflictHistory.length,
            conflictsResolved: this.conflictHistory.length,
            vectorClocks: vectorRecord,
        };
    }
}

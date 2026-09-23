/**
 * PrimordiaOS Sovereign Cockpit — Multi-Realm Telemetry Router
 * High-throughput, low-latency ingestion engine normalizing payloads across
 * MoneyPlugHub, Primordia Kernel, VisionCore, and Unreal Bridge.
 */
import { logger } from '../logging/CockpitLogger.js';
export class TelemetryRouter {
    subscriptions = new Map();
    queue = [];
    maxQueueSize = 5000;
    isProcessing = false;
    stats = {
        totalIngested: 0,
        totalDispatched: 0,
        totalDropped: 0,
        packetsPerSecond: 0,
        activeSubscriptions: 0
    };
    lastSecondTimestamp = Date.now();
    packetsThisSecond = 0;
    constructor() {
        logger.info('TelemetryRouter', 'Initialized Sovereign Telemetry Router substrate');
    }
    /**
     * Subscribes a listener to a source pattern (e.g. "MoneyPlugHub", "UnrealBridge", or "*").
     */
    subscribe(sourcePattern, handler, filter) {
        const id = 'sub-' + Math.random().toString(36).substring(2, 9);
        this.subscriptions.set(id, { id, sourcePattern, handler, filter });
        this.stats.activeSubscriptions = this.subscriptions.size;
        return id;
    }
    /**
     * Unsubscribes an existing listener.
     */
    unsubscribe(id) {
        const removed = this.subscriptions.delete(id);
        this.stats.activeSubscriptions = this.subscriptions.size;
        return removed;
    }
    /**
     * Ingests a raw or pre-formed telemetry envelope into the router with backpressure protection.
     */
    ingest(envelope) {
        this.stats.totalIngested++;
        this.packetsThisSecond++;
        // Compute metrics
        const now = Date.now();
        if (now - this.lastSecondTimestamp >= 1000) {
            this.stats.packetsPerSecond = this.packetsThisSecond;
            this.packetsThisSecond = 0;
            this.lastSecondTimestamp = now;
        }
        // Backpressure: drop oldest packet if buffer congested
        if (this.queue.length >= this.maxQueueSize) {
            this.queue.shift();
            this.stats.totalDropped++;
            logger.warn('TelemetryRouter', 'Telemetry backpressure threshold reached: oldest packet discarded');
        }
        this.queue.push(envelope);
        this.scheduleDrain();
        return true;
    }
    /**
     * Helper to normalize and ingest MoneyPlugHub loop payload.
     */
    ingestMoneyPlugHub(payload) {
        return this.ingest({
            id: `mph-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            timestamp: Date.now(),
            source: 'MoneyPlugHub',
            realm: 'CommerceLoop',
            payload,
            entropyScore: 0.12
        });
    }
    /**
     * Helper to normalize and ingest PrimordiaOS Kernel system payload.
     */
    ingestKernel(payload) {
        return this.ingest({
            id: `krn-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            timestamp: Date.now(),
            source: 'PrimordiaOSKernel',
            realm: 'CoreSubstrate',
            payload,
            entropyScore: payload.worldState === 'STABLE' ? 0.05 : payload.worldState === 'FLUX' ? 0.45 : 0.9
        });
    }
    /**
     * Helper to normalize and ingest VisionCore neural payload.
     */
    ingestVisionCore(payload) {
        return this.ingest({
            id: `vis-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            timestamp: Date.now(),
            source: 'VisionCore',
            realm: 'PerceptionSphere',
            payload,
            entropyScore: 1.0 - payload.inferenceConfidence
        });
    }
    /**
     * Helper to normalize and ingest Unreal Engine 5.4 bridge payload.
     */
    ingestUnrealBridge(payload) {
        return this.ingest({
            id: `ue5-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            timestamp: Date.now(),
            source: 'UnrealBridge',
            realm: 'NiagaraMatrix',
            payload,
            entropyScore: 0.25
        });
    }
    /**
     * Drains the queue and dispatches packets to matching subscribers.
     */
    async scheduleDrain() {
        if (this.isProcessing)
            return;
        this.isProcessing = true;
        while (this.queue.length > 0) {
            const envelope = this.queue.shift();
            if (!envelope)
                continue;
            for (const sub of this.subscriptions.values()) {
                const matches = sub.sourcePattern === '*' ||
                    (typeof sub.sourcePattern === 'string' && sub.sourcePattern === envelope.source) ||
                    (sub.sourcePattern instanceof RegExp && sub.sourcePattern.test(envelope.source));
                if (!matches)
                    continue;
                if (sub.filter && !sub.filter(envelope))
                    continue;
                try {
                    await sub.handler(envelope);
                    this.stats.totalDispatched++;
                }
                catch (err) {
                    logger.error('TelemetryRouter', `Error in subscription handler [${sub.id}] for ${envelope.source}: ${err}`);
                }
            }
        }
        this.isProcessing = false;
    }
    getStats() {
        return { ...this.stats };
    }
    getQueueLength() {
        return this.queue.length;
    }
}

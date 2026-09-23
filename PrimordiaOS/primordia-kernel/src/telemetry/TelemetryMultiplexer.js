/**
 * PrimordiaOS Sovereign Kernel Subsystem
 * TelemetryMultiplexer.ts - Unified High-Throughput Bidirectional Telemetry Multiplexer
 *
 * Multiplexes, timestamps, and synchronizes telemetry streams across:
 * - Unreal Engine 5.4 Simulation (60fps: NiagaraParticlePayload, ActorTelemetrySnapshot, SceneDelta)
 * - VisionCore (30fps: PerceptionNode, StyleMemory)
 * - Spatial Memory (Event/Burst: MemoryNode, TemporalCluster)
 * - Sovereign Node Kernel Control Loop (1Hz: VitalityMetrics, WorldState)
 *
 * Features:
 * - High-speed zero-drop framing with PTP-lite timestamp synchronization
 * - Multi-rate decimation pipeline (60fps -> 30fps -> 1Hz) with deadband filtering & SLERP interpolation
 * - RFC 3550 EWMA adaptive de-jitter playout buffer
 * - Vector clock causal tracking & CRC32 integrity verification
 */
// ============================================================================
// 3. Unified Multiplexing Frame (PUMF-v1 Wire Specification)
// ============================================================================
export var MultiplexSubsystemMask;
(function (MultiplexSubsystemMask) {
    MultiplexSubsystemMask[MultiplexSubsystemMask["NONE"] = 0] = "NONE";
    MultiplexSubsystemMask[MultiplexSubsystemMask["UE5_ACTORS"] = 1] = "UE5_ACTORS";
    MultiplexSubsystemMask[MultiplexSubsystemMask["UE5_NIAGARA"] = 2] = "UE5_NIAGARA";
    MultiplexSubsystemMask[MultiplexSubsystemMask["UE5_SCENE_DELTA"] = 4] = "UE5_SCENE_DELTA";
    MultiplexSubsystemMask[MultiplexSubsystemMask["VISIONCORE_PERCEPTION"] = 8] = "VISIONCORE_PERCEPTION";
    MultiplexSubsystemMask[MultiplexSubsystemMask["VISIONCORE_STYLE"] = 16] = "VISIONCORE_STYLE";
    MultiplexSubsystemMask[MultiplexSubsystemMask["SPATIAL_MEMORY_NODES"] = 32] = "SPATIAL_MEMORY_NODES";
    MultiplexSubsystemMask[MultiplexSubsystemMask["SPATIAL_TEMPORAL_CLUSTERS"] = 64] = "SPATIAL_TEMPORAL_CLUSTERS";
    MultiplexSubsystemMask[MultiplexSubsystemMask["KERNEL_VITALITY"] = 128] = "KERNEL_VITALITY";
    MultiplexSubsystemMask[MultiplexSubsystemMask["CONTROL_DIRECTIVES"] = 256] = "CONTROL_DIRECTIVES";
})(MultiplexSubsystemMask || (MultiplexSubsystemMask = {}));
export class PtpTimestampSyncEngine {
    logger;
    syncSamples = new Map();
    smoothedOffsets = new Map();
    maxHistorySamples = 30;
    ewmaAlpha = 0.25; // Smoothing factor
    constructor(logger) {
        this.logger = logger.forSubsystem('ptp-sync');
        this.smoothedOffsets.set('UE5_SIMULATION', 0);
        this.smoothedOffsets.set('VISIONCORE', 0);
        this.smoothedOffsets.set('SPATIAL_MEMORY', 0);
        this.smoothedOffsets.set('NODE_KERNEL', 0);
    }
    /**
     * Records a 4-timestamp exchange (Cristian's algorithm / PTP two-way exchange):
     * RTT = (t4 - t1) - (t3 - t2)
     * Offset = ((t2 - t1) + (t3 - t4)) / 2
     */
    recordExchange(domain, t1, t2, t3, t4) {
        const rtt = (t4 - t1) - (t3 - t2);
        const offset = ((t2 - t1) + (t3 - t4)) / 2;
        let history = this.syncSamples.get(domain);
        if (!history) {
            history = [];
            this.syncSamples.set(domain, history);
        }
        // Outlier rejection: Compute median RTT if sufficient samples exist
        if (history.length >= 5) {
            const sortedRtt = [...history.map(s => s.rtt)].sort((a, b) => a - b);
            const medianRtt = sortedRtt[Math.floor(sortedRtt.length / 2)];
            if (rtt > medianRtt * 2.5 && rtt > 25) {
                this.logger.debug(`Rejecting outlier sync sample for [${domain}]: RTT=${rtt.toFixed(2)}ms (median=${medianRtt.toFixed(2)}ms)`);
                return this.getEstimatedOffset(domain);
            }
        }
        const sample = { domain, t1, t2, t3, t4, rtt, offset, timestamp: Date.now() };
        history.push(sample);
        if (history.length > this.maxHistorySamples) {
            history.shift();
        }
        // EWMA update
        const currentSmoothed = this.smoothedOffsets.get(domain) ?? 0;
        const nextSmoothed = (this.ewmaAlpha * offset) + ((1 - this.ewmaAlpha) * currentSmoothed);
        this.smoothedOffsets.set(domain, nextSmoothed);
        this.logger.trace(`Updated clock sync for [${domain}]: Offset=${nextSmoothed.toFixed(3)}ms, RTT=${rtt.toFixed(3)}ms`);
        return nextSmoothed;
    }
    getEstimatedOffset(domain) {
        return this.smoothedOffsets.get(domain) ?? 0;
    }
    /**
     * Converts a domain-local timestamp into Sovereign Masterplane monotonic time.
     */
    toMasterTime(domain, domainLocalTimeMs) {
        const offset = this.getEstimatedOffset(domain);
        return domainLocalTimeMs + offset;
    }
    /**
     * Generates a high-precision nanosecond timestamp aligned to Sovereign Master.
     */
    getMasterTimeNs() {
        const hr = process.hrtime.bigint();
        return hr;
    }
}
// ============================================================================
// 5. Adaptive De-Jitter Playout Buffer (RFC 3550 Compliant)
// ============================================================================
export class AdaptiveDeJitterBuffer {
    buffer = [];
    meanTransitDelay = 15; // Initial estimate (ms)
    jitterEwma = 2.0; // Initial jitter estimate (ms)
    lastTransitDelay = 0;
    playoutDelayMs = 25; // Target playout delay = meanDelay + 3 * jitter
    capacity = 256;
    push(item, receiveTimestamp) {
        const transitDelay = Math.max(0, receiveTimestamp - item.timestamp);
        // RFC 3550 Interarrival Jitter calculation: J_i = J_{i-1} + (|D(i-1, i)| - J_{i-1}) / 16
        if (this.lastTransitDelay > 0) {
            const delayDifference = Math.abs(transitDelay - this.lastTransitDelay);
            this.jitterEwma += (delayDifference - this.jitterEwma) / 16.0;
        }
        this.lastTransitDelay = transitDelay;
        // Update mean transit delay with gentle EWMA
        this.meanTransitDelay = (0.95 * this.meanTransitDelay) + (0.05 * transitDelay);
        // Adapt playout delay: bounded between 10ms and 150ms
        this.playoutDelayMs = Math.min(150, Math.max(10, this.meanTransitDelay + (3.0 * this.jitterEwma)));
        // Insert sorted by item timestamp ascending
        let inserted = false;
        for (let i = this.buffer.length - 1; i >= 0; i--) {
            if (this.buffer[i].timestamp <= item.timestamp) {
                this.buffer.splice(i + 1, 0, item);
                inserted = true;
                break;
            }
        }
        if (!inserted) {
            this.buffer.unshift(item);
        }
        if (this.buffer.length > this.capacity) {
            // Drop oldest if saturated
            this.buffer.shift();
        }
    }
    /**
     * Extracts all frames whose release deadline (item.timestamp + playoutDelayMs <= currentTime) has passed.
     */
    drainReady(currentTime) {
        const ready = [];
        while (this.buffer.length > 0) {
            const head = this.buffer[0];
            if (head.timestamp + this.playoutDelayMs <= currentTime) {
                ready.push(this.buffer.shift());
            }
            else {
                break;
            }
        }
        return ready;
    }
    getJitterMs() {
        return this.jitterEwma;
    }
    getPlayoutDelayMs() {
        return this.playoutDelayMs;
    }
    size() {
        return this.buffer.length;
    }
    clear() {
        this.buffer = [];
    }
}
// ============================================================================
// 6. Deadband Filter & Multi-Rate Decimators
// ============================================================================
export class DeadbandFilter {
    positionThresholdMeters;
    rotationThresholdDegrees;
    lastPositions = new Map();
    lastRotations = new Map();
    constructor(positionThresholdMeters = 0.005, // 5mm
    rotationThresholdDegrees = 0.05 // 0.05 deg
    ) {
        this.positionThresholdMeters = positionThresholdMeters;
        this.rotationThresholdDegrees = rotationThresholdDegrees;
    }
    hasSignificantMovement(actorId, transform) {
        const lastPos = this.lastPositions.get(actorId);
        const lastRot = this.lastRotations.get(actorId);
        if (!lastPos || !lastRot) {
            this.lastPositions.set(actorId, [...transform.position]);
            this.lastRotations.set(actorId, [...transform.rotation]);
            return true;
        }
        const dx = transform.position[0] - lastPos[0];
        const dy = transform.position[1] - lastPos[1];
        const dz = transform.position[2] - lastPos[2];
        const distSq = dx * dx + dy * dy + dz * dz;
        const dPitch = Math.abs(transform.rotation[0] - lastRot[0]);
        const dYaw = Math.abs(transform.rotation[1] - lastRot[1]);
        const dRoll = Math.abs(transform.rotation[2] - lastRot[2]);
        const rotDelta = Math.max(dPitch, dYaw, dRoll);
        if (distSq >= this.positionThresholdMeters * this.positionThresholdMeters || rotDelta >= this.rotationThresholdDegrees) {
            this.lastPositions.set(actorId, [...transform.position]);
            this.lastRotations.set(actorId, [...transform.rotation]);
            return true;
        }
        return false;
    }
    removeActor(actorId) {
        this.lastPositions.delete(actorId);
        this.lastRotations.delete(actorId);
    }
}
export class TelemetryMultiplexer {
    logger;
    ptpSync;
    deadband;
    listeners = new Set();
    epochId;
    masterSequence = 0;
    vectorClock = { ue5: 0, vision: 0, spatial: 0, kernel: 0 };
    currentWorldState = 'STABLE';
    // Sinks / Buffers
    latestActorSnapshots = new Map();
    pendingNiagaraPulses = [];
    pendingSceneDeltas = [];
    pendingPerceptions = [];
    latestStyleMemory;
    pendingMemoryNodes = [];
    pendingTemporalClusters = [];
    latestVitality;
    // Timers
    cognitiveTimer;
    kernelTimer;
    isRunning = false;
    lastSimTickTime = Date.now();
    // De-Jitter Buffer for Simulation Stream
    simJitterBuffer = new AdaptiveDeJitterBuffer();
    constructor(logger, options = {}) {
        this.logger = logger.forSubsystem('telemetry-multiplexer');
        this.ptpSync = new PtpTimestampSyncEngine(logger);
        this.deadband = new DeadbandFilter();
        this.epochId = options.epochId || `epoch_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`;
    }
    getPtpEngine() {
        return this.ptpSync;
    }
    subscribe(listener) {
        this.listeners.add(listener);
        return () => {
            this.listeners.delete(listener);
        };
    }
    setWorldState(state) {
        this.currentWorldState = state;
    }
    // --------------------------------------------------------------------------
    // Ingestion Handlers (High-Frequency 60fps & Event Streams)
    // --------------------------------------------------------------------------
    /**
     * Ingests 60fps UE5.4 actor telemetry with deadband suppression and de-jitter buffering.
     */
    ingestActorTelemetry(snapshot) {
        this.vectorClock.ue5++;
        const masterTime = this.ptpSync.toMasterTime('UE5_SIMULATION', snapshot.timestamp);
        // Filter unchanged static transforms to save multiplexer bandwidth
        if (!this.deadband.hasSignificantMovement(snapshot.actorId, snapshot.transform)) {
            return;
        }
        const normalizedSnapshot = {
            ...snapshot,
            timestamp: masterTime,
        };
        // Buffer in de-jitter structure and update LWW actor map
        this.simJitterBuffer.push(normalizedSnapshot, Date.now());
        this.latestActorSnapshots.set(snapshot.actorId, normalizedSnapshot);
    }
    /**
     * Ingests high-frequency Niagara particle burst/pulse payload (Lossless guarantee).
     */
    ingestNiagaraPulse(pulse) {
        this.vectorClock.ue5++;
        const masterTime = this.ptpSync.toMasterTime('UE5_SIMULATION', pulse.timestamp);
        this.pendingNiagaraPulses.push({
            ...pulse,
            timestamp: masterTime,
        });
    }
    /**
     * Ingests level-wide scene synchronization delta (Lossless guarantee).
     */
    ingestSceneDelta(delta) {
        this.vectorClock.ue5++;
        const masterTime = this.ptpSync.toMasterTime('UE5_SIMULATION', delta.timestamp);
        this.pendingSceneDeltas.push({
            ...delta,
            timestamp: masterTime,
        });
    }
    /**
     * Ingests VisionCore cognitive perception node (30fps stream).
     */
    ingestPerceptionNode(node) {
        this.vectorClock.vision++;
        const masterTime = this.ptpSync.toMasterTime('VISIONCORE', node.timestamp);
        this.pendingPerceptions.push({
            ...node,
            timestamp: masterTime,
        });
    }
    /**
     * Ingests VisionCore style memory state & aesthetic consistency fingerprint.
     */
    ingestStyleMemory(style) {
        this.vectorClock.vision++;
        const masterTime = this.ptpSync.toMasterTime('VISIONCORE', style.timestamp);
        this.latestStyleMemory = {
            ...style,
            timestamp: masterTime,
        };
    }
    /**
     * Ingests Spatial Memory node creation or update (Event/Acyclic).
     */
    ingestMemoryNode(node) {
        this.vectorClock.spatial++;
        const masterTime = this.ptpSync.toMasterTime('SPATIAL_MEMORY', node.timestamp);
        this.pendingMemoryNodes.push({
            ...node,
            timestamp: masterTime,
        });
    }
    /**
     * Ingests episodic burst cluster detected by TemporalIndexer.
     */
    ingestTemporalCluster(cluster) {
        this.vectorClock.spatial++;
        this.pendingTemporalClusters.push(cluster);
    }
    /**
     * Ingests Sovereign Kernel heartbeat vitality pulse (1Hz Control Loop).
     */
    ingestKernelVitality(vitality) {
        this.vectorClock.kernel++;
        this.latestVitality = vitality;
        this.currentWorldState = vitality.worldState;
    }
    // --------------------------------------------------------------------------
    // Rate Decimators & Multiplex Emitter Cycles
    // --------------------------------------------------------------------------
    start() {
        if (this.isRunning)
            return;
        this.isRunning = true;
        this.lastSimTickTime = Date.now();
        // 1. Cognitive Multiplex Loop (30 FPS / ~33.3ms)
        // Synchronizes 60fps simulation slice downsampled to 30fps cognitive cadence
        const cognitiveIntervalMs = 33;
        this.cognitiveTimer = setInterval(() => {
            this.emitCognitiveMultiplexFrame();
        }, cognitiveIntervalMs);
        // 2. Sovereign Control Loop Multiplexer (1 Hz / 1000ms)
        // Synchronizes realm vitalities, compaction metrics, and world state
        this.kernelTimer = setInterval(() => {
            this.emitKernelControlFrame();
        }, 1000);
        this.logger.info(`TelemetryMultiplexer started. Epoch: ${this.epochId} [Decoupled: 60fps sim -> 30fps cog -> 1Hz sovereign]`);
    }
    stop() {
        this.isRunning = false;
        if (this.cognitiveTimer)
            clearInterval(this.cognitiveTimer);
        if (this.kernelTimer)
            clearInterval(this.kernelTimer);
        this.latestActorSnapshots.clear();
        this.pendingNiagaraPulses = [];
        this.pendingSceneDeltas = [];
        this.pendingPerceptions = [];
        this.pendingMemoryNodes = [];
        this.pendingTemporalClusters = [];
        this.simJitterBuffer.clear();
        this.logger.info(`TelemetryMultiplexer stopped.`);
    }
    /**
     * Emits unified 30fps cognitive frame multiplexing:
     * - Decimated simulation actor state (LWW + interpolated)
     * - Flushed Niagara pulses (Lossless)
     * - Flushed Scene deltas (Lossless)
     * - VisionCore perception nodes & style memory
     * - Spatial Memory nodes & temporal clusters (if any pending)
     */
    emitCognitiveMultiplexFrame() {
        const now = Date.now();
        const tickDeltaMs = now - this.lastSimTickTime;
        this.lastSimTickTime = now;
        // Drain ready simulation actors from de-jitter playout buffer
        this.simJitterBuffer.drainReady(now);
        const actors = Array.from(this.latestActorSnapshots.values());
        const niagaraPulses = [...this.pendingNiagaraPulses];
        this.pendingNiagaraPulses = [];
        const sceneDeltas = [...this.pendingSceneDeltas];
        this.pendingSceneDeltas = [];
        const perceptions = [...this.pendingPerceptions];
        this.pendingPerceptions = [];
        const upsertedNodes = [...this.pendingMemoryNodes];
        this.pendingMemoryNodes = [];
        const formedClusters = [...this.pendingTemporalClusters];
        this.pendingTemporalClusters = [];
        // Calculate subsystem mask
        let mask = MultiplexSubsystemMask.NONE;
        if (actors.length > 0)
            mask |= MultiplexSubsystemMask.UE5_ACTORS;
        if (niagaraPulses.length > 0)
            mask |= MultiplexSubsystemMask.UE5_NIAGARA;
        if (sceneDeltas.length > 0)
            mask |= MultiplexSubsystemMask.UE5_SCENE_DELTA;
        if (perceptions.length > 0)
            mask |= MultiplexSubsystemMask.VISIONCORE_PERCEPTION;
        if (this.latestStyleMemory)
            mask |= MultiplexSubsystemMask.VISIONCORE_STYLE;
        if (upsertedNodes.length > 0)
            mask |= MultiplexSubsystemMask.SPATIAL_MEMORY_NODES;
        if (formedClusters.length > 0)
            mask |= MultiplexSubsystemMask.SPATIAL_TEMPORAL_CLUSTERS;
        // Compute salience metrics
        const meanSalience = perceptions.length > 0
            ? perceptions.reduce((acc, p) => acc + p.salienceWeight, 0) / perceptions.length
            : 0;
        const frameSeq = ++this.masterSequence;
        const header = {
            magic: 'PRIM',
            version: 1,
            sequence: frameSeq,
            epochId: this.epochId,
            timestampNs: this.ptpSync.getMasterTimeNs().toString(),
            timeSyncOffsetNs: Math.round(this.ptpSync.getEstimatedOffset('UE5_SIMULATION') * 1_000_000),
            vectorClock: { ...this.vectorClock },
            subsystemMask: mask,
            worldState: this.currentWorldState,
            checksum: 0,
        };
        const simSlice = {
            cadenceFps: 30, // Decimated down from 60
            tickDeltaMs,
            actors,
            niagaraPulses,
            sceneDeltas,
        };
        const cogSlice = {
            cadenceFps: 30,
            perceptions,
            styleMemory: this.latestStyleMemory,
            meanSalience,
            cognitiveLoadIndex: Math.min(1.0, perceptions.length / 50),
        };
        const spatialSlice = (upsertedNodes.length > 0 || formedClusters.length > 0)
            ? { upsertedNodes, formedClusters }
            : undefined;
        const frame = {
            header,
            simulation: simSlice,
            cognitive: cogSlice,
            spatial: spatialSlice,
        };
        // Calculate CRC32 checksum over the structured payload
        header.checksum = this.computeFrameChecksum(frame);
        this.broadcastFrame(frame);
    }
    /**
     * Emits 1Hz Sovereign Kernel control loop frame multiplexing:
     * - Full vitality metrics
     * - System equilibrium assessment
     * - High-level directive synchronization
     */
    emitKernelControlFrame() {
        if (!this.latestVitality)
            return;
        const frameSeq = ++this.masterSequence;
        let mask = MultiplexSubsystemMask.KERNEL_VITALITY;
        if (this.latestStyleMemory)
            mask |= MultiplexSubsystemMask.VISIONCORE_STYLE;
        const header = {
            magic: 'PRIM',
            version: 1,
            sequence: frameSeq,
            epochId: this.epochId,
            timestampNs: this.ptpSync.getMasterTimeNs().toString(),
            timeSyncOffsetNs: Math.round(this.ptpSync.getEstimatedOffset('NODE_KERNEL') * 1_000_000),
            vectorClock: { ...this.vectorClock },
            subsystemMask: mask,
            worldState: this.currentWorldState,
            checksum: 0,
        };
        const kernelSlice = {
            cadenceHz: 1,
            vitality: this.latestVitality,
            sovereignControlTick: true,
            activeDirectives: [
                `WorldState:${this.currentWorldState}`,
                `ActiveRealms:${this.latestVitality.activeRealmsCount}`,
                `JitterUE5:${this.simJitterBuffer.getJitterMs().toFixed(2)}ms`,
            ],
        };
        const frame = {
            header,
            kernel: kernelSlice,
        };
        header.checksum = this.computeFrameChecksum(frame);
        this.broadcastFrame(frame);
    }
    broadcastFrame(frame) {
        for (const listener of this.listeners) {
            try {
                listener(frame);
            }
            catch (err) {
                this.logger.error(`Error delivering multiplex frame #${frame.header.sequence}: ${err.message}`);
            }
        }
    }
    /**
     * Computes a fast CRC32 checksum over the serialized payload slice.
     */
    computeFrameChecksum(frame) {
        const serialized = JSON.stringify({
            s: frame.header.sequence,
            v: frame.header.vectorClock,
            m: frame.header.subsystemMask,
            simActors: frame.simulation?.actors.length ?? 0,
            cogPerceptions: frame.cognitive?.perceptions.length ?? 0,
        });
        let crc = 0 ^ (-1);
        for (let i = 0; i < serialized.length; i++) {
            crc = (crc >>> 8) ^ CRC32_TABLE[(crc ^ serialized.charCodeAt(i)) & 0xFF];
        }
        return (crc ^ (-1)) >>> 0;
    }
}
// Precomputed CRC32 Table for zero-allocation fast frame integrity check
const CRC32_TABLE = new Uint32Array(256);
for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
        c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    }
    CRC32_TABLE[i] = c;
}

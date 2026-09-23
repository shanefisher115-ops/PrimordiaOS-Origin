/**
 * @file VisionCoreAdapter.ts
 * @description PrimordiaOS Sovereign Realm Unifier - VisionCore Cognitive Subsystem Adapter.
 * Integrates real-time Unreal Engine simulation telemetry, spatial memory clusters, and agent swarm
 * actions into VisionCore's perceptual cognitive graph. Generates structured perception nodes,
 * calculates attention weights, and queries cognitive directives.
 */
import { EventEmitter } from 'node:events';
import http from 'node:http';
export class VisionCoreAdapter extends EventEmitter {
    config;
    nodes = new Map();
    edges = new Map();
    pruneTimer = null;
    constructor(config = {}) {
        super();
        this.config = {
            visionCoreUrl: config.visionCoreUrl || process.env.VISIONCORE_URL || 'http://localhost:8080',
            defaultAttentionDecay: config.defaultAttentionDecay ?? 0.05,
            maxPerceptionNodes: config.maxPerceptionNodes ?? 500,
            salienceThreshold: config.salienceThreshold ?? 0.2,
            pruneIntervalMs: config.pruneIntervalMs ?? 5000,
        };
        this.startPruneLoop();
    }
    /**
     * Generates and injects a Spatial Event perception node.
     */
    ingestSpatialEvent(event) {
        const isAnomaly = event.type === 'SPATIAL_ANOMALY';
        const attention = isAnomaly ? 0.95 : 0.65;
        const salience = isAnomaly ? 0.9 : 0.5;
        const node = {
            id: `perc_spatial_${event.eventId || Date.now()}`,
            category: 'SPATIAL_EVENT',
            type: event.type,
            sourceRealm: 'simulation',
            attentionWeight: attention,
            salience,
            decayFactor: isAnomaly ? 0.02 : 0.08,
            coordinates: event.coordinates,
            payload: {
                radius: event.radius || 100,
                sourceActorId: event.sourceActorId,
                ...event.data,
            },
            associatedNodeIds: [],
            timestamp: Date.now(),
        };
        return this.insertNode(node);
    }
    /**
     * Generates and injects an Agent Action perception node.
     */
    ingestAgentAction(action) {
        const node = {
            id: `perc_agent_${action.actionId || Date.now()}`,
            category: 'AGENT_ACTION',
            type: action.actionType,
            sourceRealm: 'agents',
            attentionWeight: 0.75,
            salience: 0.7,
            decayFactor: 0.05,
            payload: {
                agentId: action.agentId,
                archetype: action.archetype,
                status: action.status,
                ...action.details,
            },
            associatedNodeIds: [],
            timestamp: Date.now(),
        };
        return this.insertNode(node);
    }
    /**
     * Generates and injects a VFX Trigger perception node.
     */
    ingestVfxTrigger(vfx) {
        const node = {
            id: `perc_vfx_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            category: 'VFX_TRIGGER',
            type: vfx.systemName,
            sourceRealm: 'simulation',
            attentionWeight: Math.min(1.0, 0.4 + vfx.intensity * 0.2),
            salience: 0.6,
            decayFactor: 0.1, // VFX fades quickly
            coordinates: vfx.coordinates,
            payload: {
                intensity: vfx.intensity,
                colorLUT: vfx.colorLUT || 'Imperial Gold',
                ...vfx.parameters,
            },
            associatedNodeIds: [],
            timestamp: Date.now(),
        };
        return this.insertNode(node);
    }
    /**
     * Generates and injects a Realm State Change perception node.
     */
    ingestRealmStateChange(stateChange) {
        const isCritical = stateChange.newState === 'FLUX' || stateChange.newState === 'DEGRADED';
        const node = {
            id: `perc_state_${stateChange.realmId}_${Date.now()}`,
            category: 'REALM_STATE',
            type: 'STATE_TRANSITION',
            sourceRealm: stateChange.realmId,
            attentionWeight: isCritical ? 1.0 : 0.5,
            salience: isCritical ? 0.95 : 0.4,
            decayFactor: isCritical ? 0.01 : 0.05,
            payload: {
                previousState: stateChange.previousState,
                newState: stateChange.newState,
                reason: stateChange.reason || 'Sovereign equilibrium loop balance',
            },
            associatedNodeIds: [],
            timestamp: Date.now(),
        };
        return this.insertNode(node);
    }
    /**
     * Core method to insert, link, and dispatch perception nodes into the cognitive graph.
     */
    insertNode(node) {
        // Enforce node cap via LRU / lowest attention eviction
        if (this.nodes.size >= this.config.maxPerceptionNodes) {
            this.evictLowestAttentionNode();
        }
        // Associate with temporally and spatially adjacent nodes
        this.linkAdjacentNodes(node);
        this.nodes.set(node.id, node);
        this.emit('node_created', node);
        // Asynchronously dispatch to VisionCore HTTP server if online
        this.forwardToVisionCoreServer(node).catch((err) => {
            this.emit('warn', `Failed to forward perception node to VisionCore server: ${err.message}`);
        });
        return node;
    }
    /**
     * Links node to spatially proximate or temporally recent perception nodes.
     */
    linkAdjacentNodes(node) {
        const nodeEdges = new Set();
        for (const [existingId, existing] of this.nodes.entries()) {
            if (node.coordinates && existing.coordinates) {
                const dx = node.coordinates.x - existing.coordinates.x;
                const dy = node.coordinates.y - existing.coordinates.y;
                const dz = node.coordinates.z - existing.coordinates.z;
                const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
                // Spatial proximity threshold (within 500 units)
                if (dist <= 500) {
                    nodeEdges.add(existingId);
                    node.associatedNodeIds.push(existingId);
                    let existingEdges = this.edges.get(existingId);
                    if (!existingEdges) {
                        existingEdges = new Set();
                        this.edges.set(existingId, existingEdges);
                    }
                    existingEdges.add(node.id);
                }
            }
        }
        this.edges.set(node.id, nodeEdges);
    }
    /**
     * Returns current cognitive graph summary.
     */
    getGraphSummary() {
        let totalAttention = 0;
        let anomalies = 0;
        const categoryCounts = {
            SPATIAL_EVENT: 0,
            AGENT_ACTION: 0,
            VFX_TRIGGER: 0,
            REALM_STATE: 0,
        };
        for (const node of this.nodes.values()) {
            totalAttention += node.attentionWeight;
            categoryCounts[node.category]++;
            if (node.type === 'SPATIAL_ANOMALY' || node.salience > 0.8) {
                anomalies++;
            }
        }
        let dominantCategory = 'SPATIAL_EVENT';
        let maxCount = -1;
        for (const [cat, count] of Object.entries(categoryCounts)) {
            if (count > maxCount) {
                maxCount = count;
                dominantCategory = cat;
            }
        }
        let edgeCount = 0;
        for (const edgeSet of this.edges.values()) {
            edgeCount += edgeSet.size;
        }
        return {
            nodeCount: this.nodes.size,
            edgeCount: Math.floor(edgeCount / 2),
            focalCategory: dominantCategory,
            averageAttention: this.nodes.size > 0 ? totalAttention / this.nodes.size : 0,
            activeAnomalies: anomalies,
            timestamp: Date.now(),
        };
    }
    /**
     * Dispatches a high-level creative / perceptual directive to VisionCore.
     */
    async processDirective(directive, options = {}) {
        return new Promise((resolve, reject) => {
            const url = new URL('/api/visioncore/process', this.config.visionCoreUrl);
            const payload = JSON.stringify({ directive, options, graphSummary: this.getGraphSummary() });
            const req = http.request(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(payload),
                },
                timeout: 3000,
            }, (res) => {
                let body = '';
                res.on('data', (chunk) => (body += chunk));
                res.on('end', () => {
                    try {
                        resolve(JSON.parse(body || '{}'));
                    }
                    catch {
                        resolve({ raw: body, status: res.statusCode });
                    }
                });
            });
            req.on('error', reject);
            req.on('timeout', () => {
                req.destroy();
                reject(new Error('VisionCore directive request timed out'));
            });
            req.write(payload);
            req.end();
        });
    }
    /**
     * Forwards node to VisionCore server log / processing endpoint.
     */
    async forwardToVisionCoreServer(node) {
        // Only forward high salience nodes
        if (node.salience < this.config.salienceThreshold)
            return;
        return new Promise((resolve) => {
            const url = new URL('/api/visioncore/logs', this.config.visionCoreUrl);
            const payload = JSON.stringify({ node });
            const req = http.request(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(payload),
                },
                timeout: 1000,
            }, () => resolve());
            req.on('error', () => resolve()); // Non-blocking
            req.write(payload);
            req.end();
        });
    }
    /**
     * Periodic pruning loop updating attention decay and cleaning dead nodes.
     */
    startPruneLoop() {
        this.pruneTimer = setInterval(() => {
            const now = Date.now();
            const deadIds = [];
            for (const [id, node] of this.nodes.entries()) {
                const ageSec = (now - node.timestamp) / 1000;
                node.attentionWeight = Math.max(0, node.attentionWeight - node.decayFactor * (this.config.pruneIntervalMs / 1000));
                if (node.attentionWeight <= 0.01 && ageSec > 30) {
                    deadIds.push(id);
                }
            }
            for (const id of deadIds) {
                this.nodes.delete(id);
                this.edges.delete(id);
            }
            if (deadIds.length > 0) {
                this.emit('nodes_pruned', { count: deadIds.length });
            }
        }, this.config.pruneIntervalMs);
        this.pruneTimer.unref();
    }
    /**
     * Evicts node with the lowest attention weight.
     */
    evictLowestAttentionNode() {
        let minId = null;
        let minAttention = Infinity;
        for (const [id, node] of this.nodes.entries()) {
            if (node.attentionWeight < minAttention) {
                minAttention = node.attentionWeight;
                minId = id;
            }
        }
        if (minId) {
            this.nodes.delete(minId);
            this.edges.delete(minId);
        }
    }
    /**
     * Stop adapter and prune timer.
     */
    shutdown() {
        if (this.pruneTimer) {
            clearInterval(this.pruneTimer);
            this.pruneTimer = null;
        }
        this.nodes.clear();
        this.edges.clear();
    }
}
export default VisionCoreAdapter;

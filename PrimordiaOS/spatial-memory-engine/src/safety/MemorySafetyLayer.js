/**
 * @file MemorySafetyLayer.ts
 * @description Safety, quarantine, and structural integrity layer for PrimordiaOS Spatial Memory.
 * Guardrails against spatial corruption, infinite cycles, out-of-bounds vectors, and unsafe memory nodes.
 */
import { MemoryLogger } from '../logging/MemoryLogger.js';
export const DEFAULT_SAFETY_POLICY = {
    maxNodes: 100_000,
    maxEdges: 500_000,
    maxContentLength: 64 * 1024, // 64 KB per node content
    maxCoordinateMagnitude: 10_000_000, // 10 million units bounding sphere
    maxGraphTraversalDepth: 64,
    blockedPatterns: [
        /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
        /__proto__/gi,
        /constructor\.prototype/gi,
    ],
    enforceQuarantineOnPatternMatch: true,
};
export class MemorySafetyLayer {
    policy;
    logger;
    quarantinedNodeIds = new Set();
    quarantineLog = new Map();
    constructor(policyPartial, logger) {
        this.policy = { ...DEFAULT_SAFETY_POLICY, ...policyPartial };
        this.logger = logger ?? new MemoryLogger({ component: 'MemorySafetyLayer' });
    }
    validateCoordinates(coords) {
        if (!Number.isFinite(coords.x) ||
            !Number.isFinite(coords.y) ||
            !Number.isFinite(coords.z)) {
            return { valid: false, reason: 'Coordinates contain NaN or non-finite values' };
        }
        const mag = Math.sqrt(coords.x * coords.x + coords.y * coords.y + coords.z * coords.z);
        if (mag > this.policy.maxCoordinateMagnitude) {
            return {
                valid: false,
                reason: `Coordinate magnitude (${mag.toFixed(2)}) exceeds maximum allowed limit (${this.policy.maxCoordinateMagnitude})`,
            };
        }
        return { valid: true };
    }
    validateNode(node, currentNodeCount) {
        if (currentNodeCount >= this.policy.maxNodes) {
            return {
                valid: false,
                quarantine: false,
                reason: `Memory node capacity limit reached (${this.policy.maxNodes} nodes)`,
            };
        }
        const coordCheck = this.validateCoordinates(node.coordinates);
        if (!coordCheck.valid) {
            return { valid: false, quarantine: true, reason: coordCheck.reason };
        }
        if (node.content.length > this.policy.maxContentLength) {
            return {
                valid: false,
                quarantine: false,
                reason: `Node content length (${node.content.length}) exceeds max limit (${this.policy.maxContentLength})`,
            };
        }
        for (const pattern of this.policy.blockedPatterns) {
            if (pattern.test(node.content)) {
                this.logger.warn(`Potential malicious pattern detected in node [${node.id}]`, {
                    pattern: pattern.toString(),
                    nodeId: node.id,
                });
                if (this.policy.enforceQuarantineOnPatternMatch) {
                    return {
                        valid: true,
                        quarantine: true,
                        reason: `Malicious pattern match detected: ${pattern.toString()}`,
                    };
                }
            }
        }
        return { valid: true, quarantine: false };
    }
    validateEdge(edge, currentEdgeCount) {
        if (currentEdgeCount >= this.policy.maxEdges) {
            return {
                valid: false,
                reason: `Memory edge capacity limit reached (${this.policy.maxEdges} edges)`,
            };
        }
        if (edge.sourceId === edge.targetId) {
            return { valid: false, reason: 'Self-referential edges are disallowed in standard memory topology' };
        }
        if (this.isQuarantined(edge.sourceId) || this.isQuarantined(edge.targetId)) {
            return {
                valid: false,
                reason: 'Cannot create edge linked to quarantined memory node',
            };
        }
        return { valid: true };
    }
    quarantineNode(nodeId, reason) {
        this.quarantinedNodeIds.add(nodeId);
        this.quarantineLog.set(nodeId, { reason, timestamp: Date.now() });
        this.logger.warn(`Node quarantined: ${nodeId}`, { nodeId, reason });
    }
    releaseFromQuarantine(nodeId) {
        if (this.quarantinedNodeIds.has(nodeId)) {
            this.quarantinedNodeIds.delete(nodeId);
            this.quarantineLog.delete(nodeId);
            this.logger.info(`Node released from quarantine: ${nodeId}`, { nodeId });
            return true;
        }
        return false;
    }
    isQuarantined(nodeId) {
        return this.quarantinedNodeIds.has(nodeId);
    }
    getQuarantineInfo(nodeId) {
        return this.quarantineLog.get(nodeId);
    }
    getAllQuarantined() {
        return Array.from(this.quarantineLog.entries()).map(([nodeId, data]) => ({
            nodeId,
            ...data,
        }));
    }
    getMaxTraversalDepth() {
        return this.policy.maxGraphTraversalDepth;
    }
}

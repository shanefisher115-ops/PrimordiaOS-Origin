/**
 * CoreForge - Versioned, Idempotent Creative Memory Subsystem
 * Agent Role: CoreForge Memory Specialist
 */
import { createHash } from 'node:crypto';
import { VisionCoreLogger } from '../logging/VisionCoreLogger.js';
export class CoreForge {
    logger;
    // Key: id -> versions array
    records = new Map();
    // Hash lookup for idempotency: hash -> id
    hashIndex = new Map();
    constructor() {
        this.logger = new VisionCoreLogger('CoreForge');
        this.initializeDefaultBrandIdentity();
    }
    calculateHash(payload) {
        return createHash('sha256').update(JSON.stringify(payload)).digest('hex');
    }
    initializeDefaultBrandIdentity() {
        this.saveBrandIdentity('primordia-brand', {
            brandName: 'PrimordiaOS Sovereign System',
            corePillars: [
                'Director-Grade High Altitude Cognition',
                'Anti-Collapse High Friction Creativity',
                'Technophysical & Cinematic Rigor',
                'Verifiable Operational Execution'
            ],
            visualIdentityRules: [
                'Prefer Imperial Gold & Cyberpunk Emerald color spaces',
                'Use physical anamorphic optics with real depth of field',
                'Maintain architectural weight and concrete/metallic textures'
            ],
            sovereigntyKernelVersion: 'v4.1.0',
            forbiddenTropes: [
                'Low-friction passive cartoon tropes',
                'Generic corporate vector minimalism',
                'Uncalibrated fluorescent noise'
            ]
        }, ['system', 'foundational']);
    }
    storeRecord(id, type, data, tags = []) {
        const hash = this.calculateHash({ type, data });
        const existingId = this.hashIndex.get(hash);
        // Idempotency check: if exact content exists under same ID or hash, return existing version
        if (existingId && this.records.has(existingId)) {
            const history = this.records.get(existingId);
            const latest = history[history.length - 1];
            if (latest.metadata.hash === hash) {
                this.logger.debug(`Idempotent write intercepted for ${type} (${id}). Content hash matches v${latest.metadata.version}`);
                return latest;
            }
        }
        const history = this.records.get(id) || [];
        const nextVersion = history.length + 1;
        const now = new Date().toISOString();
        const record = {
            metadata: {
                id,
                version: nextVersion,
                hash,
                createdAt: history.length > 0 ? history[0].metadata.createdAt : now,
                updatedAt: now,
                tags
            },
            type,
            data
        };
        history.push(record);
        this.records.set(id, history);
        this.hashIndex.set(hash, id);
        this.logger.info(`Persisted ${type} into CoreForge [id: ${id}, v: ${nextVersion}, hash: ${hash.substring(0, 8)}]`);
        return record;
    }
    saveCreativeFingerprint(id, data, tags) {
        return this.storeRecord(id, 'fingerprint', data, tags);
    }
    saveStylisticPattern(id, data, tags) {
        return this.storeRecord(id, 'pattern', data, tags);
    }
    saveNarrativeArc(id, data, tags) {
        return this.storeRecord(id, 'arc', data, tags);
    }
    saveEmotionalTone(id, data, tags) {
        return this.storeRecord(id, 'tone', data, tags);
    }
    saveBrandIdentity(id, data, tags) {
        return this.storeRecord(id, 'brand', data, tags);
    }
    saveEvolutionNote(id, data, tags) {
        return this.storeRecord(id, 'evolution', data, tags);
    }
    getById(id, version) {
        const history = this.records.get(id);
        if (!history || history.length === 0)
            return null;
        if (version !== undefined) {
            const found = history.find(r => r.metadata.version === version);
            return found || null;
        }
        return history[history.length - 1];
    }
    getHistory(id) {
        const history = this.records.get(id);
        return (history || []);
    }
    queryByType(type) {
        const results = [];
        for (const history of this.records.values()) {
            const latest = history[history.length - 1];
            if (latest.type === type) {
                results.push(latest);
            }
        }
        return results;
    }
    count() {
        return this.records.size;
    }
}

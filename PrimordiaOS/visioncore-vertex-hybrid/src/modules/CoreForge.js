/**
 * CoreForge - Versioned, Idempotent Creative Memory Subsystem
 * Agent Role: CoreForge Memory Specialist
 * PrimordiaOS VisionCore x Vertex AI Substrate
 */
import { createHash } from 'node:crypto';
import { HybridLogger } from '../logging/HybridLogger.js';
export class CoreForge {
    logger;
    // Key: record id -> array of versions
    records = new Map();
    // Hash lookup for idempotency: sha256 -> record id
    hashIndex = new Map();
    constructor() {
        this.logger = new HybridLogger('CoreForge');
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
                'Maintain architectural weight, brutalist geometry, and metallic textures'
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
        // Idempotency check: if exact content hash exists under this or previous record, return latest version
        if (existingId && this.records.has(existingId)) {
            const history = this.records.get(existingId);
            const latest = history[history.length - 1];
            if (latest.metadata.hash === hash) {
                this.logger.debug(`Idempotent write intercepted for ${type} (${id}). Hash matches v${latest.metadata.version}`);
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
    saveGeneric(id, data, tags) {
        return this.storeRecord(id, 'generic', data, tags);
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
    exportState() {
        const obj = {};
        for (const [key, val] of this.records.entries()) {
            obj[key] = val;
        }
        return obj;
    }
}

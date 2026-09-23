/**
 * @file MemoryNode.ts
 * @description Core MemoryNode representation in the PrimordiaOS Spatial Memory Subsystem.
 * Represents a point in spatial, temporal, and semantic coordinates.
 */
import { randomUUID } from 'node:crypto';
export class MemoryNode {
    id;
    realmId;
    type;
    content;
    coordinates;
    timestamp;
    semanticTags;
    semanticFingerprint;
    metadata;
    version;
    quarantineStatus;
    quarantineReason;
    accessCount;
    lastAccessedAt;
    constructor(params) {
        this.id = params.id || randomUUID();
        this.realmId = params.realmId;
        this.type = params.type || 'observation';
        this.content = params.content;
        this.coordinates = {
            x: Number(params.coordinates.x) || 0,
            y: Number(params.coordinates.y) || 0,
            z: Number(params.coordinates.z) || 0,
        };
        this.timestamp = params.timestamp ?? Date.now();
        this.semanticTags = params.semanticTags ? [...params.semanticTags] : [];
        this.semanticFingerprint = params.semanticFingerprint || '';
        this.metadata = params.metadata ? { ...params.metadata } : {};
        this.version = 1;
        this.quarantineStatus = params.quarantineStatus || 'clean';
        this.accessCount = 0;
        this.lastAccessedAt = this.timestamp;
    }
    recordAccess() {
        this.accessCount += 1;
        this.lastAccessedAt = Date.now();
    }
    distanceTo(otherCoordinates) {
        const dx = this.coordinates.x - otherCoordinates.x;
        const dy = this.coordinates.y - otherCoordinates.y;
        const dz = this.coordinates.z - otherCoordinates.z;
        return Math.sqrt(dx * dx + dy * dy + dz * dz);
    }
    isWithinRadius(center, radius) {
        return this.distanceTo(center) <= radius;
    }
    isWithinBoundingBox(min, max) {
        return (this.coordinates.x >= min.x &&
            this.coordinates.x <= max.x &&
            this.coordinates.y >= min.y &&
            this.coordinates.y <= max.y &&
            this.coordinates.z >= min.z &&
            this.coordinates.z <= max.z);
    }
    clone() {
        const cloned = new MemoryNode({
            id: this.id,
            realmId: this.realmId,
            type: this.type,
            content: this.content,
            coordinates: { ...this.coordinates },
            timestamp: this.timestamp,
            semanticTags: [...this.semanticTags],
            semanticFingerprint: this.semanticFingerprint,
            metadata: JSON.parse(JSON.stringify(this.metadata)),
            quarantineStatus: this.quarantineStatus,
        });
        cloned.version = this.version;
        cloned.quarantineReason = this.quarantineReason;
        cloned.accessCount = this.accessCount;
        cloned.lastAccessedAt = this.lastAccessedAt;
        return cloned;
    }
    toJSON() {
        return {
            id: this.id,
            realmId: this.realmId,
            type: this.type,
            content: this.content,
            coordinates: { ...this.coordinates },
            timestamp: this.timestamp,
            semanticTags: [...this.semanticTags],
            semanticFingerprint: this.semanticFingerprint,
            metadata: { ...this.metadata },
            version: this.version,
            quarantineStatus: this.quarantineStatus,
            quarantineReason: this.quarantineReason,
            accessCount: this.accessCount,
            lastAccessedAt: this.lastAccessedAt,
        };
    }
    static fromJSON(json) {
        const node = new MemoryNode({
            id: json.id,
            realmId: json.realmId,
            type: json.type,
            content: json.content,
            coordinates: json.coordinates,
            timestamp: json.timestamp,
            semanticTags: json.semanticTags,
            semanticFingerprint: json.semanticFingerprint,
            metadata: json.metadata,
            quarantineStatus: json.quarantineStatus,
        });
        node.version = json.version || 1;
        node.quarantineReason = json.quarantineReason;
        node.accessCount = json.accessCount || 0;
        node.lastAccessedAt = json.lastAccessedAt || json.timestamp;
        return node;
    }
}

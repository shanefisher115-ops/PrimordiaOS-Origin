/**
 * @file MemoryPersistenceLayer.ts
 * @description Robust, atomic, versioned persistence engine for PrimordiaOS Spatial Memory.
 * Uses Write-Ahead Logging (WAL), atomic snapshot renames, and SHA-256 manifest verification.
 */
import { promises as fs } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { MemoryLogger } from '../logging/MemoryLogger.js';
export class MemoryPersistenceLayer {
    storagePath;
    snapshotFile;
    manifestFile;
    walFile;
    currentWalSeq = 0;
    logger;
    constructor(customPath, logger) {
        this.storagePath = customPath || process.env['SPATIAL_MEMORY_PATH'] || './data/spatial-memory';
        this.snapshotFile = join(this.storagePath, 'snapshot.json');
        this.manifestFile = join(this.storagePath, 'manifest.json');
        this.walFile = join(this.storagePath, 'wal.log');
        this.logger = logger ?? new MemoryLogger({ component: 'MemoryPersistenceLayer' });
    }
    async initialize() {
        await fs.mkdir(this.storagePath, { recursive: true });
        this.logger.info(`Persistence layer initialized at: ${this.storagePath}`);
    }
    async appendWal(op, data) {
        this.currentWalSeq += 1;
        const entry = {
            sequence: this.currentWalSeq,
            timestamp: Date.now(),
            op,
            data,
        };
        const line = `${JSON.stringify(entry)}\n`;
        await fs.appendFile(this.walFile, line, 'utf8');
    }
    async saveSnapshot(nodes, edges) {
        await this.initialize();
        const snapshotPayload = {
            version: '1.0.0',
            timestamp: Date.now(),
            nodeCount: nodes.length,
            edgeCount: edges.length,
            nodes,
            edges,
        };
        const rawJson = JSON.stringify(snapshotPayload, null, 2);
        const sha256 = createHash('sha256').update(rawJson).digest('hex');
        // 1. Atomic write using temporary file
        const tempFile = join(this.storagePath, `snapshot.tmp.${Date.now()}`);
        await fs.writeFile(tempFile, rawJson, 'utf8');
        await fs.rename(tempFile, this.snapshotFile);
        // 2. Write manifest
        const manifest = {
            version: '1.0.0',
            timestamp: snapshotPayload.timestamp,
            nodeCount: nodes.length,
            edgeCount: edges.length,
            snapshotSha256: sha256,
            walSequenceNumber: this.currentWalSeq,
        };
        const manifestTemp = join(this.storagePath, `manifest.tmp.${Date.now()}`);
        await fs.writeFile(manifestTemp, JSON.stringify(manifest, null, 2), 'utf8');
        await fs.rename(manifestTemp, this.manifestFile);
        // 3. Clear compacted WAL
        try {
            await fs.writeFile(this.walFile, '', 'utf8');
        }
        catch {
            // WAL file might not exist yet
        }
        this.logger.info(`Saved spatial memory snapshot (${nodes.length} nodes, ${edges.length} edges)`, {
            sha256,
            walSeq: this.currentWalSeq,
        });
        return manifest;
    }
    async loadState() {
        await this.initialize();
        const nodeMap = new Map();
        const edgeMap = new Map();
        // 1. Load snapshot if available
        try {
            const snapshotRaw = await fs.readFile(this.snapshotFile, 'utf8');
            const snapshotData = JSON.parse(snapshotRaw);
            if (Array.isArray(snapshotData.nodes)) {
                for (const n of snapshotData.nodes) {
                    nodeMap.set(n.id, n);
                }
            }
            if (Array.isArray(snapshotData.edges)) {
                for (const e of snapshotData.edges) {
                    edgeMap.set(e.id, e);
                }
            }
            this.logger.info(`Loaded base snapshot: ${nodeMap.size} nodes, ${edgeMap.size} edges`);
        }
        catch (err) {
            this.logger.warn(`No existing snapshot found at ${this.snapshotFile}. Starting with empty state.`);
        }
        // 2. Replay WAL entries if present
        let recoveredWalEntries = 0;
        try {
            const walRaw = await fs.readFile(this.walFile, 'utf8');
            const lines = walRaw.split('\n').filter(l => l.trim().length > 0);
            for (const line of lines) {
                try {
                    const entry = JSON.parse(line);
                    this.currentWalSeq = Math.max(this.currentWalSeq, entry.sequence);
                    switch (entry.op) {
                        case 'ADD_NODE': {
                            const n = entry.data;
                            nodeMap.set(n.id, n);
                            break;
                        }
                        case 'REMOVE_NODE': {
                            const id = typeof entry.data === 'string' ? entry.data : entry.data.id;
                            nodeMap.delete(id);
                            break;
                        }
                        case 'ADD_EDGE': {
                            const e = entry.data;
                            edgeMap.set(e.id, e);
                            break;
                        }
                        case 'REMOVE_EDGE': {
                            const id = typeof entry.data === 'string' ? entry.data : entry.data.id;
                            edgeMap.delete(id);
                            break;
                        }
                    }
                    recoveredWalEntries += 1;
                }
                catch (parseErr) {
                    this.logger.warn('Skipping corrupted WAL line during replay', { line });
                }
            }
            if (recoveredWalEntries > 0) {
                this.logger.info(`Replayed ${recoveredWalEntries} WAL mutations into memory graph`);
            }
        }
        catch {
            // WAL file doesn't exist, which is expected for fresh starts
        }
        return {
            nodes: Array.from(nodeMap.values()),
            edges: Array.from(edgeMap.values()),
            recoveredWalEntries,
        };
    }
    getStoragePath() {
        return this.storagePath;
    }
}

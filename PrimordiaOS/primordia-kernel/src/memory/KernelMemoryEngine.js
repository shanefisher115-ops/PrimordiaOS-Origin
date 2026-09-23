/**
 * PrimordiaOS Sovereign Kernel Subsystem
 * KernelMemoryEngine.ts - Versioned, idempotent in-memory state engine with disk persistence
 */
import { promises as fs } from 'node:fs';
import * as path from 'node:path';
export class KernelMemoryEngine {
    logger;
    configPath;
    autoPersist;
    globalVersion = 0;
    store = new Map();
    constructor(logger, options = {}) {
        this.logger = logger.forSubsystem('memory');
        this.configPath = options.configPath || process.env.KERNEL_CONFIG_PATH || path.resolve(process.cwd(), '.primordia-kernel-state.json');
        this.autoPersist = options.autoPersist ?? false;
    }
    compositeKey(namespace, key) {
        return `${namespace}:${key}`;
    }
    /**
     * Idempotent state write with monotonic version tracking
     */
    set(namespace, key, value, tags) {
        const cKey = this.compositeKey(namespace, key);
        const existing = this.store.get(cKey);
        const now = new Date().toISOString();
        this.globalVersion++;
        const nextVersion = existing ? existing.version + 1 : 1;
        const record = {
            key,
            namespace,
            version: nextVersion,
            value,
            createdAt: existing ? existing.createdAt : now,
            updatedAt: now,
            tags: tags || existing?.tags,
        };
        this.store.set(cKey, record);
        this.logger.debug(`Memory updated [${cKey}] v${nextVersion} (global: ${this.globalVersion})`);
        if (this.autoPersist) {
            this.persistToDisk().catch(err => {
                this.logger.error('Failed auto-persisting kernel state to disk', err);
            });
        }
        return record;
    }
    /**
     * Compare-and-Swap atomic update
     */
    compareAndSwap(namespace, key, expectedVersion, newValue) {
        const cKey = this.compositeKey(namespace, key);
        const current = this.store.get(cKey);
        const actualVersion = current ? current.version : 0;
        if (actualVersion !== expectedVersion) {
            return { success: false, actualVersion };
        }
        const updated = this.set(namespace, key, newValue);
        return { success: true, record: updated, actualVersion: updated.version };
    }
    get(namespace, key) {
        const cKey = this.compositeKey(namespace, key);
        const record = this.store.get(cKey);
        return record ? record.value : undefined;
    }
    getRecord(namespace, key) {
        const cKey = this.compositeKey(namespace, key);
        return this.store.get(cKey);
    }
    has(namespace, key) {
        return this.store.has(this.compositeKey(namespace, key));
    }
    delete(namespace, key) {
        const cKey = this.compositeKey(namespace, key);
        if (this.store.has(cKey)) {
            this.store.delete(cKey);
            this.globalVersion++;
            this.logger.debug(`Memory deleted [${cKey}] (global: ${this.globalVersion})`);
            return true;
        }
        return false;
    }
    getNamespace(namespace) {
        const result = {};
        const prefix = `${namespace}:`;
        for (const [k, record] of this.store.entries()) {
            if (k.startsWith(prefix)) {
                result[record.key] = record.value;
            }
        }
        return result;
    }
    listKeys(namespace) {
        if (!namespace) {
            return Array.from(this.store.keys());
        }
        const prefix = `${namespace}:`;
        return Array.from(this.store.keys())
            .filter(k => k.startsWith(prefix))
            .map(k => k.substring(prefix.length));
    }
    createSnapshot() {
        const records = {};
        for (const [k, v] of this.store.entries()) {
            records[k] = { ...v };
        }
        return {
            snapshotId: `snap-${Date.now()}-${this.globalVersion}`,
            kernelVersion: '1.0.0',
            timestamp: new Date().toISOString(),
            globalVersion: this.globalVersion,
            records,
        };
    }
    restoreSnapshot(snapshot) {
        this.store.clear();
        for (const [k, record] of Object.entries(snapshot.records)) {
            this.store.set(k, record);
        }
        this.globalVersion = snapshot.globalVersion;
        this.logger.info(`Restored snapshot ${snapshot.snapshotId} (${this.store.size} records, global v${this.globalVersion})`);
    }
    async persistToDisk(customPath) {
        const targetPath = customPath || this.configPath;
        const snapshot = this.createSnapshot();
        const serialized = JSON.stringify(snapshot, null, 2);
        const dir = path.dirname(targetPath);
        await fs.mkdir(dir, { recursive: true });
        await fs.writeFile(targetPath, serialized, 'utf-8');
        this.logger.info(`Persisted kernel memory snapshot to ${targetPath}`);
        return targetPath;
    }
    async loadFromDisk(customPath) {
        const targetPath = customPath || this.configPath;
        try {
            const data = await fs.readFile(targetPath, 'utf-8');
            const snapshot = JSON.parse(data);
            if (snapshot && snapshot.records) {
                this.restoreSnapshot(snapshot);
                return true;
            }
            return false;
        }
        catch (err) {
            const code = err.code;
            if (code === 'ENOENT') {
                this.logger.debug(`No previous state file found at ${targetPath}. Initializing fresh memory substrate.`);
            }
            else {
                this.logger.warn(`Failed loading state from ${targetPath}`, { error: String(err) });
            }
            return false;
        }
    }
    getGlobalVersion() {
        return this.globalVersion;
    }
    getRecordCount() {
        return this.store.size;
    }
}

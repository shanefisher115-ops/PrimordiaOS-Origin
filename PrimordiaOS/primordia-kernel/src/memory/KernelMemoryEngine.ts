/**
 * PrimordiaOS Sovereign Kernel Subsystem
 * KernelMemoryEngine.ts - Versioned, idempotent in-memory state engine with disk persistence
 */

import { promises as fs } from 'node:fs';
import * as path from 'node:path';
import { KernelLogger } from '../logging/KernelLogger.js';

export interface MemoryRecord<T = unknown> {
  key: string;
  namespace: string;
  version: number;
  value: T;
  createdAt: string;
  updatedAt: string;
  tags?: string[];
}

export interface MemorySnapshot {
  snapshotId: string;
  kernelVersion: string;
  timestamp: string;
  globalVersion: number;
  records: Record<string, MemoryRecord>;
}

export interface MemoryEngineOptions {
  configPath?: string;
  autoPersist?: boolean;
}

export class KernelMemoryEngine {
  private logger: KernelLogger;
  private configPath: string;
  private autoPersist: boolean;
  private globalVersion = 0;
  private store = new Map<string, MemoryRecord>();

  constructor(logger: KernelLogger, options: MemoryEngineOptions = {}) {
    this.logger = logger.forSubsystem('memory');
    this.configPath = options.configPath || process.env.KERNEL_CONFIG_PATH || path.resolve(process.cwd(), '.primordia-kernel-state.json');
    this.autoPersist = options.autoPersist ?? false;
  }

  private compositeKey(namespace: string, key: string): string {
    return `${namespace}:${key}`;
  }

  /**
   * Idempotent state write with monotonic version tracking
   */
  public set<T>(namespace: string, key: string, value: T, tags?: string[]): MemoryRecord<T> {
    const cKey = this.compositeKey(namespace, key);
    const existing = this.store.get(cKey) as MemoryRecord<T> | undefined;
    const now = new Date().toISOString();

    this.globalVersion++;
    const nextVersion = existing ? existing.version + 1 : 1;

    const record: MemoryRecord<T> = {
      key,
      namespace,
      version: nextVersion,
      value,
      createdAt: existing ? existing.createdAt : now,
      updatedAt: now,
      tags: tags || existing?.tags,
    };

    this.store.set(cKey, record as MemoryRecord);
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
  public compareAndSwap<T>(
    namespace: string,
    key: string,
    expectedVersion: number,
    newValue: T
  ): { success: boolean; record?: MemoryRecord<T>; actualVersion?: number } {
    const cKey = this.compositeKey(namespace, key);
    const current = this.store.get(cKey) as MemoryRecord<T> | undefined;

    const actualVersion = current ? current.version : 0;
    if (actualVersion !== expectedVersion) {
      return { success: false, actualVersion };
    }

    const updated = this.set(namespace, key, newValue);
    return { success: true, record: updated, actualVersion: updated.version };
  }

  public get<T>(namespace: string, key: string): T | undefined {
    const cKey = this.compositeKey(namespace, key);
    const record = this.store.get(cKey);
    return record ? (record.value as T) : undefined;
  }

  public getRecord<T>(namespace: string, key: string): MemoryRecord<T> | undefined {
    const cKey = this.compositeKey(namespace, key);
    return this.store.get(cKey) as MemoryRecord<T> | undefined;
  }

  public has(namespace: string, key: string): boolean {
    return this.store.has(this.compositeKey(namespace, key));
  }

  public delete(namespace: string, key: string): boolean {
    const cKey = this.compositeKey(namespace, key);
    if (this.store.has(cKey)) {
      this.store.delete(cKey);
      this.globalVersion++;
      this.logger.debug(`Memory deleted [${cKey}] (global: ${this.globalVersion})`);
      return true;
    }
    return false;
  }

  public getNamespace(namespace: string): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    const prefix = `${namespace}:`;
    for (const [k, record] of this.store.entries()) {
      if (k.startsWith(prefix)) {
        result[record.key] = record.value;
      }
    }
    return result;
  }

  public listKeys(namespace?: string): string[] {
    if (!namespace) {
      return Array.from(this.store.keys());
    }
    const prefix = `${namespace}:`;
    return Array.from(this.store.keys())
      .filter(k => k.startsWith(prefix))
      .map(k => k.substring(prefix.length));
  }

  public createSnapshot(): MemorySnapshot {
    const records: Record<string, MemoryRecord> = {};
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

  public restoreSnapshot(snapshot: MemorySnapshot): void {
    this.store.clear();
    for (const [k, record] of Object.entries(snapshot.records)) {
      this.store.set(k, record);
    }
    this.globalVersion = snapshot.globalVersion;
    this.logger.info(`Restored snapshot ${snapshot.snapshotId} (${this.store.size} records, global v${this.globalVersion})`);
  }

  public async persistToDisk(customPath?: string): Promise<string> {
    const targetPath = customPath || this.configPath;
    const snapshot = this.createSnapshot();
    const serialized = JSON.stringify(snapshot, null, 2);

    const dir = path.dirname(targetPath);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(targetPath, serialized, 'utf-8');
    this.logger.info(`Persisted kernel memory snapshot to ${targetPath}`);
    return targetPath;
  }

  public async loadFromDisk(customPath?: string): Promise<boolean> {
    const targetPath = customPath || this.configPath;
    try {
      const data = await fs.readFile(targetPath, 'utf-8');
      const snapshot = JSON.parse(data) as MemorySnapshot;
      if (snapshot && snapshot.records) {
        this.restoreSnapshot(snapshot);
        return true;
      }
      return false;
    } catch (err: unknown) {
      const code = (err as { code?: string }).code;
      if (code === 'ENOENT') {
        this.logger.debug(`No previous state file found at ${targetPath}. Initializing fresh memory substrate.`);
      } else {
        this.logger.warn(`Failed loading state from ${targetPath}`, { error: String(err) });
      }
      return false;
    }
  }

  public getGlobalVersion(): number {
    return this.globalVersion;
  }

  public getRecordCount(): number {
    return this.store.size;
  }
}

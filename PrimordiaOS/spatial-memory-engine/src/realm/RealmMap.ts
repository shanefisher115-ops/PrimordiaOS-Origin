/**
 * @file RealmMap.ts
 * @description Manages 3D spatial mapping, boundaries, metadata, and adjacency
 * of PrimordiaOS Realms (Sovereign Core, Cockpit, Vision, MoneyPlugHub, Unreal, Lexicon).
 */

import { promises as fs } from 'node:fs';
import { dirname } from 'node:path';
import { SpatialVector3 } from '../graph/MemoryNode.js';
import { MemoryLogger } from '../logging/MemoryLogger.js';

export interface RealmDefinition {
  realmId: string;
  name: string;
  description: string;
  centerCoordinates: SpatialVector3;
  radius: number;
  metadata: Record<string, unknown>;
  createdAt: number;
  updatedAt: number;
}

export interface RealmAdjacencyEdge {
  fromRealmId: string;
  toRealmId: string;
  bidirectional: boolean;
}

export class RealmMap {
  private readonly realms: Map<string, RealmDefinition> = new Map();
  private readonly adjacency: Map<string, Set<string>> = new Map();
  private readonly logger: MemoryLogger;

  constructor(logger?: MemoryLogger) {
    this.logger = logger ?? new MemoryLogger({ component: 'RealmMap' });
    this.seedDefaultRealms();
  }

  private seedDefaultRealms(): void {
    const now = Date.now();
    const defaultRealms: RealmDefinition[] = [
      {
        realmId: 'sovereign_core',
        name: 'Sovereign Kernel Realm',
        description: 'Supreme origin kernel of PrimordiaOS. Houses immutable rule engine and Tier 0 sovereign intent.',
        centerCoordinates: { x: 0, y: 0, z: 0 },
        radius: 500,
        metadata: { tier: 'Supreme', antiGravScore: 100 },
        createdAt: now,
        updatedAt: now,
      },
      {
        realmId: 'sovereign_cockpit',
        name: 'Sovereign Cockpit Realm',
        description: 'Interactive operator console, HUD, Cyber Arcade, and high-altitude neural telemetry.',
        centerCoordinates: { x: 1000, y: 0, z: 0 },
        radius: 400,
        metadata: { uiHost: 'http://localhost:3000/arcade', wsPort: 3000 },
        createdAt: now,
        updatedAt: now,
      },
      {
        realmId: 'vision_core',
        name: 'VisionCore Realm',
        description: 'MovieForge 4K Neural Theater, visual shaders, DaVinci LUT processing, and perception.',
        centerCoordinates: { x: 0, y: 1000, z: 0 },
        radius: 400,
        metadata: { luts: ['Imperial Gold', 'Cyberpunk Emerald', 'Neutral Raw'] },
        createdAt: now,
        updatedAt: now,
      },
      {
        realmId: 'moneyplughub',
        name: 'MoneyPlugHub Autonomous Realm',
        description: 'Autonomous publishing loops, faceless media generation, and syndication engines.',
        centerCoordinates: { x: -1000, y: 0, z: 0 },
        radius: 400,
        metadata: { loopDepthLimit: 10, antiSpam: true },
        createdAt: now,
        updatedAt: now,
      },
      {
        realmId: 'unreal_bridge',
        name: 'Unreal Engine 5.4 Bridge Realm',
        description: 'Niagara particle telemetry, physics simulation, and procedural actor mesh generation.',
        centerCoordinates: { x: 0, y: -1000, z: 0 },
        radius: 400,
        metadata: { ueVersion: '5.4', streamMode: 'WebSocket' },
        createdAt: now,
        updatedAt: now,
      },
      {
        realmId: 'lexicon_codex',
        name: 'Lexicon Codex Realm',
        description: 'Living conceptual registry, high-altitude terminology, and inscription chamber.',
        centerCoordinates: { x: 0, y: 0, z: 1000 },
        radius: 350,
        metadata: { cognitiveAltitude: 'High' },
        createdAt: now,
        updatedAt: now,
      },
    ];

    for (const realm of defaultRealms) {
      this.registerRealm(realm);
    }

    // Default topological adjacencies (Core connects to all, periphery connects symmetrically)
    this.connectRealms('sovereign_core', 'sovereign_cockpit', true);
    this.connectRealms('sovereign_core', 'vision_core', true);
    this.connectRealms('sovereign_core', 'moneyplughub', true);
    this.connectRealms('sovereign_core', 'unreal_bridge', true);
    this.connectRealms('sovereign_core', 'lexicon_codex', true);
    this.connectRealms('vision_core', 'unreal_bridge', true);
    this.connectRealms('sovereign_cockpit', 'moneyplughub', true);
  }

  public registerRealm(realm: RealmDefinition): void {
    this.realms.set(realm.realmId, {
      ...realm,
      updatedAt: Date.now(),
    });
    if (!this.adjacency.has(realm.realmId)) {
      this.adjacency.set(realm.realmId, new Set());
    }
    this.logger.info(`Registered Realm: [${realm.name}] (${realm.realmId})`, {
      center: realm.centerCoordinates,
      radius: realm.radius,
    });
  }

  public getRealm(realmId: string): RealmDefinition | undefined {
    return this.realms.get(realmId);
  }

  public getAllRealms(): RealmDefinition[] {
    return Array.from(this.realms.values());
  }

  public connectRealms(fromRealmId: string, toRealmId: string, bidirectional = true): void {
    if (!this.realms.has(fromRealmId) || !this.realms.has(toRealmId)) {
      throw new Error(`Cannot connect unknown realms: [${fromRealmId}] -> [${toRealmId}]`);
    }

    this.adjacency.get(fromRealmId)?.add(toRealmId);
    if (bidirectional) {
      this.adjacency.get(toRealmId)?.add(fromRealmId);
    }
  }

  public getAdjacentRealms(realmId: string): RealmDefinition[] {
    const neighborIds = this.adjacency.get(realmId);
    if (!neighborIds) return [];

    const result: RealmDefinition[] = [];
    for (const id of neighborIds) {
      const realm = this.realms.get(id);
      if (realm) result.push(realm);
    }
    return result;
  }

  public findContainingRealm(coords: SpatialVector3): RealmDefinition | undefined {
    for (const realm of this.realms.values()) {
      const dx = coords.x - realm.centerCoordinates.x;
      const dy = coords.y - realm.centerCoordinates.y;
      const dz = coords.z - realm.centerCoordinates.z;
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (dist <= realm.radius) {
        return realm;
      }
    }
    return undefined;
  }

  public findNearestRealm(coords: SpatialVector3): { realm: RealmDefinition; distance: number } | undefined {
    if (this.realms.size === 0) return undefined;

    let nearest: RealmDefinition | undefined;
    let minDistance = Infinity;

    for (const realm of this.realms.values()) {
      const dx = coords.x - realm.centerCoordinates.x;
      const dy = coords.y - realm.centerCoordinates.y;
      const dz = coords.z - realm.centerCoordinates.z;
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (dist < minDistance) {
        minDistance = dist;
        nearest = realm;
      }
    }

    return nearest ? { realm: nearest, distance: minDistance } : undefined;
  }

  public findRealmPath(fromRealmId: string, toRealmId: string): string[] | null {
    if (!this.realms.has(fromRealmId) || !this.realms.has(toRealmId)) {
      return null;
    }
    if (fromRealmId === toRealmId) {
      return [fromRealmId];
    }

    const queue: Array<{ id: string; path: string[] }> = [{ id: fromRealmId, path: [fromRealmId] }];
    const visited = new Set<string>([fromRealmId]);

    while (queue.length > 0) {
      const { id, path } = queue.shift()!;
      const neighbors = this.adjacency.get(id);
      if (!neighbors) continue;

      for (const neighborId of neighbors) {
        if (neighborId === toRealmId) {
          return [...path, neighborId];
        }
        if (!visited.has(neighborId)) {
          visited.add(neighborId);
          queue.push({ id: neighborId, path: [...path, neighborId] });
        }
      }
    }

    return null;
  }

  public async saveToFile(filePath?: string): Promise<void> {
    const targetPath = filePath || process.env['REALM_MAP_PATH'] || './data/realm-map.json';
    const data = {
      version: '1.0.0',
      timestamp: Date.now(),
      realms: Array.from(this.realms.values()),
      adjacency: Array.from(this.adjacency.entries()).map(([from, toSet]) => ({
        from,
        to: Array.from(toSet),
      })),
    };

    await fs.mkdir(dirname(targetPath), { recursive: true });
    await fs.writeFile(targetPath, JSON.stringify(data, null, 2), 'utf8');
    this.logger.info(`RealmMap persisted to: ${targetPath}`);
  }

  public async loadFromFile(filePath?: string): Promise<boolean> {
    const targetPath = filePath || process.env['REALM_MAP_PATH'] || './data/realm-map.json';
    try {
      const content = await fs.readFile(targetPath, 'utf8');
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed.realms)) {
        for (const realm of parsed.realms) {
          this.realms.set(realm.realmId, realm);
          if (!this.adjacency.has(realm.realmId)) {
            this.adjacency.set(realm.realmId, new Set());
          }
        }
      }
      if (Array.isArray(parsed.adjacency)) {
        for (const item of parsed.adjacency) {
          const set = this.adjacency.get(item.from) || new Set();
          for (const target of item.to) {
            set.add(target);
          }
          this.adjacency.set(item.from, set);
        }
      }
      this.logger.info(`RealmMap loaded successfully from: ${targetPath}`);
      return true;
    } catch (err: unknown) {
      this.logger.warn(`Could not load RealmMap from ${targetPath}, using defaults`, {
        error: String(err),
      });
      return false;
    }
  }
}

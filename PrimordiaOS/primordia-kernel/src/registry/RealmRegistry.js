/**
 * PrimordiaOS Sovereign Kernel Subsystem
 * RealmRegistry.ts - Master registry for sovereign OS realms, routing and capability resolution
 */
import { promises as fs } from 'node:fs';
import * as path from 'node:path';
export class RealmRegistry {
    logger;
    realms = new Map();
    manifestPath;
    constructor(logger, manifestPath) {
        this.logger = logger.forSubsystem('registry');
        this.manifestPath = manifestPath || process.env.REALM_REGISTRY_PATH || path.resolve(process.cwd(), 'primordia_realms.json');
    }
    /**
     * Initializes the realm registry with the foundational 5 PrimordiaOS realms
     */
    registerDefaultRealms() {
        const defaultRealms = [
            {
                id: 'sovereign-cockpit',
                displayName: 'Sovereign Cockpit',
                icon: '🎛️',
                priority: 1,
                status: 'ACTIVE',
                accentColor: '#00f0ff',
                description: 'Primary human-sovereign control surface, command telemetry HUD and neural theater.',
                capabilities: ['telemetry:read', 'command:dispatch', 'ui:render', 'lut:manage'],
                telemetryKeys: ['cockpit_active_sessions', 'viewport_resolution', 'fps', 'audio_stream'],
                actions: ['broadcast_command', 'render_overlay', 'switch_workspace', 'trigger_pulse'],
            },
            {
                id: 'moneyplughub',
                displayName: 'MoneyPlugHub',
                icon: '⚡',
                priority: 2,
                status: 'ACTIVE',
                accentColor: '#00ff88',
                description: 'Autonomous commerce, marketing loops, idempotent content publishing, and affiliate flow.',
                capabilities: ['loop:execute', 'publish:media', 'notion:sync', 'stripe:webhook'],
                telemetryKeys: ['published_posts_24h', 'active_loops', 'revenue_usd', 'queue_depth'],
                actions: ['trigger_loop', 'pause_loop', 'sync_catalog', 'audit_ledger'],
            },
            {
                id: 'vision-core',
                displayName: 'VisionCore',
                icon: '👁️',
                priority: 3,
                status: 'ACTIVE',
                accentColor: '#9d00ff',
                description: 'Multimodal visual analysis, spatial OCR, raymarched shaders, and scene understanding.',
                capabilities: ['vision:inspect', 'scene:parse', 'shader:compile', 'ocr:extract'],
                telemetryKeys: ['frames_processed', 'inference_latency_ms', 'active_shaders', 'gpu_utilization'],
                actions: ['inspect_frame', 'compile_lut', 'generate_depth_map', 'benchmark_warp'],
            },
            {
                id: 'unreal-bridge',
                displayName: 'Unreal Bridge',
                icon: '🎮',
                priority: 4,
                status: 'ACTIVE',
                accentColor: '#ffaa00',
                description: 'High-throughput WebSocket telemetry stream to Unreal Engine 5.4 Niagara emitters and actors.',
                capabilities: ['unreal:stream', 'niagara:emit', 'actor:spawn', 'cad:mesh_stream'],
                telemetryKeys: ['connected_clients', 'niagara_pulses_sec', 'bytes_streamed', 'world_actors'],
                actions: ['emit_niagara_burst', 'spawn_actor', 'stream_cad_mesh', 'sync_camera'],
            },
            {
                id: 'spatial-memory-engine',
                displayName: 'Spatial Memory Engine',
                icon: '🧠',
                priority: 5,
                status: 'ACTIVE',
                accentColor: '#ff0055',
                description: 'High-dimensional associative memory, vector graph topologies, and persistent codex lattice.',
                capabilities: ['vector:search', 'graph:traverse', 'codex:inscribe', 'state:snapshot'],
                telemetryKeys: ['total_vectors', 'graph_nodes', 'cache_hit_ratio', 'index_freshness'],
                actions: ['inscribe_memory', 'query_lattice', 'prune_stale', 'compact_index'],
            },
        ];
        for (const realm of defaultRealms) {
            this.registerRealm(realm);
        }
        this.logger.info(`Initialized RealmRegistry with ${defaultRealms.length} default sovereign realms.`);
    }
    registerRealm(realm) {
        if (!realm.id || !realm.displayName) {
            throw new Error('Realm registration requires a valid id and displayName');
        }
        this.realms.set(realm.id, {
            ...realm,
            lastHeartbeat: realm.lastHeartbeat || new Date().toISOString(),
        });
        this.logger.info(`Realm registered: [${realm.id}] "${realm.displayName}" (${realm.status})`);
    }
    unregisterRealm(realmId) {
        const existed = this.realms.delete(realmId);
        if (existed) {
            this.logger.info(`Realm unregistered: [${realmId}]`);
        }
        return existed;
    }
    getRealm(realmId) {
        return this.realms.get(realmId);
    }
    hasRealm(realmId) {
        return this.realms.has(realmId);
    }
    listRealms() {
        return Array.from(this.realms.values()).sort((a, b) => a.priority - b.priority);
    }
    updateRealmStatus(realmId, status, metadata) {
        const realm = this.realms.get(realmId);
        if (!realm) {
            return false;
        }
        realm.status = status;
        realm.lastHeartbeat = new Date().toISOString();
        if (metadata) {
            realm.metadata = { ...realm.metadata, ...metadata };
        }
        this.logger.debug(`Realm [${realmId}] status transitioned to ${status}`);
        return true;
    }
    updateHeartbeat(realmId) {
        const realm = this.realms.get(realmId);
        if (!realm)
            return false;
        realm.lastHeartbeat = new Date().toISOString();
        return true;
    }
    /**
     * Resolves routing capability for an action
     */
    resolveRoute(action) {
        const matching = [];
        for (const realm of this.realms.values()) {
            if (realm.actions.includes(action) || realm.capabilities.some(cap => action.startsWith(cap.split(':')[0] || ''))) {
                matching.push(realm);
            }
        }
        return matching;
    }
    /**
     * Loads custom realm configuration from disk if present
     */
    async loadFromDisk(customPath) {
        const targetPath = customPath || this.manifestPath;
        try {
            const data = await fs.readFile(targetPath, 'utf-8');
            const parsed = JSON.parse(data);
            if (parsed && Array.isArray(parsed.realms)) {
                for (const r of parsed.realms) {
                    this.registerRealm({
                        id: r.id,
                        displayName: r.display_name || r.displayName || r.id,
                        icon: r.icon,
                        priority: r.priority || 10,
                        status: 'ACTIVE',
                        accentColor: r.accent_color || r.accentColor,
                        description: r.description || '',
                        capabilities: r.capabilities || [],
                        telemetryKeys: r.telemetry_keys || r.telemetryKeys || [],
                        actions: r.actions || [],
                        metadata: r.metadata,
                    });
                }
                this.logger.info(`Loaded realms from disk manifest: ${targetPath}`);
                return true;
            }
            return false;
        }
        catch {
            this.logger.debug(`Custom realm manifest not found at ${targetPath}. Default realms will remain active.`);
            return false;
        }
    }
    /**
     * Persists registered realms to disk
     */
    async saveToDisk(customPath) {
        const targetPath = customPath || this.manifestPath;
        const output = {
            $schema: 'https://json-schema.org/draft/2020-12/schema',
            name: 'PrimordiaOS Sovereign Realm Manifest',
            version: '1.0.0',
            exportedAt: new Date().toISOString(),
            realms: this.listRealms(),
        };
        const dir = path.dirname(targetPath);
        await fs.mkdir(dir, { recursive: true });
        await fs.writeFile(targetPath, JSON.stringify(output, null, 2), 'utf-8');
        this.logger.info(`Saved realm manifest to ${targetPath}`);
    }
}

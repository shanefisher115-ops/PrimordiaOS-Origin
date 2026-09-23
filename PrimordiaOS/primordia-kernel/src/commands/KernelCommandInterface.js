/**
 * PrimordiaOS Sovereign Kernel Subsystem
 * KernelCommandInterface.ts - Cockpit/CLI command routing, execution and response envelope framing
 */
export class KernelCommandInterface {
    logger;
    registry;
    eventBus;
    scheduler;
    memory;
    safety;
    heartbeat;
    commandRegistry = new Map();
    constructor(logger, registry, eventBus, scheduler, memory, safety, heartbeat) {
        this.logger = logger.forSubsystem('commands');
        this.registry = registry;
        this.eventBus = eventBus;
        this.scheduler = scheduler;
        this.memory = memory;
        this.safety = safety;
        this.heartbeat = heartbeat;
        this.registerCoreCommands();
    }
    /**
     * Registers custom command handler
     */
    registerCommand(name, handler) {
        this.commandRegistry.set(name.toLowerCase(), handler);
        this.logger.debug(`Registered command: [${name.toLowerCase()}]`);
    }
    /**
     * Execute raw command line or structured command request
     */
    async execute(input) {
        const req = typeof input === 'string' ? this.parseCommandLine(input) : input;
        const cmdKey = req.command.toLowerCase();
        const traceId = req.traceId || `cmd-${Date.now()}`;
        this.logger.debug(`Executing command [${cmdKey}] from ${req.caller || 'anonymous'}`);
        const handler = this.commandRegistry.get(cmdKey);
        if (!handler) {
            return {
                success: false,
                command: req.command,
                error: `Unknown command "${req.command}". Type "help" or "kernel:help" for available commands.`,
                timestamp: new Date().toISOString(),
                traceId,
            };
        }
        try {
            const data = await handler(req);
            return {
                success: true,
                command: req.command,
                data,
                timestamp: new Date().toISOString(),
                traceId,
            };
        }
        catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            this.logger.error(`Command failed [${cmdKey}]: ${msg}`);
            return {
                success: false,
                command: req.command,
                error: msg,
                timestamp: new Date().toISOString(),
                traceId,
            };
        }
    }
    parseCommandLine(line) {
        const trimmed = line.trim();
        const parts = trimmed.match(/(?:[^\s"]+|"[^"]*")+/g) || [];
        const cleanParts = parts.map(p => (p.startsWith('"') && p.endsWith('"') ? p.slice(1, -1) : p));
        const command = cleanParts[0] || 'help';
        const args = cleanParts.slice(1);
        return { command, args, caller: 'cli' };
    }
    registerCoreCommands() {
        // 1. kernel:status / status
        const statusHandler = async () => {
            const vitality = this.heartbeat.getLatestMetrics();
            const taskStats = this.scheduler.getStats();
            return {
                kernel: 'PrimordiaOS Masterplane',
                status: 'RUNNING',
                vitality,
                tasks: taskStats,
                memoryVersion: this.memory.getGlobalVersion(),
                realms: this.registry.listRealms().map(r => ({ id: r.id, status: r.status, priority: r.priority })),
            };
        };
        this.registerCommand('status', statusHandler);
        this.registerCommand('kernel:status', statusHandler);
        // 2. realm:list
        this.registerCommand('realm:list', async () => {
            return this.registry.listRealms();
        });
        // 3. realm:inspect
        this.registerCommand('realm:inspect', async (req) => {
            const realmId = req.args?.[0] || req.params?.realmId;
            if (!realmId)
                throw new Error('Usage: realm:inspect <realmId>');
            const realm = this.registry.getRealm(realmId);
            if (!realm)
                throw new Error(`Realm "${realmId}" not found`);
            return realm;
        });
        // 4. event:emit
        this.registerCommand('event:emit', async (req) => {
            const topic = req.args?.[0] || req.params?.topic;
            const rawPayload = req.args?.[1] || req.params?.payload;
            if (!topic)
                throw new Error('Usage: event:emit <topic> [payload]');
            let parsedPayload = rawPayload;
            if (typeof rawPayload === 'string') {
                try {
                    parsedPayload = JSON.parse(rawPayload);
                }
                catch {
                    parsedPayload = { message: rawPayload };
                }
            }
            return await this.eventBus.emit(topic, parsedPayload, req.caller || 'cockpit');
        });
        // 5. task:list
        this.registerCommand('task:list', async () => {
            return this.scheduler.getStats();
        });
        // 6. memory:get / memory:set
        this.registerCommand('memory:get', async (req) => {
            const namespace = req.args?.[0] || 'kernel';
            const key = req.args?.[1];
            if (!key)
                throw new Error('Usage: memory:get <namespace> <key>');
            return this.memory.get(namespace, key);
        });
        this.registerCommand('memory:set', async (req) => {
            const namespace = req.args?.[0] || 'kernel';
            const key = req.args?.[1];
            const valStr = req.args?.[2];
            if (!key || valStr === undefined)
                throw new Error('Usage: memory:set <namespace> <key> <value>');
            return this.memory.set(namespace, key, valStr);
        });
        // 7. safety:quarantine
        this.registerCommand('safety:quarantine', async () => {
            return this.safety.getQuarantineLedger();
        });
        // 8. worldstate:set
        this.registerCommand('worldstate:set', async (req) => {
            const targetState = req.args?.[0]?.toUpperCase();
            if (!['STABLE', 'FLUX', 'CHARGED', 'DEGRADED'].includes(targetState)) {
                throw new Error('Valid world states: STABLE, FLUX, CHARGED, DEGRADED');
            }
            this.heartbeat.setWorldState(targetState);
            return { worldState: targetState };
        });
        // 9. help / kernel:help
        const helpHandler = async () => {
            return {
                availableCommands: [
                    'status / kernel:status - Display kernel vitality and metrics',
                    'realm:list - List all registered sovereign realms',
                    'realm:inspect <id> - Inspect detailed realm capabilities',
                    'event:emit <topic> [json] - Emit an event to the global eventbus',
                    'task:list - Show scheduler task statistics',
                    'memory:get <ns> <key> - Query versioned memory substrate',
                    'memory:set <ns> <key> <val> - Mutate memory substrate',
                    'safety:quarantine - Inspect quarantined security violations',
                    'worldstate:set <STABLE|FLUX|CHARGED|DEGRADED> - Modulate world state',
                    'help / kernel:help - Show this guide',
                ],
            };
        };
        this.registerCommand('help', helpHandler);
        this.registerCommand('kernel:help', helpHandler);
    }
}

// ============================================================
//   REALMBUS — Main Entry Point
// ============================================================
//
//   Boots the RealmBus gateway with all realm connectors.
//
//   Usage:
//     npx tsx plugin-os/realmbus/index.ts
//
//   Or import programmatically:
//     import { bootRealmBus } from './realmbus/index.js';
//     const bus = await bootRealmBus();
//
import { startRealmBus } from './server.js';
import { SystemConnector } from './connectors/system.js';
import { CloudConnector } from './connectors/cloud.js';
import { SimulationConnector } from './connectors/simulation.js';
import { AgentPoolConnector } from './connectors/agent.js';
import { PROTOCOL_VERSION, } from './protocol.js';
// ─── Boot Sequence ──────────────────────────────────────────
export async function bootRealmBus() {
    console.log('\x1b[38;2;39;216;255m');
    console.log('╔══════════════════════════════════════════════════╗');
    console.log('║        REALMBUS — PrimordiaOS Gateway            ║');
    console.log(`║        Protocol v${PROTOCOL_VERSION}                           ║`);
    console.log('╚══════════════════════════════════════════════════╝');
    console.log('\x1b[0m');
    // Start the WebSocket gateway
    const server = await startRealmBus();
    // ── Boot Realm Connectors ─────────────────────────────
    const systemConnector = new SystemConnector();
    const cloudConnector = new CloudConnector();
    const simulationConnector = new SimulationConnector();
    const agentPool = new AgentPoolConnector();
    const connectors = [systemConnector, cloudConnector, simulationConnector, agentPool];
    for (const connector of connectors) {
        // Connect the connector
        await connector.connect();
        // Register the connector in the server's registry
        const registration = connector.getRegistration();
        server.registry.register(connector.realmName, registration, connector);
        // Wire: connector → server (messages from connector flow into server routing)
        connector.onMessage((message) => {
            // If it's a response (has correlationId), route back to the original sender
            if (message.correlationId) {
                // Find the connection that sent the original command
                // For now, broadcast responses to all (the client filters by correlationId)
                const snapshot = server.registry.snapshot();
                for (const realm of snapshot.realms) {
                    if (realm.realmName !== connector.realmName) {
                        server.sendToRealm(realm.realmName, message);
                    }
                }
            }
            else if (message.type === 'event') {
                // Events broadcast to all
                const snapshot = server.registry.snapshot();
                for (const realm of snapshot.realms) {
                    if (realm.realmName !== connector.realmName) {
                        server.sendToRealm(realm.realmName, message);
                    }
                }
            }
            // Always audit
            server.audit.log(message, true);
        });
        console.log(`  ✓ ${connector.realmName} connector online`);
    }
    // ── Wire: server → connectors (incoming WS messages route to connectors) ─
    // This is handled inside server.ts handleMessage via registry lookup.
    // We need to intercept messages targeted at local connectors.
    // Override the server's routing to also dispatch to local connectors
    const originalRegistry = server.registry;
    // Patch: when a message arrives targeting a local connector, send to it directly
    server.audit.subscribe((entry) => {
        if (!entry.routed)
            return; // Only routed messages
        const msg = entry.message;
        if (msg.type === 'command') {
            // Check if target is a local connector
            const targetConnector = connectors.find((c) => c.realmName === msg.target);
            if (targetConnector) {
                targetConnector.send(msg);
            }
            // Also check intent-based routing to local connectors
            if (!targetConnector) {
                const resolved = originalRegistry.findRealmForIntent(msg.intent);
                if (resolved) {
                    const intentConnector = connectors.find((c) => c.realmName === resolved.realmName);
                    if (intentConnector) {
                        intentConnector.send(msg);
                    }
                }
            }
        }
    });
    console.log('\n\x1b[38;2;39;216;255m◆ RealmBus fully operational\x1b[0m');
    console.log(`  ${connectors.length} realms connected`);
    console.log(`  ${server.registry.getAllIntents().length} intents registered`);
    console.log(`  Gateway: ws://localhost:${server.config.port}\n`);
    return server;
}
// ─── Standalone Execution ───────────────────────────────────
const isMainModule = process.argv[1]?.endsWith('index.ts') || process.argv[1]?.endsWith('index.js');
if (isMainModule) {
    bootRealmBus().catch((err) => {
        console.error('Failed to boot RealmBus:', err);
        process.exit(1);
    });
}
// ─── Re-exports ─────────────────────────────────────────────
export { RealmBusServer } from './server.js';
export { RealmRegistry } from './registry.js';
export { RealmRouter } from './router.js';
export { AuditLogger } from './audit.js';
export * from './protocol.js';
export { SystemConnector } from './connectors/system.js';
export { CloudConnector } from './connectors/cloud.js';
export { SimulationConnector } from './connectors/simulation.js';
export { AgentPoolConnector } from './connectors/agent.js';

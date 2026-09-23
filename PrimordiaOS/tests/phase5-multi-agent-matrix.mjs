/**
 * ==============================================================================
 * PRIMORDIAOS PHASE 5: AUTONOMOUS MULTI-AGENT MATRIX REGRESSION TEST SUITE
 * Validates SwarmCoordinator, ARCHITECT, BUILDER, AUDITOR, DISPATCHER agents,
 * encrypted/signed event bus, CrossRealmExecutionBridge, MicroserviceForge,
 * DeployMatrix with canary rollback, and Multi-Realm Coherence.
 * ==============================================================================
 */

import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

let totalTests = 0;
let passedTests = 0;

function runTest(name, fn) {
  totalTests++;
  try {
    fn();
    console.log(`  ✔ [PASS] ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  ❌ [FAIL] ${name}`);
    console.error(`     Error: ${err.message}`);
  }
}

async function runAsyncTest(name, fn) {
  totalTests++;
  try {
    await fn();
    console.log(`  ✔ [PASS] ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  ❌ [FAIL] ${name}`);
    console.error(`     Error: ${err.message}`);
  }
}

console.log('\n========================================================');
console.log('⚡ PRIMORDIAOS PHASE 5: MULTI-AGENT MATRIX TESTS');
console.log('========================================================\n');

async function main() {
  let modules;
  const distPath = path.join(rootDir, 'dist', 'src', 'phase5-swarm-orchestrator.js');
  const distRootPath = path.join(rootDir, 'dist', 'phase5-swarm-orchestrator.js');

  if (fs.existsSync(distPath)) {
    modules = await import(`file://${distPath.replace(/\\/g, '/')}`);
  } else if (fs.existsSync(distRootPath)) {
    modules = await import(`file://${distRootPath.replace(/\\/g, '/')}`);
  } else {
    throw new Error(`Compiled phase 5 orchestrator not found. Checked: ${distPath} and ${distRootPath}`);
  }

  const {
    SwarmCoordinator,
    CrossRealmExecutionBridge,
    MicroserviceForge,
    DeployMatrix,
    AutonomousSwarmOrchestrator,
    MULTI_AGENT_MATRIX_REALM_MANIFEST,
    verifyMultiAgentRealmCoherence,
  } = modules;

  const testTempDir = path.join(rootDir, 'data', 'test_scratch_phase5');
  if (!fs.existsSync(testTempDir)) {
    fs.mkdirSync(testTempDir, { recursive: true });
  }

  // ============================================================================
  // SECTION 1: Core Contracts Compliance
  // ============================================================================
  console.log('--- Section 1: Phase 5 Core Contracts Compliance ---');

  runTest('1.1: Canonical AgentTask and SwarmExecutionLog structure', () => {
    const coordinator = new SwarmCoordinator();
    const task = coordinator.submitTask(
      'ARCHITECT',
      'Design high-throughput gateway',
      'sovereign_core',
      { targetQps: 10000 }
    );

    assert.strictEqual(typeof task.taskId, 'string');
    assert.strictEqual(task.role, 'ARCHITECT');
    assert.strictEqual(task.objective, 'Design high-throughput gateway');
    assert.strictEqual(task.targetRealm, 'sovereign_core');
    assert.strictEqual(task.status, 'PENDING');
    assert.strictEqual(task.retryCount, 0);
    assert.strictEqual(typeof task.createdAt, 'number');
    assert.strictEqual(typeof task.idempotencyKey, 'string');
    assert.strictEqual(typeof task.auditHash, 'string');

    const log = coordinator.generateExecutionLog();
    assert.strictEqual(typeof log.executionId, 'string');
    assert.strictEqual(typeof log.timestamp, 'number');
    assert(Array.isArray(log.activeAgents));
    assert.strictEqual(log.activeAgents.length, 4);
    assert.strictEqual(typeof log.tasksProcessed, 'number');
    assert.strictEqual(typeof log.systemEntropy, 'number');
    assert.strictEqual(typeof log.antigravScore, 'number');
    assert(log.antigravScore >= 70 && log.antigravScore <= 100);
  });

  // ============================================================================
  // SECTION 2: Swarm Coordinator & Signed Event Bus
  // ============================================================================
  console.log('--- Section 2: Swarm Coordinator & Signed Event Bus ---');

  runTest('2.1: Message signing (HMAC-SHA256) and event publishing', () => {
    const coordinator = new SwarmCoordinator({ secretKey: 'test_secret' });
    let received = null;

    coordinator.subscribe('TELEMETRY_ALERT', (msg) => {
      received = msg;
    });

    const published = coordinator.publish('COORDINATOR', 'BUILDER', 'TELEMETRY_ALERT', {
      alert: 'HIGH_LATENCY',
      threshold: 50,
    });

    assert.strictEqual(published.senderRole, 'COORDINATOR');
    assert.strictEqual(published.recipientRole, 'BUILDER');
    assert.strictEqual(published.topic, 'TELEMETRY_ALERT');
    assert.strictEqual(typeof published.signature, 'string');
    assert(received !== null);
    assert.strictEqual(received.messageId, published.messageId);

    // Verify signature integrity
    const validSig = coordinator.signPayload(published.payload, published.timestamp);
    assert.strictEqual(published.signature, validSig);
  });

  runTest('2.2: Idempotency deduplication prevents duplicate pending tasks', () => {
    const coordinator = new SwarmCoordinator();
    const task1 = coordinator.submitTask(
      'BUILDER',
      'Compile gateway binary',
      'network_realm',
      { port: 8080 },
      'IDEMP_FIXED_001'
    );

    const task2 = coordinator.submitTask(
      'BUILDER',
      'Compile gateway binary',
      'network_realm',
      { port: 8080 },
      'IDEMP_FIXED_001'
    );

    assert.strictEqual(task1.taskId, task2.taskId);
    assert.strictEqual(coordinator.getTasksByStatus('PENDING').length, 1);
  });

  await runAsyncTest('2.3: Task lifecycle state machine (PENDING -> EXECUTING -> VERIFIED -> COMMITTED)', async () => {
    const coordinator = new SwarmCoordinator();
    const task = coordinator.submitTask('ARCHITECT', 'Plan topology expansion', 'sovereign_core');

    assert.strictEqual(task.status, 'PENDING');
    const executed = await coordinator.executeTask(task.taskId);

    assert.strictEqual(executed.status, 'COMMITTED');
    assert.strictEqual(typeof executed.completedAt, 'number');
    assert(executed.payload.result !== undefined);
    assert.strictEqual(executed.payload.result.architectVerdict, 'APPROVED_BLUEPRINT');
  });

  await runAsyncTest('2.4: All 4 Agent Roles execute specialized workflows', async () => {
    const coordinator = new SwarmCoordinator();

    const tArchitect = coordinator.submitTask('ARCHITECT', 'Review blueprints', 'sovereign_core');
    const tBuilder = coordinator.submitTask('BUILDER', 'Synthesize endpoints', 'offer_engine');
    const tAuditor = coordinator.submitTask('AUDITOR', 'Audit security posture', 'audit_realm');
    const tDispatcher = coordinator.submitTask('DISPATCHER', 'Route deployment matrix', 'cloud_vessel');

    await coordinator.dispatchAllPending();

    assert.strictEqual(coordinator.getTask(tArchitect.taskId)?.payload.result.architectVerdict, 'APPROVED_BLUEPRINT');
    assert.strictEqual(coordinator.getTask(tBuilder.taskId)?.payload.result.builderVerdict, 'ARTIFACT_COMPILED');
    assert.strictEqual(coordinator.getTask(tAuditor.taskId)?.payload.result.auditorVerdict, 'PASSED_ANTIGRAV');
    assert.strictEqual(coordinator.getTask(tDispatcher.taskId)?.payload.result.dispatcherVerdict, 'DISPATCH_CONFIRMED');
  });

  await runAsyncTest('2.5: Task failure retry handling with backoff and terminal failure', async () => {
    const coordinator = new SwarmCoordinator({ maxRetries: 2 });
    let attempts = 0;

    coordinator.registerRoleHandler('BUILDER', async () => {
      attempts++;
      throw new Error(`Synthetic builder failure attempt ${attempts}`);
    });

    const task = coordinator.submitTask('BUILDER', 'Failing task test', 'sandbox');

    // Execution 1: retryCount becomes 1, status reset to PENDING
    const r1 = await coordinator.executeTask(task.taskId);
    assert.strictEqual(r1.retryCount, 1);
    assert.strictEqual(r1.status, 'PENDING');

    // Execution 2: retryCount becomes 2, status reset to PENDING
    const r2 = await coordinator.executeTask(task.taskId);
    assert.strictEqual(r2.retryCount, 2);
    assert.strictEqual(r2.status, 'PENDING');

    // Execution 3: retryCount exceeds maxRetries (2), status set to FAILED
    const r3 = await coordinator.executeTask(task.taskId);
    assert.strictEqual(r3.retryCount, 3);
    assert.strictEqual(r3.status, 'FAILED');
    assert(r3.error.includes('Synthetic builder failure'));
  });

  // ============================================================================
  // SECTION 3: Cross-Realm Execution Bridge
  // ============================================================================
  console.log('--- Section 3: Cross-Realm Execution Bridge ---');

  await runAsyncTest('3.1: Action PROVISION_ENDPOINT routes to BUILDER agent', async () => {
    const coordinator = new SwarmCoordinator();
    const bridge = new CrossRealmExecutionBridge({ coordinator });

    const result = await bridge.executeAction({
      requestId: 'req_prov_001',
      originRealm: 'offer_engine',
      targetRealm: 'network_gateway',
      actionType: 'PROVISION_ENDPOINT',
      payload: { route: '/api/v1/offer/claim' },
      timestamp: Date.now(),
    });

    assert.strictEqual(result.requestId, 'req_prov_001');
    assert.strictEqual(result.success, true);
    assert.strictEqual(result.targetRealm, 'network_gateway');
    assert(result.resultingArtifactId !== undefined);
    assert.strictEqual(typeof result.auditHash, 'string');
    assert.strictEqual(bridge.getHistory().length, 1);
  });

  await runAsyncTest('3.2: Action TRIGGER_OFFER routes to economic offer logic', async () => {
    const coordinator = new SwarmCoordinator();
    const bridge = new CrossRealmExecutionBridge({ coordinator });

    const result = await bridge.executeAction({
      requestId: 'req_off_001',
      originRealm: 'telemetry_realm',
      targetRealm: 'offer_engine',
      actionType: 'TRIGGER_OFFER',
      payload: { urgency: 'HIGH' },
      timestamp: Date.now(),
    });

    assert.strictEqual(result.success, true);
    assert(result.resultingArtifactId !== undefined);
  });

  await runAsyncTest('3.3: Action SCALE_DEPLOYMENT routes to DISPATCHER agent', async () => {
    const coordinator = new SwarmCoordinator();
    const bridge = new CrossRealmExecutionBridge({ coordinator });

    const result = await bridge.executeAction({
      requestId: 'req_scale_001',
      originRealm: 'telemetry_realm',
      targetRealm: 'cloud_run',
      actionType: 'SCALE_DEPLOYMENT',
      payload: { instances: 5 },
      timestamp: Date.now(),
    });

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.targetRealm, 'cloud_run');
  });

  // ============================================================================
  // SECTION 4: Autonomous Microservice Synthesizer (MicroserviceForge)
  // ============================================================================
  console.log('--- Section 4: Autonomous Microservice Synthesizer ---');

  runTest('4.1: MicroserviceForge synthesizes production code, tests, and verifies integrity', () => {
    const forgeDir = path.join(testTempDir, 'forge_test');
    const forge = new MicroserviceForge({ outputDir: forgeDir });

    const spec = {
      serviceName: 'SovereignPaymentGateway',
      version: '1.0.0',
      realm: 'offer_engine',
      port: 8090,
      routes: [
        {
          method: 'POST',
          path: '/api/v1/checkout',
          handlerDescription: 'Processes sovereign cryptographic checkout tokens',
        },
        {
          method: 'GET',
          path: '/api/v1/receipt',
          handlerDescription: 'Queries immutable receipt by audit hash',
        },
      ],
      dependencies: ['express'],
    };

    const synthesized = forge.synthesize(spec);

    assert.strictEqual(typeof synthesized.serviceId, 'string');
    assert(synthesized.serviceId.startsWith('svc_'));
    assert.strictEqual(synthesized.verified, true);
    assert(synthesized.antigravScore >= 70);
    assert(fs.existsSync(synthesized.filePath));

    // Verify code contents
    const content = fs.readFileSync(synthesized.filePath, 'utf-8');
    assert(content.includes('SovereignPaymentGateway'));
    assert(content.includes('/health'));
    assert(content.includes('/metrics'));
    assert(content.includes('/api/v1/checkout'));
    assert(content.includes('/api/v1/receipt'));
  });

  // ============================================================================
  // SECTION 5: Autonomous Deployment Pipeline (DeployMatrix)
  // ============================================================================
  console.log('--- Section 5: Autonomous Deployment Pipeline ---');

  await runAsyncTest('5.1: DeployMatrix deploys verified service with canary verification', async () => {
    const deployLog = path.join(testTempDir, 'deploy_test.jsonl');
    const matrix = new DeployMatrix({ logFilePath: deployLog });

    const mockService = {
      serviceId: 'svc_test_001',
      spec: {
        serviceName: 'TelemetryRelay',
        version: '1.0.0',
        realm: 'telemetry_realm',
        port: 3001,
        routes: [],
        dependencies: [],
      },
      sourceCode: '// verified code',
      testCode: '// test code',
      filePath: '/tmp/test.ts',
      verified: true,
      antigravScore: 95,
      sha256Hash: 'hash_001',
      synthesizedAt: Date.now(),
    };

    const record = await matrix.deploy(mockService, 'target_local_daemon');

    assert.strictEqual(record.status, 'DEPLOYED');
    assert.strictEqual(record.healthChecked, true);
    assert.strictEqual(record.target.environment, 'local_daemon');
    assert(record.latencyMs > 0);
    assert(fs.existsSync(deployLog));
  });

  await runAsyncTest('5.2: DeployMatrix rejects service with ANTIGRAV score < 70 (Fail-Closed)', async () => {
    const matrix = new DeployMatrix();

    const lowScoreService = {
      serviceId: 'svc_low_score',
      spec: {
        serviceName: 'InsecureRelay',
        version: '0.1.0',
        realm: 'sandbox',
        port: 4000,
        routes: [],
        dependencies: [],
      },
      sourceCode: '// unverified',
      testCode: '',
      filePath: '/tmp/insecure.ts',
      verified: false,
      antigravScore: 50, // Below 70 threshold!
      sha256Hash: 'hash_bad',
      synthesizedAt: Date.now(),
    };

    const record = await matrix.deploy(lowScoreService, 'target_local_daemon');
    assert.strictEqual(record.status, 'FAILED_PREFLIGHT');
    assert.strictEqual(record.healthChecked, false);
  });

  await runAsyncTest('5.3: Atomic fail-closed rollback updates deployment status and audit lineage', async () => {
    const matrix = new DeployMatrix();

    const mockService = {
      serviceId: 'svc_rollback_test',
      spec: {
        serviceName: 'RollbackService',
        version: '1.0.0',
        realm: 'sovereign_core',
        port: 3005,
        routes: [],
        dependencies: [],
      },
      sourceCode: '// code',
      testCode: '',
      filePath: '/tmp/rollback.ts',
      verified: true,
      antigravScore: 92,
      sha256Hash: 'hash_rb',
      synthesizedAt: Date.now(),
    };

    const deployed = await matrix.deploy(mockService);
    assert.strictEqual(deployed.status, 'DEPLOYED');

    const rolledBack = await matrix.rollback(deployed.deployId);
    assert.strictEqual(rolledBack.status, 'ROLLED_BACK');
    assert.notStrictEqual(deployed.auditHash, rolledBack.auditHash);
  });

  // ============================================================================
  // SECTION 6: Multi-Realm Manifest & Coherence Verification
  // ============================================================================
  console.log('--- Section 6: Multi-Realm Manifest & Coherence ---');

  runTest('6.1: MULTI_AGENT_MATRIX_REALM_MANIFEST conforms to sovereign topology', () => {
    assert.strictEqual(MULTI_AGENT_MATRIX_REALM_MANIFEST.realmId, 'multi_agent_matrix');
    assert.strictEqual(MULTI_AGENT_MATRIX_REALM_MANIFEST.phase, 5);
    assert.strictEqual(MULTI_AGENT_MATRIX_REALM_MANIFEST.sovereignTier, 1);
    assert.strictEqual(MULTI_AGENT_MATRIX_REALM_MANIFEST.deterministic, true);
    assert.strictEqual(MULTI_AGENT_MATRIX_REALM_MANIFEST.zeroRandomness, true);
    assert.strictEqual(MULTI_AGENT_MATRIX_REALM_MANIFEST.bindings.length, 6);

    const boundRealms = MULTI_AGENT_MATRIX_REALM_MANIFEST.bindings.map((b) => b.realm);
    assert(boundRealms.includes('Swarm Coordinator Realm'));
    assert(boundRealms.includes('Cross-Realm Execution Realm'));
    assert(boundRealms.includes('Microservice Forge Realm'));
    assert(boundRealms.includes('Deploy Matrix Realm'));
    assert(boundRealms.includes('Audit Ledger Realm'));
    assert(boundRealms.includes('Sovereignty Realm'));
  });

  runTest('6.2: verifyMultiAgentRealmCoherence() confirms all 6 realms BOUND', () => {
    const coherence = verifyMultiAgentRealmCoherence();
    assert.strictEqual(coherence.coherent, true);
    assert.strictEqual(coherence.totalRealms, 6);
    assert.strictEqual(coherence.verifiedRealms.length, 6);
  });

  runTest('6.3: data/realm-map.json contains multi_agent_matrix with OPTIMAL binding', () => {
    const realmMapPath = path.join(rootDir, 'data', 'realm-map.json');
    const realmMap = JSON.parse(fs.readFileSync(realmMapPath, 'utf-8'));
    const realm = realmMap.realms.find((r) => r.realmId === 'multi_agent_matrix');
    assert(realm, 'multi_agent_matrix must be registered in data/realm-map.json');
    assert.strictEqual(realm.metadata.tier, 'Phase5');
    assert.strictEqual(realm.metadata.antiGravScore, 98);

    const adj = realmMap.adjacency.find((a) => a.from === 'multi_agent_matrix');
    assert(adj, 'multi_agent_matrix must have adjacency declared');
    assert(adj.to.includes('sovereign_core'));
  });

  runTest('6.4: RealmMap.json contains multi_agent_matrix with status BOUND and health OPTIMAL', () => {
    const realmMapJsonPath = path.join(rootDir, 'RealmMap.json');
    const realmMapJson = JSON.parse(fs.readFileSync(realmMapJsonPath, 'utf-8'));
    const realm = realmMapJson.realms.find((r) => r.id === 'multi_agent_matrix');
    assert(realm, 'multi_agent_matrix must be registered in RealmMap.json');
    assert.strictEqual(realm.status, 'BOUND');
    assert.strictEqual(realm.health, 'OPTIMAL');

    const topo = realmMapJson.topologyBindings.find((b) => b.id === 'bind_kernel_multi_agent_matrix');
    assert(topo, 'bind_kernel_multi_agent_matrix must be registered in topologyBindings');
    assert.strictEqual(topo.status, 'ACTIVE');
  });

  // ============================================================================
  // SECTION 7: Autonomous Swarm Orchestrator End-to-End
  // ============================================================================
  console.log('--- Section 7: Autonomous Swarm Orchestrator End-to-End ---');

  await runAsyncTest('7.1: AutonomousSwarmOrchestrator coordinates end-to-end task and microservice lifecycle', async () => {
    const orchDir = path.join(testTempDir, 'orch');
    if (!fs.existsSync(orchDir)) fs.mkdirSync(orchDir, { recursive: true });

    const orchestrator = new AutonomousSwarmOrchestrator({
      dataDir: orchDir,
      tickIntervalMs: 1000,
    });

    // 1. Submit tasks to swarm coordinator
    orchestrator.submitTask('BUILDER', 'Synthesize metric collector', 'telemetry_realm', { port: 9091 });

    // 2. Step tick
    const tickResult = await orchestrator.stepTick();
    assert(tickResult.tasksProcessed >= 1);
    assert.strictEqual(tickResult.swarmState.failedTaskCount, 0);

    // 3. Synthesize microservice
    const service = orchestrator.synthesizeService({
      serviceName: 'LiveOfferEndpoint',
      version: '1.0.0',
      realm: 'offer_engine',
      port: 9092,
      routes: [
        { method: 'GET', path: '/api/v1/offer/current', handlerDescription: 'Returns active offer state' },
      ],
      dependencies: ['express'],
    });
    assert.strictEqual(service.verified, true);

    // 4. Deploy microservice
    const deploy = await orchestrator.deployService(service, 'target_local_daemon');
    assert.strictEqual(deploy.status, 'DEPLOYED');

    orchestrator.stop();
  });

  // Summary
  console.log('\n========================================================');
  console.log(`Phase 5 Test Results: ${passedTests}/${totalTests} PASSED`);
  console.log('========================================================\n');

  if (passedTests !== totalTests) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Fatal error running Phase 5 test suite:', err);
  process.exit(1);
});

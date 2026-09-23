/**
 * ==============================================================================
 * PRIMORDIAOS PHASE 3: AUTONOMOUS OFFER ENGINE REGRESSION TEST SUITE
 * Validates deterministic OfferEngine rules, sovereign guardrails, idempotency,
 * 120s cooldown, SHA-256 state lineage, FunnelAgent broadcasts, and multi-realm binding.
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
console.log('⚡ PRIMORDIAOS PHASE 3: AUTONOMOUS OFFER ENGINE TESTS');
console.log('========================================================\n');

async function main() {
  // Determine module root: compiled dist or direct
  let modules;
  const distPath = path.join(rootDir, 'dist', 'src', 'phase3-orchestrator.js');
  const distRootPath = path.join(rootDir, 'dist', 'phase3-orchestrator.js');

  if (fs.existsSync(distPath)) {
    modules = await import(`file://${distPath.replace(/\\/g, '/')}`);
  } else if (fs.existsSync(distRootPath)) {
    modules = await import(`file://${distRootPath.replace(/\\/g, '/')}`);
  } else {
    throw new Error(`Compiled phase 3 orchestrator not found. Checked: ${distPath} and ${distRootPath}`);
  }

  const {
    OfferEngine,
    evaluateOffer,
    Guardrails,
    FunnelAgent,
    ExecutionBridge,
    TelemetryCollector,
    EconomicKernel,
    AutonomousOfferOrchestrator,
  } = modules;

  const testTempDir = path.join(rootDir, 'data', 'test_scratch_phase3');
  if (!fs.existsSync(testTempDir)) {
    fs.mkdirSync(testTempDir, { recursive: true });
  }

  // Helper baseline states
  const baseEconomicState = {
    timestampMs: 1773412000000,
    microWindow: {
      windowDurationSec: 60,
      currentViewers: 30,
      chatVelocityPerMin: 10,
      giftCoinsPerMin: 0,
      shareVelocityPerMin: 2,
      linkRequestVelocityPerMin: 0,
      funnelImpressions: 15,
      funnelClicks: 3,
      conversions: 1,
      clickThroughRate: 0.2,
      conversionRate: 0.33,
    },
    macroWindow: {
      windowDurationSec: 300,
      currentViewers: 30,
      chatVelocityPerMin: 8,
      giftCoinsPerMin: 0,
      shareVelocityPerMin: 2,
      linkRequestVelocityPerMin: 0,
      funnelImpressions: 60,
      funnelClicks: 12,
      conversions: 4,
      clickThroughRate: 0.2,
      conversionRate: 0.33,
    },
    activeFunnelId: 'funnel_alpha',
    currentCtaId: 'cta_standard_access',
    isSystemThrottled: false,
  };

  const baseFunnelState = {
    funnelId: 'funnel_alpha',
    activeCtaId: 'cta_standard_access',
    ctaLabel: 'Enter Primordial Origin',
    targetUrl: 'https://primordialorigin.com',
    activeTier: 'CORE',
    lastModifiedMs: 1773412000000,
    updateCount: 0,
  };

  // ── GROUP 1: Deterministic Rule Firing ─────────────────────────────────────────
  console.log('🧠 GROUP 1: Deterministic Offer Engine Rule Firing');

  const engine = new OfferEngine();

  runTest('RULE_SYSTEM_THROTTLE_OFFER fires on throttle flag with priority 1', () => {
    const throttledState = {
      ...baseEconomicState,
      isSystemThrottled: true,
    };

    const offer = engine.evaluate(throttledState, null, baseFunnelState);
    assert(offer !== null, 'Offer must be produced');
    assert.strictEqual(offer.ruleTriggered, 'RULE_SYSTEM_THROTTLE_OFFER');
    assert.strictEqual(offer.offerType, 'STATIC');
    assert.strictEqual(offer.price, 1);
    assert.strictEqual(offer.priority, 1);
    assert.strictEqual(offer.destinationUrl, 'https://primordialorigin.com/status');
    assert.strictEqual(offer.cooldownKey, 'OFFER_COOLDOWN_STATIC');
  });

  runTest('RULE_HIGH_INTENT_SURGE_OFFER fires on link request velocity surge', () => {
    const surgeState = {
      ...baseEconomicState,
      isSystemThrottled: false,
      microWindow: {
        ...baseEconomicState.microWindow,
        linkRequestVelocityPerMin: 3.5,
      },
    };

    const offer = engine.evaluate(surgeState, null, baseFunnelState);
    assert(offer !== null, 'Offer must be produced');
    assert.strictEqual(offer.ruleTriggered, 'RULE_HIGH_INTENT_SURGE_OFFER');
    assert.strictEqual(offer.offerType, 'DYNAMIC');
    assert.strictEqual(offer.price, 47);
    assert.strictEqual(offer.priority, 10);
    assert(offer.ctaText.includes('High-Intent Surge Pass'));
  });

  runTest('RULE_IDENTITY_BOUND_OFFER fires on gift coin volume >= 100/min', () => {
    const vipState = {
      ...baseEconomicState,
      isSystemThrottled: false,
      microWindow: {
        ...baseEconomicState.microWindow,
        linkRequestVelocityPerMin: 0,
        chatVelocityPerMin: 15,
        giftCoinsPerMin: 150,
      },
    };

    const offer = engine.evaluate(vipState, null, baseFunnelState);
    assert(offer !== null, 'Offer must be produced');
    assert.strictEqual(offer.ruleTriggered, 'RULE_IDENTITY_BOUND_OFFER');
    assert.strictEqual(offer.offerType, 'VIP');
    assert.strictEqual(offer.price, 297);
    assert.strictEqual(offer.priority, 15);
    assert(offer.destinationUrl.includes('vip'));
  });

  runTest('RULE_CONVERSION_RECOVERY_OFFER fires on conversion stagnation', () => {
    const recoveryState = {
      ...baseEconomicState,
      isSystemThrottled: false,
      microWindow: {
        ...baseEconomicState.microWindow,
        linkRequestVelocityPerMin: 0,
        chatVelocityPerMin: 5,
        giftCoinsPerMin: 0,
      },
      macroWindow: {
        ...baseEconomicState.macroWindow,
        currentViewers: 40,
        funnelImpressions: 50,
        conversions: 0, // Zero conversions
      },
    };

    const offer = engine.evaluate(recoveryState, null, baseFunnelState);
    assert(offer !== null, 'Offer must be produced');
    assert.strictEqual(offer.ruleTriggered, 'RULE_CONVERSION_RECOVERY_OFFER');
    assert.strictEqual(offer.offerType, 'RECOVERY');
    assert.strictEqual(offer.price, 9);
    assert.strictEqual(offer.priority, 25);
    assert(offer.destinationUrl.includes('recovery'));
  });

  runTest('RULE_DYNAMIC_PRICE_ADJUST computes deterministic demand-scaled pricing', () => {
    const normalState = {
      ...baseEconomicState,
      isSystemThrottled: false,
      microWindow: {
        ...baseEconomicState.microWindow,
        currentViewers: 100,
        linkRequestVelocityPerMin: 0,
        chatVelocityPerMin: 10,
        giftCoinsPerMin: 0,
        clickThroughRate: 0.25,
      },
      macroWindow: {
        ...baseEconomicState.macroWindow,
        currentViewers: 100,
        conversions: 5,
      },
    };

    const offer = engine.evaluate(normalState, null, baseFunnelState);
    assert(offer !== null, 'Offer must be produced');
    assert.strictEqual(offer.ruleTriggered, 'RULE_DYNAMIC_PRICE_ADJUST');
    assert.strictEqual(offer.offerType, 'DYNAMIC');
    // Base 49 + 50 (100 * 0.5) + 20 (CTR >= 0.2) = 119
    assert.strictEqual(offer.price, 119);
    assert(offer.destinationUrl.includes('price=119'));
  });

  runTest('Pure function zero-randomness: identical inputs produce identical outputs across 100 iterations', () => {
    const results = [];
    for (let i = 0; i < 100; i++) {
      results.push(evaluateOffer(baseEconomicState, null, baseFunnelState));
    }

    const first = JSON.stringify(results[0]);
    for (let i = 1; i < 100; i++) {
      assert.strictEqual(JSON.stringify(results[i]), first, `Mismatch on iteration ${i}`);
    }
  });

  // ── GROUP 2: Sovereign Guardrails Enforcement ─────────────────────────────────
  console.log('\n🛡️ GROUP 2: Sovereign Guardrails Enforcement (Bounds, Cooldown, Whitelist, Idempotency)');

  const guardrails = new Guardrails({
    minActionCooldownSec: 90,
    maxDecisionsPerHour: 20,
    minOfferCooldownSec: 120,
    minPriceFloorUsd: 1,
    maxPriceCeilingUsd: 999,
    allowedUrlDomains: ['primordialorigin.com', 'moneyplughub.com'],
  });

  const validOffer = {
    id: 'off_valid_001',
    decisionId: 'off_valid_001',
    ts: Date.now(),
    timestampMs: Date.now(),
    ruleTriggered: 'RULE_DYNAMIC_PRICE_ADJUST',
    action: 'OFFER_DECISION',
    priority: 50,
    offerType: 'DYNAMIC',
    price: 49,
    ctaText: '⚡ UNLOCK PRIMORDIA PROTOCOL ($49)',
    cooldownKey: 'OFFER_COOLDOWN_DYNAMIC',
    idempotencyKey: 'sha256_idemp_001',
    destinationUrl: 'https://primordialorigin.com/offer?price=49',
    reason: 'Dynamic price check',
    rationale: 'Dynamic price check',
    payload: { targetUrl: 'https://primordialorigin.com/offer?price=49' },
  };

  runTest('Guardrails approve valid sovereign offer on initial run', () => {
    const res = guardrails.validateOffer(validOffer);
    assert.strictEqual(res.allowed, true);
    guardrails.commitOffer(validOffer);
  });

  runTest('Guardrails block duplicate offer with identical SHA-256 idempotency key', () => {
    const res = guardrails.validateOffer(validOffer);
    assert.strictEqual(res.allowed, false);
    assert.strictEqual(res.rejectionCode, 'IDEMPOTENT_DUPLICATE');
  });

  runTest('Guardrails enforce 120-second offer cooldown on same cooldownKey', () => {
    const newOffer = {
      ...validOffer,
      id: 'off_valid_002',
      idempotencyKey: 'sha256_idemp_002',
    };
    const res = guardrails.validateOffer(newOffer);
    assert.strictEqual(res.allowed, false);
    assert.strictEqual(res.rejectionCode, 'COOLDOWN_ACTIVE');
    assert(res.rejectionReason.includes('120s cooldown'));
  });

  runTest('Guardrails block unsafe price floor ($0 or negative)', () => {
    guardrails.setOfferTimestampForTest('OFFER_COOLDOWN_DYNAMIC', Date.now() - 200000);

    const cheapOffer = {
      ...validOffer,
      id: 'off_cheap',
      idempotencyKey: 'sha256_idemp_cheap',
      price: 0,
    };
    const res = guardrails.validateOffer(cheapOffer);
    assert.strictEqual(res.allowed, false);
    assert.strictEqual(res.rejectionCode, 'UNSAFE_PRICE_RANGE');
  });

  runTest('Guardrails block unsafe price ceiling (> $999)', () => {
    const exorbitantOffer = {
      ...validOffer,
      id: 'off_exorbitant',
      idempotencyKey: 'sha256_idemp_exorbitant',
      price: 1500,
    };
    const res = guardrails.validateOffer(exorbitantOffer);
    assert.strictEqual(res.allowed, false);
    assert.strictEqual(res.rejectionCode, 'UNSAFE_PRICE_RANGE');
  });

  runTest('Guardrails block unauthorized domains on offer destinationUrl', () => {
    const phishingOffer = {
      ...validOffer,
      id: 'off_phish',
      idempotencyKey: 'sha256_idemp_phish',
      destinationUrl: 'https://drainer-phishing-scam.com/steal',
    };
    const res = guardrails.validateOffer(phishingOffer);
    assert.strictEqual(res.allowed, false);
    assert.strictEqual(res.rejectionCode, 'UNAUTHORIZED_DOMAIN');
  });

  // ── GROUP 3: FunnelAgent Extensions & Broadcasts ──────────────────────────────
  console.log('\n🔔 GROUP 3: FunnelAgent Offer State Mutation & Event Broadcasting');

  const funnelAgent = new FunnelAgent();
  let lastBroadcastEvent = null;
  let lastBroadcastState = null;

  const unsubscribeOffers = funnelAgent.subscribeOfferEvents((event, state) => {
    lastBroadcastEvent = event;
    lastBroadcastState = state;
  });

  runTest('applyOfferState mutates activeCtaId, ctaLabel, price, and emits OFFER_UPDATED', () => {
    const updatedState = funnelAgent.applyOfferState({
      activeOffer: validOffer,
      lastOfferTs: validOffer.ts,
    });

    assert.strictEqual(updatedState.activeOfferPrice, 49);
    assert.strictEqual(updatedState.ctaLabel, validOffer.ctaText);
    assert.strictEqual(updatedState.targetUrl, validOffer.destinationUrl);
    assert.strictEqual(lastBroadcastEvent, 'OFFER_UPDATED');
    assert.strictEqual(lastBroadcastState.activeOffer.id, validOffer.id);
  });

  runTest('applyOfferState with null offer clears offer price and emits OFFER_CLEARED', () => {
    const clearedState = funnelAgent.applyOfferState({
      activeOffer: null,
      lastOfferTs: Date.now(),
    });

    assert.strictEqual(clearedState.activeOfferPrice, undefined);
    assert.strictEqual(lastBroadcastEvent, 'OFFER_CLEARED');
    assert.strictEqual(lastBroadcastState.activeOffer, null);
  });

  unsubscribeOffers();

  // ── GROUP 4: ExecutionBridge & Chained Audit Lineage ──────────────────────────
  console.log('\n🔗 GROUP 4: ExecutionBridge Chained Audit Lineage (stateHashBefore/stateHashAfter)');

  const testAuditFile = path.join(testTempDir, 'test_audit_phase3.jsonl');
  const testOfferLog = path.join(testTempDir, 'test_offer_production.jsonl');
  const testSnapshot = path.join(testTempDir, 'snapshots', 'offer_state.json');

  if (fs.existsSync(testAuditFile)) fs.unlinkSync(testAuditFile);
  if (fs.existsSync(testOfferLog)) fs.unlinkSync(testOfferLog);
  if (fs.existsSync(testSnapshot)) fs.unlinkSync(testSnapshot);

  const testTelemetryFile = path.join(testTempDir, 'telemetry.jsonl');
  const telemetry = new TelemetryCollector(testTelemetryFile);
  const kernel = new EconomicKernel();
  const testGuardrails = new Guardrails({
    minActionCooldownSec: 90,
    maxDecisionsPerHour: 30,
    minOfferCooldownSec: 120,
    allowedUrlDomains: ['primordialorigin.com', 'moneyplughub.com'],
  });
  const testFunnel = new FunnelAgent();

  const bridge = new ExecutionBridge(
    telemetry,
    kernel,
    testGuardrails,
    testFunnel,
    testAuditFile,
    {
      offerEngine: engine,
      offerLogPath: testOfferLog,
      offerSnapshotPath: testSnapshot,
    }
  );

  runTest('ExecutionBridge evaluateOfferTick executes offer, mutates funnel, and logs OFFER_DECISION', () => {
    // Record link requests to trigger surge pass
    const now = Date.now();
    for (let i = 0; i < 4; i++) {
      telemetry.recordEvent({
        eventId: `ev_link_${i}`,
        sequence: i + 1,
        platform: 'tiktok_live',
        type: 'CHAT_MESSAGE',
        timestampMs: now,
        payload: { intent: 'LINK_REQUEST' },
      });
    }

    const res = bridge.evaluateOfferTick();
    assert.strictEqual(res.evaluated, 1);
    assert.strictEqual(res.applied, 1);
    assert.strictEqual(res.suppressed, 0);
    assert.strictEqual(res.decision.offerType, 'DYNAMIC');
    assert.strictEqual(res.decision.price, 47);

    // Verify FunnelAgent CTA was updated
    const fState = testFunnel.getState();
    assert.strictEqual(fState.activeOfferPrice, 47);
    assert.strictEqual(fState.ctaLabel, res.decision.ctaText);

    // Verify audit entry
    assert(fs.existsSync(testAuditFile), 'Audit ledger must be written');
    const auditLines = fs.readFileSync(testAuditFile, 'utf8').trim().split('\n');
    const auditEntry = JSON.parse(auditLines[auditLines.length - 1]);

    assert.strictEqual(auditEntry.type, 'OFFER_DECISION');
    assert.strictEqual(auditEntry.status, 'APPLIED');
    assert(auditEntry.stateHashBefore !== undefined, 'Must record stateHashBefore');
    assert(auditEntry.stateHashAfter !== undefined, 'Must record stateHashAfter');
    assert.notStrictEqual(auditEntry.stateHashBefore, auditEntry.stateHashAfter);
    assert.strictEqual(auditEntry.offerDecision.id, res.decision.id);

    // Verify offer_production.jsonl
    assert(fs.existsSync(testOfferLog), 'Offer production log must exist');
    const offerLines = fs.readFileSync(testOfferLog, 'utf8').trim().split('\n');
    const offerRecord = JSON.parse(offerLines[0]);
    assert.strictEqual(offerRecord.status, 'APPLIED');
    assert.strictEqual(offerRecord.offerDecision.price, 47);

    // Verify snapshot
    assert(fs.existsSync(testSnapshot), 'Offer state snapshot must exist');
    const snap = JSON.parse(fs.readFileSync(testSnapshot, 'utf8'));
    assert.strictEqual(snap.activeOffer.price, 47);
  });

  runTest('ExecutionBridge evaluateOfferTick suppresses rapid-fire duplicate via guardrail', () => {
    const res = bridge.evaluateOfferTick();
    assert.strictEqual(res.evaluated, 1);
    assert.strictEqual(res.applied, 0);
    assert.strictEqual(res.suppressed, 1);

    // Check suppressed audit record
    const auditLines = fs.readFileSync(testAuditFile, 'utf8').trim().split('\n');
    const lastEntry = JSON.parse(auditLines[auditLines.length - 1]);
    assert.strictEqual(lastEntry.type, 'OFFER_DECISION');
    assert.strictEqual(lastEntry.status, 'SUPPRESSED_BY_GUARDRAIL');
    assert.strictEqual(lastEntry.stateHashBefore, lastEntry.stateHashAfter);
  });

  // ── GROUP 5: Master Orchestrator Integration ──────────────────────────────────
  console.log('\n👑 GROUP 5: AutonomousOfferOrchestrator Integration');

  const orchestrator = new AutonomousOfferOrchestrator({
    dataDir: testTempDir,
    tickIntervalMs: 1000,
  });

  runTest('AutonomousOfferOrchestrator initializes all Phase 2 and Phase 3 subsystems', () => {
    assert(orchestrator.telemetry !== undefined);
    assert(orchestrator.kernel !== undefined);
    assert(orchestrator.offerEngine !== undefined);
    assert(orchestrator.guardrails !== undefined);
    assert(orchestrator.funnel !== undefined);
    assert(orchestrator.bridge !== undefined);
  });

  runTest('AutonomousOfferOrchestrator stepTick executes pipeline cleanly', () => {
    const tickResult = orchestrator.stepTick();
    assert(typeof tickResult.evaluated === 'number');
  });

  orchestrator.stop();
  telemetry.close();
  bridge.close();

  // ── GROUP 6: Multi-Realm Coherence Binding ─────────────────────────────────────
  console.log('\n🌐 GROUP 6: Multi-Realm Coherence & Topology Binding');

  const realmManifestPath = path.join(rootDir, 'dist', 'src', 'realms', 'offerEngineRealm.js');
  const realmManifestRootPath = path.join(rootDir, 'dist', 'realms', 'offerEngineRealm.js');

  let realmModule;
  if (fs.existsSync(realmManifestPath)) {
    realmModule = await import(`file://${realmManifestPath.replace(/\\/g, '/')}`);
  } else if (fs.existsSync(realmManifestRootPath)) {
    realmModule = await import(`file://${realmManifestRootPath.replace(/\\/g, '/')}`);
  }

  if (realmModule) {
    runTest('Verifies deterministic multi-realm coherence across 5 bound realms', () => {
      const { verifyMultiRealmCoherence, OFFER_ENGINE_REALM_MANIFEST } = realmModule;
      const coherence = verifyMultiRealmCoherence();
      assert.strictEqual(coherence.coherent, true);
      assert.strictEqual(coherence.verifiedRealms.length, 5);
      assert.strictEqual(OFFER_ENGINE_REALM_MANIFEST.deterministic, true);
      assert.strictEqual(OFFER_ENGINE_REALM_MANIFEST.zeroRandomness, true);
    });
  }

  runTest('RealmMap.json contains offer_engine with status BOUND and health OPTIMAL', () => {
    const mapPath = path.join(rootDir, 'RealmMap.json');
    const raw = fs.readFileSync(mapPath, 'utf8');
    const map = JSON.parse(raw);

    const offerRealm = map.realms.find((r) => r.id === 'offer_engine');
    assert(offerRealm !== undefined, 'offer_engine must exist in RealmMap.json');
    assert.strictEqual(offerRealm.status, 'BOUND');
    assert.strictEqual(offerRealm.health, 'OPTIMAL');
  });

  console.log('\n========================================================');
  console.log(`🏁 TEST RESULTS: ${passedTests} / ${totalTests} PASSED`);
  console.log('========================================================\n');

  if (passedTests !== totalTests) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Fatal Phase 3 test runner error:', err);
  process.exit(1);
});

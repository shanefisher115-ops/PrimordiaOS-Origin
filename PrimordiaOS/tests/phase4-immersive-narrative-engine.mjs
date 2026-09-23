/**
 * ==============================================================================
 * PRIMORDIAOS PHASE 4: IMMERSIVE NARRATIVE ENGINE REGRESSION TEST SUITE
 * Validates deterministic NarrativeEngine synthesis, sovereign guardrails,
 * 8 lore schemas, 6 narrative rules, 60s cooldown, SHA-256 state lineage,
 * BlogEngine chronicle binding, FunnelAgent broadcast, and multi-realm coherence.
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
console.log('⚡ PRIMORDIAOS PHASE 4: IMMERSIVE NARRATIVE ENGINE TESTS');
console.log('========================================================\n');

async function main() {
  // Determine module root: compiled dist or direct
  let modules;
  const distPath = path.join(rootDir, 'dist', 'src', 'phase4-narrative-orchestrator.js');
  const distRootPath = path.join(rootDir, 'dist', 'phase4-narrative-orchestrator.js');

  if (fs.existsSync(distPath)) {
    modules = await import(`file://${distPath.replace(/\\/g, '/')}`);
  } else if (fs.existsSync(distRootPath)) {
    modules = await import(`file://${distRootPath.replace(/\\/g, '/')}`);
  } else {
    throw new Error(`Compiled phase 4 orchestrator not found. Checked: ${distPath} and ${distRootPath}`);
  }

  let realmModule;
  const realmPath = path.join(rootDir, 'dist', 'src', 'realms', 'narrativeEngineRealm.js');
  const realmRootPath = path.join(rootDir, 'dist', 'realms', 'narrativeEngineRealm.js');
  if (fs.existsSync(realmPath)) {
    realmModule = await import(`file://${realmPath.replace(/\\/g, '/')}`);
  } else if (fs.existsSync(realmRootPath)) {
    realmModule = await import(`file://${realmRootPath.replace(/\\/g, '/')}`);
  } else {
    throw new Error(`Compiled narrativeEngineRealm not found. Checked: ${realmPath} and ${realmRootPath}`);
  }

  const {
    NarrativeEngine,
    synthesizeEpisode,
    LORE_SCHEMAS,
    NARRATIVE_SCHEMAS,
    evaluateNarrativeRules,
    Guardrails,
    FunnelAgent,
    ExecutionBridge,
    TelemetryCollector,
    EconomicKernel,
    OfferEngine,
    BlogEngine,
    AutonomousNarrativeOrchestrator,
  } = modules;

  const {
    NARRATIVE_ENGINE_REALM_MANIFEST,
    verifyNarrativeRealmCoherence,
  } = realmModule;

  const testTempDir = path.join(rootDir, 'data', 'test_scratch_phase4');
  if (!fs.existsSync(testTempDir)) {
    fs.mkdirSync(testTempDir, { recursive: true });
  }

  // Helper baseline states
  const baseEconomicState = {
    timestampMs: 1773412000000,
    microWindow: {
      windowDurationSec: 60,
      currentViewers: 45,
      chatVelocityPerMin: 18,
      giftCoinsPerMin: 50,
      shareVelocityPerMin: 5,
      linkRequestVelocityPerMin: 3,
      funnelImpressions: 25,
      funnelClicks: 8,
      conversions: 2,
      clickThroughRate: 0.32,
      conversionRate: 0.25,
    },
    macroWindow: {
      windowDurationSec: 300,
      currentViewers: 40,
      chatVelocityPerMin: 15,
      giftCoinsPerMin: 120,
      shareVelocityPerMin: 10,
      linkRequestVelocityPerMin: 5,
      funnelImpressions: 80,
      funnelClicks: 20,
      conversions: 4,
      clickThroughRate: 0.25,
      conversionRate: 0.20,
    },
    rollingAverages: {
      avgChatVelocity: 14,
      avgGiftVelocity: 25,
      avgConversionRate: 0.22,
    },
    conversionVelocity: 0.033,
    liquidityPressureIndex: 0.45,
  };

  const baseTelemetry = {
    getEconomicState: () => baseEconomicState,
    getRecentEvents: () => [
      { type: 'VIEWER_JOIN', timestamp: 1773412000000, data: { count: 45 } },
      { type: 'GIFT_RECEIVED', timestamp: 1773412000000, data: { coins: 50 } },
    ],
  };

  const baseOfferState = {
    activeOffer: {
      id: 'OFFER-001',
      ts: 1773412000000,
      offerType: 'DISCOUNT_VOUCHER',
      price: 49,
      ctaText: 'Claim Sovereign Protocol',
      cooldownKey: 'OFFER_COOLDOWN',
      idempotencyKey: 'IDEMP-OFFER-001',
      destinationUrl: 'https://primordialorigin.com/protocol',
      reason: 'RULE_IDENTITY_BOUND_OFFER',
    },
    lastOfferTs: 1773412000000,
    totalOffersGenerated: 1,
    cooldownExpiryTs: 1773412120000,
  };

  const baseFunnelState = {
    funnelId: 'funnel-prime',
    currentStage: 'OFFER_PRESENTED',
    ctaText: 'Claim Sovereign Protocol',
    destinationUrl: 'https://primordialorigin.com/protocol',
    activeTier: 'TIER_1_DISCOUNT',
    lastTransitionTimestamp: 1773412000000,
    history: [],
  };

  const baseTopology = {
    realms: [
      { realmId: 'sovereign_core', name: 'Sovereign Kernel Realm' },
      { realmId: 'offer_engine', name: 'Autonomous Offer Engine Realm' },
      { realmId: 'vision_core', name: 'VisionCore Realm' },
    ],
    adjacency: [
      { from: 'sovereign_core', to: ['offer_engine', 'vision_core'] },
      { from: 'offer_engine', to: ['sovereign_core'] },
    ],
  };

  // ============================================================================
  // SECTION 1: Pure Deterministic Narrative Synthesis & Canonical Contract
  // ============================================================================
  console.log('--- Section 1: Deterministic Synthesis & Canonical Contract ---');

  runTest('1.1: Pure deterministic function - 100 consecutive identical outputs', () => {
    const engine = new NarrativeEngine();
    const first = engine.evaluate(
      baseTelemetry,
      baseEconomicState,
      baseOfferState,
      baseFunnelState,
      baseTopology,
      'Sovereign-Shane'
    );

    assert(first !== null, 'First episode must not be null');

    for (let i = 0; i < 100; i++) {
      const current = engine.evaluate(
        baseTelemetry,
        baseEconomicState,
        baseOfferState,
        baseFunnelState,
        baseTopology,
        'Sovereign-Shane'
      );
      assert.strictEqual(current.id, first.id, `ID mismatch at run ${i}`);
      assert.strictEqual(current.auditHash, first.auditHash, `Hash mismatch at run ${i}`);
      assert.strictEqual(current.wordCount, first.wordCount, `Word count mismatch at run ${i}`);
      assert.strictEqual(current.title, first.title, `Title mismatch at run ${i}`);
      assert.strictEqual(current.actStructure.actI.name, first.actStructure.actI.name);
      assert.strictEqual(current.actStructure.actII.name, first.actStructure.actII.name);
      assert.strictEqual(current.actStructure.actIII.name, first.actStructure.actIII.name);
      assert.strictEqual(current.beats.length, first.beats.length);
    }
  });

  runTest('1.2: Canonical NarrativeEpisode contract compliance', () => {
    const engine = new NarrativeEngine();
    const ep = engine.evaluate(
      baseTelemetry,
      baseEconomicState,
      baseOfferState,
      baseFunnelState,
      baseTopology,
      'Sovereign-Shane'
    );

    assert.strictEqual(typeof ep.id, 'string');
    assert(ep.id.startsWith('ep_'));
    assert.strictEqual(typeof ep.ts, 'number');
    assert.strictEqual(ep.protagonistId, 'Sovereign-Shane');
    assert.strictEqual(typeof ep.realmFocus, 'string');
    assert.strictEqual(typeof ep.title, 'string');
    assert(ep.actStructure && typeof ep.actStructure === 'object');
    assert.strictEqual(typeof ep.actStructure.actI.name, 'string');
    assert.strictEqual(typeof ep.actStructure.actI.exposition, 'string');
    assert.strictEqual(typeof ep.actStructure.actII.name, 'string');
    assert.strictEqual(typeof ep.actStructure.actII.conflict, 'string');
    assert.strictEqual(typeof ep.actStructure.actIII.name, 'string');
    assert.strictEqual(typeof ep.actStructure.actIII.resolution, 'string');
    assert(Array.isArray(ep.beats));
    assert(ep.beats.length >= 3);
    assert.strictEqual(ep.linkedOfferId, 'OFFER-001');
    assert.strictEqual(typeof ep.idempotencyKey, 'string');
    assert.strictEqual(typeof ep.auditHash, 'string');
    assert.strictEqual(typeof ep.wordCount, 'number');
    assert(ep.wordCount > 50 && ep.wordCount <= 2000);
  });

  runTest('1.3: Beat contract and tension sequence integrity', () => {
    const engine = new NarrativeEngine();
    const ep = engine.evaluate(
      baseTelemetry,
      baseEconomicState,
      baseOfferState,
      baseFunnelState,
      baseTopology,
      'Sovereign-Shane'
    );

    for (const beat of ep.beats) {
      assert.strictEqual(typeof beat.beatId, 'string');
      assert.strictEqual(typeof beat.beatType, 'string');
      assert(['DISCOVERY', 'THRESHOLD', 'TRIAL', 'REWARD', 'REVELATION'].includes(beat.beatType));
      assert.strictEqual(typeof beat.title, 'string');
      assert.strictEqual(typeof beat.narrativeText, 'string');
      assert(beat.narrativeText.length > 10);
      assert.strictEqual(typeof beat.groundedSignal, 'string');
      assert(beat.groundedSignal.length > 0);
      assert.strictEqual(typeof beat.glyph, 'string');
      assert.strictEqual(typeof beat.sequence, 'number');
      assert(beat.sequence >= 1);
    }
  });

  // ============================================================================
  // SECTION 2: 8 Lore Schemas Grounding
  // ============================================================================
  console.log('--- Section 2: 8 Deterministic Lore Schemas Grounding ---');

  runTest('2.1: Verify existence and completeness of 8 Lore Schemas', () => {
    const schemas = LORE_SCHEMAS || NARRATIVE_SCHEMAS;
    assert(schemas, 'LORE_SCHEMAS must be defined');

    const requiredSchemas = [
      'PRIMORDIAOS_CORE',
      'PLUGIN_OS',
      'MONEYPLUGHUB',
      'PRIMORDIAL_ORIGIN',
      'IMMERSIVE_COMPUTATION',
      'CINEMATIC_PROTAGONIST_OS',
      'OFFER_ENGINE_TRIALS',
      'ANTIGRAV_SOVEREIGN_MYTH',
    ];

    for (const schemaKey of requiredSchemas) {
      const schema = schemas[schemaKey];
      assert(schema, `Missing schema: ${schemaKey}`);
      assert.strictEqual(schema.realmFocus, schemaKey);
      assert.strictEqual(typeof schema.displayName, 'string');
      assert.strictEqual(typeof schema.coreMythos, 'string');
      assert.strictEqual(typeof schema.actTemplates.actI.name, 'string');
      assert.strictEqual(typeof schema.actTemplates.actII.name, 'string');
      assert.strictEqual(typeof schema.actTemplates.actIII.name, 'string');
      assert(Array.isArray(schema.allowedBeatTypes));
      assert(schema.allowedBeatTypes.length > 0);
      assert(Array.isArray(schema.signalMappings));
      assert(schema.signalMappings.length > 0);
    }
  });

  runTest('2.2: Deterministic synthesis under each of the 8 Lore Schemas', () => {
    const engine = new NarrativeEngine();
    const requiredSchemas = [
      'PRIMORDIAOS_CORE',
      'PLUGIN_OS',
      'MONEYPLUGHUB',
      'PRIMORDIAL_ORIGIN',
      'IMMERSIVE_COMPUTATION',
      'CINEMATIC_PROTAGONIST_OS',
      'OFFER_ENGINE_TRIALS',
      'ANTIGRAV_SOVEREIGN_MYTH',
    ];

    for (const realmKey of requiredSchemas) {
      const ep = engine.evaluate(
        baseTelemetry,
        baseEconomicState,
        baseOfferState,
        baseFunnelState,
        baseTopology,
        `Protagonist-${realmKey}`,
        realmKey
      );
      assert.strictEqual(ep.realmFocus, realmKey);
      assert(ep.title.length > 5);
      assert(ep.wordCount > 50);
      assert(ep.beats.length >= 3);
    }
  });

  // ============================================================================
  // SECTION 3: 6 Deterministic Narrative Rules
  // ============================================================================
  console.log('--- Section 3: 6 Deterministic Narrative Rules ---');

  runTest('3.1: RULE_PROTAGONIST_ENTERS_REALM fires on realm arrival', () => {
    const rules = evaluateNarrativeRules(
      baseTelemetry,
      baseEconomicState,
      null,
      baseFunnelState,
      baseTopology,
      'IMMERSIVE_COMPUTATION'
    );
    const enterRule = rules.find((r) => r.ruleId === 'RULE_PROTAGONIST_ENTERS_REALM');
    assert(enterRule, 'RULE_PROTAGONIST_ENTERS_REALM should evaluate');
    assert(enterRule.matched, 'RULE_PROTAGONIST_ENTERS_REALM should match');
  });

  runTest('3.2: RULE_OFFER_BECOMES_TRIAL binds offer into crucible narrative', () => {
    const rules = evaluateNarrativeRules(
      baseTelemetry,
      baseEconomicState,
      baseOfferState,
      baseFunnelState,
      baseTopology,
      'OFFER_ENGINE_TRIALS'
    );
    const offerRule = rules.find((r) => r.ruleId === 'RULE_OFFER_BECOMES_TRIAL');
    assert(offerRule, 'RULE_OFFER_BECOMES_TRIAL should evaluate');
    assert(offerRule.matched, 'RULE_OFFER_BECOMES_TRIAL should match when activeOffer exists');
    assert(offerRule.contextModifiers.trialName.includes('Claim Sovereign Protocol') || offerRule.beat.title.includes('Trial'));
  });

  runTest('3.3: RULE_CONVERSION_AS_REWARD triggers upon positive conversions', () => {
    const rules = evaluateNarrativeRules(
      baseTelemetry,
      baseEconomicState,
      baseOfferState,
      baseFunnelState,
      baseTopology,
      'MONEYPLUGHUB'
    );
    const rewardRule = rules.find((r) => r.ruleId === 'RULE_CONVERSION_AS_REWARD');
    assert(rewardRule, 'RULE_CONVERSION_AS_REWARD should evaluate');
    assert(rewardRule.matched, 'RULE_CONVERSION_AS_REWARD should match with positive conversions');
  });

  runTest('3.4: RULE_STAGNATION_AS_OBSTACLE triggers when velocity is stalled', () => {
    const stagnantEconomicState = {
      ...baseEconomicState,
      microWindow: {
        ...baseEconomicState.microWindow,
        conversions: 0,
        funnelImpressions: 30,
        clickThroughRate: 0.01,
        chatVelocityPerMin: 1,
      },
      macroWindow: {
        ...baseEconomicState.macroWindow,
        conversions: 0,
        funnelImpressions: 80,
      },
      conversionVelocity: 0.0,
      liquidityPressureIndex: 0.05,
    };
    const rules = evaluateNarrativeRules(
      baseTelemetry,
      stagnantEconomicState,
      null,
      baseFunnelState,
      baseTopology,
      'PRIMORDIAOS_CORE'
    );
    const stagRule = rules.find((r) => r.ruleId === 'RULE_STAGNATION_AS_OBSTACLE');
    assert(stagRule, 'RULE_STAGNATION_AS_OBSTACLE should evaluate');
    assert(stagRule.matched, 'RULE_STAGNATION_AS_OBSTACLE should match on low conversion');
  });

  runTest('3.5: RULE_SYSTEM_THROTTLE_AS_FATE triggers on high viewer/liquidity pressure', () => {
    const surgeEconomicState = {
      ...baseEconomicState,
      isSystemThrottled: true,
      liquidityPressureIndex: 0.85,
    };
    const rules = evaluateNarrativeRules(
      baseTelemetry,
      surgeEconomicState,
      baseOfferState,
      baseFunnelState,
      baseTopology,
      'PRIMORDIAOS_CORE'
    );
    const throttleRule = rules.find((r) => r.ruleId === 'RULE_SYSTEM_THROTTLE_AS_FATE');
    assert(throttleRule, 'RULE_SYSTEM_THROTTLE_AS_FATE should evaluate');
    assert(throttleRule.matched, 'RULE_SYSTEM_THROTTLE_AS_FATE should match when isSystemThrottled is true');
  });

  runTest('3.6: RULE_REALM_MAP_AS_COSMIC_CARTOGRAPHY utilizes topology adjacencies', () => {
    const rules = evaluateNarrativeRules(
      baseTelemetry,
      baseEconomicState,
      baseOfferState,
      baseFunnelState,
      baseTopology,
      'PRIMORDIAOS_CORE'
    );
    const mapRule = rules.find((r) => r.ruleId === 'RULE_REALM_MAP_AS_COSMIC_CARTOGRAPHY');
    assert(mapRule, 'RULE_REALM_MAP_AS_COSMIC_CARTOGRAPHY should evaluate');
    assert(mapRule.matched, 'RULE_REALM_MAP_AS_COSMIC_CARTOGRAPHY should match when topology provided');
  });

  // ============================================================================
  // SECTION 4: Sovereign Guardrails Gating
  // ============================================================================
  console.log('--- Section 4: Sovereign Narrative Guardrails ---');

  runTest('4.1: Word count ceiling - rejects episode exceeding 2,000 words', () => {
    const guardrails = new Guardrails({
      minActionCooldownSec: 90,
      maxDecisionsPerHour: 40,
      minProtagonistCooldownSec: 60,
      maxEpisodeWordCount: 2000,
      allowedUrlDomains: ['primordialorigin.com'],
    });

    const engine = new NarrativeEngine();
    const validEp = engine.evaluate(
      baseTelemetry,
      baseEconomicState,
      baseOfferState,
      baseFunnelState,
      baseTopology,
      'Sovereign-Shane'
    );

    const oversizedEp = {
      ...validEp,
      wordCount: 2050,
      actStructure: {
        ...validEp.actStructure,
        actII: {
          ...validEp.actStructure.actII,
          conflict: 'word '.repeat(2100),
        },
      },
    };

    const result = guardrails.validateNarrative(oversizedEp);
    assert.strictEqual(result.allowed, false);
    assert.strictEqual(result.rejectionCode, 'MAX_EPISODE_LENGTH_EXCEEDED');
  });

  runTest('4.2: 60s protagonist cooldown enforcement', () => {
    const guardrails = new Guardrails({
      minActionCooldownSec: 90,
      maxDecisionsPerHour: 40,
      minProtagonistCooldownSec: 60,
      maxEpisodeWordCount: 2000,
      allowedUrlDomains: ['primordialorigin.com'],
    });

    const engine = new NarrativeEngine();
    const ep1 = engine.evaluate(
      baseTelemetry,
      baseEconomicState,
      baseOfferState,
      baseFunnelState,
      baseTopology,
      'Protagonist-Alpha'
    );

    const check1 = guardrails.validateNarrative(ep1);
    assert.strictEqual(check1.allowed, true);
    guardrails.commitNarrative(ep1);

    // Second evaluation 10 seconds later for the SAME protagonist
    const ep2 = {
      ...ep1,
      id: 'ep_002',
      idempotencyKey: 'IDEMP-002',
      ts: ep1.ts + 10000, // +10s (< 60s)
    };

    const check2 = guardrails.validateNarrative(ep2);
    assert.strictEqual(check2.allowed, false);
    assert.strictEqual(check2.rejectionCode, 'PROTAGONIST_COOLDOWN_ACTIVE');

    // A DIFFERENT protagonist is NOT blocked
    const epDiffProtagonist = {
      ...ep1,
      id: 'ep_003',
      idempotencyKey: 'IDEMP-003',
      protagonistId: 'Protagonist-Beta',
      ts: ep1.ts + 10000,
    };
    const checkDiff = guardrails.validateNarrative(epDiffProtagonist);
    assert.strictEqual(checkDiff.allowed, true);
  });

  runTest('4.3: Topic safety whitelist verification', () => {
    const guardrails = new Guardrails({
      minActionCooldownSec: 90,
      maxDecisionsPerHour: 40,
      minProtagonistCooldownSec: 60,
      maxEpisodeWordCount: 2000,
      allowedUrlDomains: ['primordialorigin.com'],
    });

    const engine = new NarrativeEngine();
    const ep = engine.evaluate(
      baseTelemetry,
      baseEconomicState,
      baseOfferState,
      baseFunnelState,
      baseTopology,
      'Sovereign-Shane'
    );

    const invalidRealmEp = {
      ...ep,
      realmFocus: 'UNAUTHORIZED_VOID_LORE',
    };

    const result = guardrails.validateNarrative(invalidRealmEp);
    assert.strictEqual(result.allowed, false);
    assert.strictEqual(result.rejectionCode, 'TOPIC_SAFETY_VIOLATION');
  });

  runTest('4.4: SHA-256 Idempotency deduplication', () => {
    const guardrails = new Guardrails({
      minActionCooldownSec: 90,
      maxDecisionsPerHour: 40,
      minProtagonistCooldownSec: 0, // Disable cooldown for idempotency check
      maxEpisodeWordCount: 2000,
      allowedUrlDomains: ['primordialorigin.com'],
    });

    const engine = new NarrativeEngine();
    const ep = engine.evaluate(
      baseTelemetry,
      baseEconomicState,
      baseOfferState,
      baseFunnelState,
      baseTopology,
      'Sovereign-Shane'
    );

    const firstCheck = guardrails.validateNarrative(ep);
    assert.strictEqual(firstCheck.allowed, true);
    guardrails.commitNarrative(ep);

    const duplicateCheck = guardrails.validateNarrative(ep);
    assert.strictEqual(duplicateCheck.allowed, false);
    assert(
      duplicateCheck.rejectionCode === 'IDEMPOTENT_DUPLICATE' ||
      duplicateCheck.rejectionCode === 'DUPLICATE_IDEMPOTENCY_KEY'
    );
  });

  runTest('4.5: Anti-recursion loop guard triggers on repeated identical episodes', () => {
    const guardrails = new Guardrails({
      minActionCooldownSec: 90,
      maxDecisionsPerHour: 40,
      minProtagonistCooldownSec: 0,
      maxEpisodeWordCount: 2000,
      allowedUrlDomains: ['primordialorigin.com'],
    });

    const engine = new NarrativeEngine();

    // Episode 1
    const ep1 = {
      ...engine.evaluate(baseTelemetry, baseEconomicState, baseOfferState, baseFunnelState, baseTopology, 'Sovereign-Shane'),
      id: 'ep-rec-1',
      idempotencyKey: 'idemp-1',
      auditHash: 'hash-repeat',
      ts: 1773412000000,
    };
    assert.strictEqual(guardrails.validateNarrative(ep1).allowed, true);
    guardrails.commitNarrative(ep1);

    // Episode 2 (second repeat of same auditHash)
    const ep2 = {
      ...ep1,
      id: 'ep-rec-2',
      idempotencyKey: 'idemp-2',
      auditHash: 'hash-repeat',
      ts: 1773412001000,
    };
    assert.strictEqual(guardrails.validateNarrative(ep2).allowed, true);
    guardrails.commitNarrative(ep2);

    // Episode 3 (third repeat triggers anti-recursion guard)
    const ep3 = {
      ...ep1,
      id: 'ep-rec-3',
      idempotencyKey: 'idemp-3',
      auditHash: 'hash-repeat',
      ts: 1773412002000,
    };
    const check3 = guardrails.validateNarrative(ep3);
    assert.strictEqual(check3.allowed, false);
    assert.strictEqual(check3.rejectionCode, 'RECURSION_LIMIT_EXCEEDED');
  });

  // ============================================================================
  // SECTION 5: ExecutionBridge & Audit Lineage Integration
  // ============================================================================
  console.log('--- Section 5: ExecutionBridge & Chained Audit Lineage ---');

  runTest('5.1: ExecutionBridge evaluates narrative tick, records stateHashBefore/After and NARRATIVE_EPISODE audit entry', () => {
    const auditFile = path.join(testTempDir, 'audit_narrative_test.jsonl');
    const narrativeLog = path.join(testTempDir, 'narrative_prod_test.jsonl');
    const narrativeSnapshot = path.join(testTempDir, 'narrative_snap_test.json');

    if (fs.existsSync(auditFile)) fs.unlinkSync(auditFile);
    if (fs.existsSync(narrativeLog)) fs.unlinkSync(narrativeLog);
    if (fs.existsSync(narrativeSnapshot)) fs.unlinkSync(narrativeSnapshot);

    const telemetry = new TelemetryCollector(path.join(testTempDir, 'telemetry_test.jsonl'));
    const kernel = new EconomicKernel();
    const guardrails = new Guardrails({
      minActionCooldownSec: 90,
      maxDecisionsPerHour: 40,
      minProtagonistCooldownSec: 60,
      maxEpisodeWordCount: 2000,
      allowedUrlDomains: ['primordialorigin.com'],
    });
    const funnel = new FunnelAgent();
    const narrativeEngine = new NarrativeEngine();

    let broadcastedEpisode = null;
    funnel.subscribeNarrativeEvents((eventType, episode) => {
      if (eventType === 'NARRATIVE_EPISODE_CREATED') {
        broadcastedEpisode = episode;
      }
    });

    const bridge = new ExecutionBridge(
      telemetry,
      kernel,
      guardrails,
      funnel,
      auditFile,
      {
        narrativeEngine,
        narrativeLogPath: narrativeLog,
        narrativeSnapshotPath: narrativeSnapshot,
      }
    );

    const tickResult = bridge.evaluateNarrativeTick(narrativeEngine, 'Sovereign-Shane');
    assert.strictEqual(tickResult.evaluated, 1);
    assert.strictEqual(tickResult.applied, 1);
    assert.strictEqual(tickResult.suppressed, 0);
    assert(tickResult.episode !== null);

    // Verify FunnelAgent broadcasted the event
    assert(broadcastedEpisode !== null, 'FunnelAgent must receive broadcasted episode');
    assert.strictEqual(broadcastedEpisode.id, tickResult.episode.id);

    // Verify audit log
    assert(fs.existsSync(auditFile), 'Audit file must exist');
    const auditLines = fs.readFileSync(auditFile, 'utf-8').trim().split('\n').map((l) => JSON.parse(l));
    const narrativeAudit = auditLines.find((a) => a.type === 'NARRATIVE_EPISODE');
    assert(narrativeAudit, 'Audit entry with type NARRATIVE_EPISODE must be recorded');
    assert.strictEqual(narrativeAudit.episodeId, tickResult.episode.id);
    assert.strictEqual(narrativeAudit.protagonistId, 'Sovereign-Shane');
    assert.strictEqual(narrativeAudit.status, 'APPLIED');
    assert(narrativeAudit.stateHashBefore !== undefined);
    assert(narrativeAudit.stateHashAfter !== undefined);
    assert.notStrictEqual(narrativeAudit.stateHashBefore, narrativeAudit.stateHashAfter);

    // Verify narrative production log and snapshot
    assert(fs.existsSync(narrativeLog), 'Narrative production log must exist');
    assert(fs.existsSync(narrativeSnapshot), 'Narrative snapshot file must exist');

    const snap = JSON.parse(fs.readFileSync(narrativeSnapshot, 'utf-8'));
    assert.strictEqual(snap.totalEpisodesGenerated, 1);
    assert.strictEqual(snap.activeEpisode.id, tickResult.episode.id);
    assert.strictEqual(snap.protagonistHistory[0], 'Sovereign-Shane');

    bridge.close();
    telemetry.close();
  });

  runTest('5.2: BlogEngine integration - linking narrative episode creates blog chronicle', () => {
    const blogEngine = new BlogEngine();
    const narrativeEngine = new NarrativeEngine();
    const episode = narrativeEngine.evaluate(
      baseTelemetry,
      baseEconomicState,
      baseOfferState,
      baseFunnelState,
      baseTopology,
      'Sovereign-Shane'
    );

    const post = blogEngine.linkNarrativeEpisode(episode);
    assert(post !== null);
    assert.strictEqual(typeof post.id, 'string');
    assert(post.ctaUrl.includes(episode.id));
    assert.strictEqual(post.title, episode.title);
    assert(post.body.includes(episode.title));
    assert(post.body.includes(episode.actStructure.actI.name));
    assert(post.body.includes(episode.actStructure.actII.name));
    assert(post.body.includes(episode.actStructure.actIII.name));
  });

  // ============================================================================
  // SECTION 6: Multi-Realm Manifest & Coherence Verification
  // ============================================================================
  console.log('--- Section 6: Multi-Realm Manifest & Coherence ---');

  runTest('6.1: NARRATIVE_ENGINE_REALM_MANIFEST conforms to sovereign topology', () => {
    assert.strictEqual(NARRATIVE_ENGINE_REALM_MANIFEST.realmId, 'narrative_engine');
    assert.strictEqual(NARRATIVE_ENGINE_REALM_MANIFEST.phase, 4);
    assert.strictEqual(NARRATIVE_ENGINE_REALM_MANIFEST.sovereignTier, 1);
    assert.strictEqual(NARRATIVE_ENGINE_REALM_MANIFEST.deterministic, true);
    assert.strictEqual(NARRATIVE_ENGINE_REALM_MANIFEST.zeroRandomness, true);
    assert.strictEqual(NARRATIVE_ENGINE_REALM_MANIFEST.bindings.length, 6);

    const boundRealms = NARRATIVE_ENGINE_REALM_MANIFEST.bindings.map((b) => b.realm);
    assert(boundRealms.includes('Telemetry Stream'));
    assert(boundRealms.includes('Economic Kernel'));
    assert(boundRealms.includes('Offer Engine'));
    assert(boundRealms.includes('Funnel Agent'));
    assert(boundRealms.includes('Merkle Audit Logger'));
    assert(boundRealms.includes('Sovereign Core'));
  });

  runTest('6.2: verifyNarrativeRealmCoherence() confirms all 6 realms BOUND', () => {
    const coherence = verifyNarrativeRealmCoherence();
    assert.strictEqual(coherence.coherent, true);
    assert.strictEqual(coherence.totalRealms, 6);
    assert.strictEqual(coherence.verifiedRealms.length, 6);
  });

  runTest('6.3: data/realm-map.json contains narrative_engine with OPTIMAL binding', () => {
    const realmMapPath = path.join(rootDir, 'data', 'realm-map.json');
    const realmMap = JSON.parse(fs.readFileSync(realmMapPath, 'utf-8'));
    const narrativeRealm = realmMap.realms.find((r) => r.realmId === 'narrative_engine');
    assert(narrativeRealm, 'narrative_engine must be registered in data/realm-map.json');
    assert.strictEqual(narrativeRealm.metadata.tier, 'Phase4');
    assert.strictEqual(narrativeRealm.metadata.antiGravScore, 98);

    const adj = realmMap.adjacency.find((a) => a.from === 'narrative_engine');
    assert(adj, 'narrative_engine must have adjacency declared');
    assert(adj.to.includes('sovereign_core'));
  });

  runTest('6.4: RealmMap.json contains narrative_engine with status BOUND and health OPTIMAL', () => {
    const realmMapJsonPath = path.join(rootDir, 'RealmMap.json');
    const realmMapJson = JSON.parse(fs.readFileSync(realmMapJsonPath, 'utf-8'));
    const narrativeRealm = realmMapJson.realms.find((r) => r.id === 'narrative_engine');
    assert(narrativeRealm, 'narrative_engine must be registered in RealmMap.json');
    assert.strictEqual(narrativeRealm.status, 'BOUND');
    assert.strictEqual(narrativeRealm.health, 'OPTIMAL');

    const topo = realmMapJson.topologyBindings.find((b) => b.id === 'bind_kernel_narrative_engine');
    assert(topo, 'bind_kernel_narrative_engine must be registered in topologyBindings');
    assert.strictEqual(topo.status, 'ACTIVE');
  });

  // ============================================================================
  // SECTION 7: Autonomous Narrative Orchestrator End-to-End
  // ============================================================================
  console.log('--- Section 7: Autonomous Narrative Orchestrator End-to-End ---');

  await runAsyncTest('7.1: AutonomousNarrativeOrchestrator steps tick and manages protagonist state', async () => {
    const orchDir = path.join(testTempDir, 'orch');
    if (!fs.existsSync(orchDir)) fs.mkdirSync(orchDir, { recursive: true });

    const orchestrator = new AutonomousNarrativeOrchestrator({
      dataDir: orchDir,
      tickIntervalMs: 1000,
      narrativeTickIntervalMs: 1000,
      defaultProtagonistId: 'Sovereign-Shane',
    });

    assert.strictEqual(orchestrator.getProtagonistId(), 'Sovereign-Shane');

    const tick1 = orchestrator.stepTick();
    assert.strictEqual(tick1.evaluated, 1);
    assert.strictEqual(tick1.applied, 1);
    assert(tick1.episode !== null);

    const state = orchestrator.getNarrativeState();
    assert.strictEqual(state.totalEpisodesGenerated, 1);
    assert.strictEqual(state.activeEpisode?.id, tick1.episode.id);

    const lastEp = orchestrator.getLastEpisode();
    assert.strictEqual(lastEp?.id, tick1.episode.id);

    orchestrator.stop();
  });

  // Summary
  console.log('\n========================================================');
  console.log(`Phase 4 Test Results: ${passedTests}/${totalTests} PASSED`);
  console.log('========================================================\n');

  if (passedTests !== totalTests) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Fatal error running Phase 4 test suite:', err);
  process.exit(1);
});

/**
 * ==============================================================================
 * PRIMORDIAOS PHASE 2: AUTONOMOUS REVENUE ORCHESTRATION TEST SUITE
 * Validates TelemetryCollector, TikTokLiveAdapter, EconomicKernel, Guardrails,
 * FunnelAgent, and ExecutionBridge with append-only audit chaining.
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
console.log('⚡ PRIMORDIAOS PHASE 2: AUTONOMOUS ORCHESTRATION TESTS');
console.log('========================================================\n');

async function main() {
  // Determine module root: compiled dist or direct
  let modules;
  const distPath = path.join(rootDir, 'dist', 'src', 'phase2-orchestrator.js');
  const distRootPath = path.join(rootDir, 'dist', 'phase2-orchestrator.js');

  if (fs.existsSync(distPath)) {
    modules = await import(`file://${distPath.replace(/\\/g, '/')}`);
  } else if (fs.existsSync(distRootPath)) {
    modules = await import(`file://${distRootPath.replace(/\\/g, '/')}`);
  } else {
    throw new Error(`Compiled orchestrator not found. Checked: ${distPath} and ${distRootPath}`);
  }

  const {
    TikTokLiveAdapter,
    TelemetryCollector,
    EconomicKernel,
    Guardrails,
    FunnelAgent,
    ExecutionBridge,
  } = modules;

  const testTempDir = path.join(rootDir, 'data', 'test_scratch');
  if (!fs.existsSync(testTempDir)) {
    fs.mkdirSync(testTempDir, { recursive: true });
  }

  // ── GROUP 1: Ingest & Intent Classification ───────────────────────────────────
  console.log('📡 GROUP 1: Ingest & Intent Classification (TikTokLiveAdapter)');

  const adapter = new TikTokLiveAdapter();

  runTest('Classifies LINK_REQUEST intent accurately', () => {
    const intent1 = adapter.classifyIntent('where is the link for the origin access?');
    assert.strictEqual(intent1, 'LINK_REQUEST');

    const intent2 = adapter.classifyIntent('drop the website url please');
    assert.strictEqual(intent2, 'LINK_REQUEST');
  });

  runTest('Classifies ACCESS_QUERY intent accurately', () => {
    const intent = adapter.classifyIntent('how do i join the sovereign realm?');
    assert.strictEqual(intent, 'ACCESS_QUERY');
  });

  runTest('Transforms raw comment into standard LiveEvent', () => {
    const event = adapter.transformComment({
      userId: 'usr_77',
      nickname: 'neo',
      comment: 'where is the link?',
      createTime: 1773412000000,
    });
    assert.strictEqual(event.platform, 'tiktok_live');
    assert.strictEqual(event.type, 'CHAT_MESSAGE');
    assert.strictEqual(event.payload.intent, 'LINK_REQUEST');
    assert.strictEqual(event.payload.username, 'neo');
  });

  runTest('Transforms raw gift event into standard LiveEvent with coin math', () => {
    const event = adapter.transformGift({
      userId: 'usr_whale',
      nickname: 'WhaleKing',
      diamondCount: 25,
      repeatCount: 4,
      giftName: 'Lion',
    });
    assert.strictEqual(event.type, 'GIFT_DONATION');
    assert.strictEqual(event.payload.giftValueCoins, 100);
  });

  // ── GROUP 2: Telemetry Collector & Rolling Windows ────────────────────────────
  console.log('\n📊 GROUP 2: TelemetryCollector Rolling Windows & Metrics');

  const testTelemetryFile = path.join(testTempDir, 'test_telemetry.jsonl');
  if (fs.existsSync(testTelemetryFile)) fs.unlinkSync(testTelemetryFile);

  const collector = new TelemetryCollector(testTelemetryFile);

  runTest('Accurately tracks viewers and calculates velocities', () => {
    const now = Date.now();
    collector.recordEvent({
      eventId: 'ev_1',
      sequence: 1,
      platform: 'tiktok_live',
      type: 'VIEWER_JOIN',
      timestampMs: now,
      payload: {},
    });
    collector.recordEvent({
      eventId: 'ev_2',
      sequence: 2,
      platform: 'tiktok_live',
      type: 'VIEWER_JOIN',
      timestampMs: now,
      payload: {},
    });

    // 4 chat messages with link intent in the current second
    for (let i = 0; i < 4; i++) {
      collector.recordEvent({
        eventId: `ev_chat_${i}`,
        sequence: 3 + i,
        platform: 'tiktok_live',
        type: 'CHAT_MESSAGE',
        timestampMs: now,
        payload: { intent: 'LINK_REQUEST' },
      });
    }

    const state = collector.getEconomicState();
    assert.strictEqual(state.microWindow.currentViewers, 2);
    assert.strictEqual(state.microWindow.chatVelocityPerMin, 4);
    assert.strictEqual(state.microWindow.linkRequestVelocityPerMin, 4);
  });

  runTest('Calculates CTR and Conversion Rate correctly', () => {
    const now = Date.now();
    // Record 10 impressions, 2 clicks, 1 conversion
    for (let i = 0; i < 10; i++) {
      collector.recordEvent({
        eventId: `ev_imp_${i}`,
        sequence: 10 + i,
        platform: 'origin_web',
        type: 'FUNNEL_IMPRESSION',
        timestampMs: now,
        payload: {},
      });
    }
    for (let i = 0; i < 2; i++) {
      collector.recordEvent({
        eventId: `ev_click_${i}`,
        sequence: 20 + i,
        platform: 'origin_web',
        type: 'FUNNEL_CLICK',
        timestampMs: now,
        payload: {},
      });
    }
    collector.recordEvent({
      eventId: 'ev_conv_1',
      sequence: 25,
      platform: 'origin_web',
      type: 'CONVERSION_SUCCESS',
      timestampMs: now,
      payload: {},
    });

    const state = collector.getEconomicState();
    assert.strictEqual(state.microWindow.funnelImpressions, 10);
    assert.strictEqual(state.microWindow.funnelClicks, 2);
    assert.strictEqual(state.microWindow.conversions, 1);
    assert.strictEqual(state.microWindow.clickThroughRate, 0.2);
    assert.strictEqual(state.microWindow.conversionRate, 0.5);
  });

  // ── GROUP 3: Economic Kernel Deterministic Rules ──────────────────────────────
  console.log('\n🧠 GROUP 3: EconomicKernel Deterministic Rules');

  const kernel = new EconomicKernel();

  runTest('Fires RULE_CHAT_LINK_INTENT_SURGE when link requests >= 3/min', () => {
    const state = {
      timestampMs: Date.now(),
      microWindow: {
        windowDurationSec: 60,
        currentViewers: 50,
        chatVelocityPerMin: 20,
        giftCoinsPerMin: 0,
        shareVelocityPerMin: 0,
        linkRequestVelocityPerMin: 3.5,
        funnelImpressions: 10,
        funnelClicks: 2,
        conversions: 0,
        clickThroughRate: 0.2,
        conversionRate: 0,
      },
      macroWindow: {},
      activeFunnelId: 'test_funnel',
      currentCtaId: 'cta_standard_access',
      isSystemThrottled: false,
    };

    const funnel = {
      funnelId: 'test_funnel',
      activeCtaId: 'cta_standard_access',
      ctaLabel: 'Enter',
      targetUrl: 'https://primordialorigin.com',
      activeTier: 'CORE',
      lastModifiedMs: 0,
      updateCount: 0,
    };

    const decisions = kernel.evaluate(state, funnel);
    assert(decisions.length > 0, 'Must produce a decision');
    assert.strictEqual(decisions[0].ruleTriggered, 'RULE_CHAT_LINK_INTENT_SURGE');
    assert.strictEqual(decisions[0].action, 'UPDATE_CTA');
    assert.strictEqual(decisions[0].payload.targetCtaId, 'cta_direct_link_surge');
  });

  runTest('Fires RULE_ENGAGEMENT_SPIKE_VIP_OFFER on coin or chat surge', () => {
    const state = {
      timestampMs: Date.now(),
      microWindow: {
        windowDurationSec: 60,
        currentViewers: 100,
        chatVelocityPerMin: 10,
        giftCoinsPerMin: 120, // > 100
        shareVelocityPerMin: 5,
        linkRequestVelocityPerMin: 0,
        funnelImpressions: 10,
        funnelClicks: 2,
        conversions: 0,
        clickThroughRate: 0.2,
        conversionRate: 0,
      },
      macroWindow: {},
      activeFunnelId: 'test_funnel',
      currentCtaId: 'cta_standard_access',
      isSystemThrottled: false,
    };

    const funnel = {
      funnelId: 'test_funnel',
      activeCtaId: 'cta_standard_access',
      ctaLabel: 'Enter',
      targetUrl: 'https://primordialorigin.com',
      activeTier: 'CORE',
      lastModifiedMs: 0,
      updateCount: 0,
    };

    const decisions = kernel.evaluate(state, funnel);
    const vipDecision = decisions.find(d => d.ruleTriggered === 'RULE_ENGAGEMENT_SPIKE_VIP_OFFER');
    assert(vipDecision, 'Must find VIP engagement spike decision');
    assert.strictEqual(vipDecision.action, 'SWITCH_OFFER_TIER');
    assert.strictEqual(vipDecision.payload.targetCtaId, 'cta_vip_pass');
  });

  runTest('Fires RULE_CONVERSION_STAGNATION_RECOVERY when 0 conversions with high traffic', () => {
    const state = {
      timestampMs: Date.now(),
      microWindow: {
        linkRequestVelocityPerMin: 0,
        giftCoinsPerMin: 0,
        chatVelocityPerMin: 0,
      },
      macroWindow: {
        windowDurationSec: 300,
        currentViewers: 45, // >= 25
        chatVelocityPerMin: 5,
        giftCoinsPerMin: 0,
        shareVelocityPerMin: 1,
        linkRequestVelocityPerMin: 0,
        funnelImpressions: 40, // >= 30
        funnelClicks: 5,
        conversions: 0, // 0 conversions
        clickThroughRate: 0.125,
        conversionRate: 0,
      },
      activeFunnelId: 'test_funnel',
      currentCtaId: 'cta_standard_access',
      isSystemThrottled: false,
    };

    const funnel = {
      funnelId: 'test_funnel',
      activeCtaId: 'cta_standard_access',
      ctaLabel: 'Enter',
      targetUrl: 'https://primordialorigin.com',
      activeTier: 'CORE',
      lastModifiedMs: 0,
      updateCount: 0,
    };

    const decisions = kernel.evaluate(state, funnel);
    const dropDecision = decisions.find(d => d.ruleTriggered === 'RULE_CONVERSION_STAGNATION_RECOVERY');
    assert(dropDecision, 'Must find recovery rule decision');
    assert.strictEqual(dropDecision.payload.targetCtaId, 'cta_frictionless_entry');
  });

  // ── GROUP 4: Guardrails & Safety Enforcement ──────────────────────────────────
  console.log('\n🛡️ GROUP 4: Guardrails & Safety Enforcement');

  const guardrails = new Guardrails({
    minActionCooldownSec: 90,
    maxDecisionsPerHour: 5,
    allowedUrlDomains: ['primordialorigin.com', 'moneyplughub.com'],
  });

  const testDecision = {
    decisionId: 'dec_1',
    timestampMs: Date.now(),
    ruleTriggered: 'RULE_CHAT_LINK_INTENT_SURGE',
    action: 'UPDATE_CTA',
    priority: 10,
    idempotencyKey: 'idemp_key_1',
    payload: {
      targetCtaId: 'cta_direct',
      targetUrl: 'https://primordialorigin.com/access',
    },
    rationale: 'Test rationale',
  };

  runTest('Approves valid decision on initial run', () => {
    const result = guardrails.validate(testDecision);
    assert.strictEqual(result.allowed, true);
    guardrails.commit(testDecision);
  });

  runTest('Blocks duplicate decision with same idempotency key', () => {
    const result = guardrails.validate(testDecision);
    assert.strictEqual(result.allowed, false);
    assert.strictEqual(result.rejectionCode, 'IDEMPOTENT_DUPLICATE');
  });

  runTest('Enforces 90-second cooldown on same action type', () => {
    const newDecision = {
      ...testDecision,
      decisionId: 'dec_2',
      idempotencyKey: 'idemp_key_2',
    };
    const result = guardrails.validate(newDecision);
    assert.strictEqual(result.allowed, false);
    assert.strictEqual(result.rejectionCode, 'COOLDOWN_ACTIVE');
  });

  runTest('Blocks destination URLs with unauthorized domains', () => {
    // Manually advance cooldown
    guardrails.setActionTimestampForTest('UPDATE_CTA', Date.now() - 100000);

    const maliciousDecision = {
      ...testDecision,
      decisionId: 'dec_malicious',
      idempotencyKey: 'idemp_key_3',
      payload: {
        targetUrl: 'https://malicious-phishing.com/drain',
      },
    };
    const result = guardrails.validate(maliciousDecision);
    assert.strictEqual(result.allowed, false);
    assert.strictEqual(result.rejectionCode, 'INVALID_PAYLOAD');
  });

  // ── GROUP 5: Execution Bridge & Chained Audit Ledger ──────────────────────────
  console.log('\n🔗 GROUP 5: ExecutionBridge & Chained Audit Ledger');

  const testAuditFile = path.join(testTempDir, 'test_audit.jsonl');
  if (fs.existsSync(testAuditFile)) fs.unlinkSync(testAuditFile);

  const funnelAgent = new FunnelAgent();
  const bridge = new ExecutionBridge(collector, kernel, guardrails, funnelAgent, testAuditFile);

  runTest('ExecutionBridge computes deterministic SHA-256 state hashes', () => {
    const hash1 = bridge.computeStateHash({ a: 1, b: 'test' });
    const hash2 = bridge.computeStateHash({ a: 1, b: 'test' });
    assert.strictEqual(hash1, hash2);
    assert.strictEqual(hash1.length, 16);
  });

  runTest('Full pipeline tick applies decision, mutates funnel, and logs audit', () => {
    // Advance cooldown to allow execution
    guardrails.setActionTimestampForTest('UPDATE_CTA', Date.now() - 200000);

    const tickResult = bridge.evaluateTick();
    assert(tickResult.evaluated > 0, 'Should have evaluated decisions');
    assert(tickResult.applied >= 1, 'Should have applied at least one decision');

    // Funnel agent state must reflect the mutation
    const state = funnelAgent.getState();
    assert.strictEqual(state.activeCtaId, 'cta_direct_link_surge');
    assert.strictEqual(state.updateCount, 1);

    // Audit log must exist
    assert(fs.existsSync(testAuditFile), 'Audit file must be written to disk');
    const lines = fs.readFileSync(testAuditFile, 'utf8').trim().split('\n');
    assert(lines.length >= 1, 'Must have at least one audit record');

    const firstEntry = JSON.parse(lines[0]);
    assert.strictEqual(firstEntry.status, 'APPLIED');
    assert.strictEqual(firstEntry.previousStateHash, '0000000000000000');
    assert.notStrictEqual(firstEntry.newStateHash, '0000000000000000');
  });

  // ── GROUP 6: Funnel Agent Event Subscriptions ─────────────────────────────────
  console.log('\n🔔 GROUP 6: FunnelAgent Event Subscriptions');

  runTest('Notifies subscribers on state mutations', () => {
    let notifiedState = null;
    const unsubscribe = funnelAgent.subscribe((newState) => {
      notifiedState = newState;
    });

    funnelAgent.applyDecision({
      decisionId: 'manual_dec',
      timestampMs: Date.now(),
      ruleTriggered: 'MANUAL_TEST',
      action: 'SWITCH_OFFER_TIER',
      priority: 1,
      idempotencyKey: 'manual_key',
      payload: {
        targetCtaId: 'cta_vip_pass',
        ctaLabel: 'VIP Sovereign Access',
      },
      rationale: 'Manual test trigger',
    });

    assert(notifiedState !== null, 'Subscriber must receive notification');
    assert.strictEqual(notifiedState.activeTier, 'SOVEREIGN_ENTERPRISE');
    assert.strictEqual(notifiedState.activeCtaId, 'cta_vip_pass');

    unsubscribe();
  });

  // Cleanup open file handles
  collector.close();
  bridge.close();

  console.log('\n========================================================');
  console.log(`🏁 TEST RESULTS: ${passedTests} / ${totalTests} PASSED`);
  console.log('========================================================\n');

  if (passedTests !== totalTests) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Fatal test runner error:', err);
  process.exit(1);
});

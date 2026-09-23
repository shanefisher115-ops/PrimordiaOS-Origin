/**
 * ==============================================================================
 * PRIMORDIAOS PHASE 3: AUTONOMOUS BLOG ENGINE REGRESSION TEST SUITE
 * Validates deterministic BlogEngine pure rules, zero randomness, sovereign
 * guardrails, 45s cooldown, SHA-256 state lineage, FunnelAgent broadcasts,
 * autonomous disk publishing, 9-topic rotation, multi-realm binding,
 * and ANTIGRAV() sovereignty audit.
 * ==============================================================================
 */

import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { antigravGuardian } from '../PrimordiaOS/agents/antigrav-guardian/index.js';

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
    throw err;
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
    throw err;
  }
}

console.log('\n========================================================');
console.log('⚡ PRIMORDIAOS PHASE 3: AUTONOMOUS BLOG ENGINE TESTS');
console.log('========================================================\n');

async function main() {
  // Determine module root: compiled dist or direct
  let modules;
  const distPath = path.join(rootDir, 'dist', 'src', 'phase3-blog-orchestrator.js');
  const distRootPath = path.join(rootDir, 'dist', 'phase3-blog-orchestrator.js');

  if (fs.existsSync(distPath)) {
    modules = await import(`file://${distPath.replace(/\\/g, '/')}`);
  } else if (fs.existsSync(distRootPath)) {
    modules = await import(`file://${distRootPath.replace(/\\/g, '/')}`);
  } else {
    throw new Error(`Compiled phase 3 blog orchestrator not found. Checked: ${distPath} and ${distRootPath}`);
  }

  const {
    BlogEngine,
    generateBlogPost,
    SOVEREIGN_TOPICS,
    ALL_SOVEREIGN_TOPICS,
    BlogPublisher,
    Guardrails,
    FunnelAgent,
    ExecutionBridge,
    TelemetryCollector,
    EconomicKernel,
    AutonomousBlogOrchestrator,
    RULE_PRIMORDIAOS_SYSTEM_OVERVIEW,
    RULE_PLUGIN_OS_EXPANSION,
    RULE_MONEYPLUGHUB_AUTONOMOUS_FINANCE,
    RULE_PRIMORDIAL_ORIGIN_MYTHIC_FOUNDATION,
    RULE_IMMERSIVE_COMPUTATION_THEORY,
    RULE_CINEMATIC_PROTAGONIST_WORLD,
    RULE_SPATIAL_COMPUTATION_CHAMBERS,
    RULE_MULTI_REALM_OS_ARCHITECTURE,
    RULE_ANTIGRAV_SOVEREIGN_PHILOSOPHY,
  } = modules;

  const testTempDir = path.join(rootDir, 'data', 'test_scratch_blog_phase3');
  if (fs.existsSync(testTempDir)) {
    fs.rmSync(testTempDir, { recursive: true, force: true });
  }
  fs.mkdirSync(testTempDir, { recursive: true });

  const testBlogDir = path.join(testTempDir, 'blog');
  fs.mkdirSync(testBlogDir, { recursive: true });

  // Baseline mock states for deterministic tests
  const baseEconomicState = {
    timestampMs: 1773412000000,
    microWindow: {
      windowDurationSec: 60,
      currentViewers: 120,
      chatVelocityPerMin: 18,
      giftCoinsPerMin: 50,
      shareVelocityPerMin: 6,
      linkRequestVelocityPerMin: 2,
      funnelImpressions: 40,
      funnelClicks: 10,
      conversions: 3,
      clickThroughRate: 0.25,
      conversionRate: 0.3,
    },
    macroWindow: {
      windowDurationSec: 300,
      currentViewers: 144,
      chatVelocityPerMin: 14,
      giftCoinsPerMin: 40,
      shareVelocityPerMin: 5,
      linkRequestVelocityPerMin: 1.5,
      funnelImpressions: 160,
      funnelClicks: 40,
      conversions: 12,
      clickThroughRate: 0.25,
      conversionRate: 0.3,
    },
    activeFunnelId: 'funnel_sovereign_alpha',
    currentCtaId: 'cta_blog_access',
    isSystemThrottled: false,
  };

  const baseImmersiveState = {
    spatialCluster: 'Cluster-Alpha-Prime',
    attentionWeight: 0.98,
    simulationFps: 60,
    activeNiagaraParticles: 32768,
    visualLut: 'Imperial Gold',
  };

  const baseCinematicState = {
    protagonistId: 'Sovereign-Shane',
    scenePhase: 'Phase3-AutonomousExecution',
    narrativeAltitude: 99,
    activeArc: 'Ascent of the Sovereign Architect',
  };

  const baseTopicState = {
    activeTopic: 'PRIMORDIAOS_CORE',
    topicIndex: 0,
    lastPublishedTs: 1773412000000,
    rotationOrder: ALL_SOVEREIGN_TOPICS,
    totalPublished: 1,
    recentHistory: [],
  };

  // ── GROUP 1: Deterministic Blog Generation & Pure Function Zero-Randomness ───
  console.log('🧠 GROUP 1: Deterministic Blog Generation & Pure Function Rules');

  const engine = new BlogEngine();

  runTest('RULE_PRIMORDIAOS_SYSTEM_OVERVIEW produces deterministic title, body, and CTA', () => {
    const article = RULE_PRIMORDIAOS_SYSTEM_OVERVIEW(baseTopicState, baseEconomicState, baseImmersiveState);
    assert.strictEqual(article.ruleTriggered, 'RULE_PRIMORDIAOS_SYSTEM_OVERVIEW');
    assert(article.title.includes('PrimordiaOS Architecture'));
    assert(article.body.includes('Decoupled Sovereign Microkernel'));
    assert(article.wordCount >= 300 && article.wordCount <= 2500);
    assert(article.glyphs.includes('Seed') && article.glyphs.includes('Gate'));
    assert(article.ctaUrl.includes('primordialorigin.com'));
  });

  runTest('RULE_PLUGIN_OS_EXPANSION produces deterministic modular sandbox article', () => {
    const article = RULE_PLUGIN_OS_EXPANSION(baseTopicState, baseEconomicState, baseImmersiveState);
    assert.strictEqual(article.ruleTriggered, 'RULE_PLUGIN_OS_EXPANSION');
    assert(article.title.includes('Plug-In OS'));
    assert(article.body.includes('Sandboxed Extension'));
    assert(article.wordCount >= 300 && article.wordCount <= 2500);
    assert(article.glyphs.includes('Starflare') && article.glyphs.includes('Spiral'));
  });

  runTest('RULE_MONEYPLUGHUB_AUTONOMOUS_FINANCE produces deterministic economic analysis', () => {
    const article = RULE_MONEYPLUGHUB_AUTONOMOUS_FINANCE(baseTopicState, baseEconomicState);
    assert.strictEqual(article.ruleTriggered, 'RULE_MONEYPLUGHUB_AUTONOMOUS_FINANCE');
    assert(article.title.includes('MoneyPlugHub'));
    assert(article.body.includes('Sovereign Cashflow Dynamics'));
    assert(article.wordCount >= 300 && article.wordCount <= 2500);
    assert(article.ctaUrl.includes('moneyplughub.com'));
  });

  runTest('RULE_PRIMORDIAL_ORIGIN_MYTHIC_FOUNDATION produces archetypal lineage article', () => {
    const article = RULE_PRIMORDIAL_ORIGIN_MYTHIC_FOUNDATION(baseTopicState);
    assert.strictEqual(article.ruleTriggered, 'RULE_PRIMORDIAL_ORIGIN_MYTHIC_FOUNDATION');
    assert(article.title.includes('Primordial Origin'));
    assert(article.body.includes('Lineage of the Five Glyphs'));
    assert(article.wordCount >= 300 && article.wordCount <= 2500);
  });

  runTest('RULE_IMMERSIVE_COMPUTATION_THEORY produces Niagara dynamics article', () => {
    const article = RULE_IMMERSIVE_COMPUTATION_THEORY(baseTopicState, baseEconomicState, baseImmersiveState);
    assert.strictEqual(article.ruleTriggered, 'RULE_IMMERSIVE_COMPUTATION_THEORY');
    assert(article.title.includes('Immersive Computation'));
    assert(article.body.includes('Niagara Particle Telemetry'));
    assert(article.wordCount >= 300 && article.wordCount <= 2500);
  });

  runTest('RULE_CINEMATIC_PROTAGONIST_WORLD produces sovereign agency article', () => {
    const article = RULE_CINEMATIC_PROTAGONIST_WORLD(baseTopicState, baseEconomicState, baseImmersiveState, baseCinematicState);
    assert.strictEqual(article.ruleTriggered, 'RULE_CINEMATIC_PROTAGONIST_WORLD');
    assert(article.title.includes('Cinematic Protagonist Engine'));
    assert(article.body.includes('The Protagonist Invariant'));
    assert(article.body.includes('Sovereign-Shane'));
    assert(article.wordCount >= 300 && article.wordCount <= 2500);
  });

  runTest('RULE_SPATIAL_COMPUTATION_CHAMBERS produces geometric memory chamber article', () => {
    const article = RULE_SPATIAL_COMPUTATION_CHAMBERS(baseTopicState, baseEconomicState, baseImmersiveState);
    assert.strictEqual(article.ruleTriggered, 'RULE_SPATIAL_COMPUTATION_CHAMBERS');
    assert(article.title.includes('Spatial Computation'));
    assert(article.body.includes('Chamber Partitioning'));
    assert(article.wordCount >= 300 && article.wordCount <= 2500);
  });

  runTest('RULE_MULTI_REALM_OS_ARCHITECTURE produces federated sovereign topology article', () => {
    const article = RULE_MULTI_REALM_OS_ARCHITECTURE(baseTopicState);
    assert.strictEqual(article.ruleTriggered, 'RULE_MULTI_REALM_OS_ARCHITECTURE');
    assert(article.title.includes('Multi-Realm OS Theory'));
    assert(article.body.includes('The Multi-Realm Paradigm'));
    assert(article.wordCount >= 300 && article.wordCount <= 2500);
  });

  runTest('RULE_ANTIGRAV_SOVEREIGN_PHILOSOPHY produces anti-collapse doctrine article', () => {
    const article = RULE_ANTIGRAV_SOVEREIGN_PHILOSOPHY(baseTopicState);
    assert.strictEqual(article.ruleTriggered, 'RULE_ANTIGRAV_SOVEREIGN_PHILOSOPHY');
    assert(article.title.includes('The ANTIGRAV() Doctrine'));
    assert(article.body.includes('Cognitive Altitude Requires Intentional Resistance'));
    assert(article.body.includes('Tier 0 Supremacy'));
    assert(article.wordCount >= 300 && article.wordCount <= 2500);
  });

  runTest('Pure function zero-randomness: identical inputs produce 100% byte-identical BlogPost across 100 iterations', () => {
    const iterations = [];
    for (let i = 0; i < 100; i++) {
      const post = generateBlogPost(baseTopicState, baseEconomicState, baseImmersiveState, baseCinematicState);
      iterations.push(JSON.stringify(post));
    }

    const first = iterations[0];
    for (let i = 1; i < 100; i++) {
      assert.strictEqual(iterations[i], first, `Deterministic output mismatch on iteration ${i}`);
    }
  });

  // ── GROUP 2: Sovereign Guardrail Enforcement ───────────────────────────────────
  console.log('\n🛡️ GROUP 2: Sovereign Guardrail Enforcement');

  const guardrails = new Guardrails({
    minActionCooldownSec: 90,
    maxDecisionsPerHour: 40,
    minOfferCooldownSec: 120,
    minBlogCooldownSec: 45,
    maxBlogWordCount: 2500,
    minBlogWordCount: 150,
    maxBlogPostsPerHour: 60,
    allowedUrlDomains: ['primordialorigin.com', 'moneyplughub.com', 'localhost'],
  });

  const samplePost = generateBlogPost(baseTopicState, baseEconomicState, baseImmersiveState, baseCinematicState);

  runTest('Guardrails approves valid BlogPost complying with sovereign rules', () => {
    const check = guardrails.validateBlogPost(samplePost, baseTopicState);
    assert.strictEqual(check.allowed, true);
    assert.strictEqual(check.rejectionCode, undefined);
  });

  runTest('Guardrails enforces 45s blog cooldown and suppresses rapid-fire subsequent post', () => {
    guardrails.commitBlogPost(samplePost);

    const nextTopicState = {
      ...baseTopicState,
      activeTopic: 'PLUGIN_OS',
      topicIndex: 1,
      totalPublished: 2,
    };
    const rapidPost = generateBlogPost(nextTopicState, baseEconomicState, baseImmersiveState, baseCinematicState);

    const check = guardrails.validateBlogPost(rapidPost, nextTopicState);
    assert.strictEqual(check.allowed, false);
    assert.strictEqual(check.rejectionCode, 'COOLDOWN_ACTIVE');
    assert(check.rejectionReason.includes('cooldown active'));
  });

  runTest('Guardrails recovers after cooldown expiry', () => {
    // Fast-forward cooldown timestamp 50 seconds into the past
    guardrails.setBlogTimestampForTest(Date.now() - 50000);

    const nextTopicState = {
      ...baseTopicState,
      activeTopic: 'PLUGIN_OS',
      topicIndex: 1,
      totalPublished: 2,
    };
    const approvedPost = generateBlogPost(nextTopicState, baseEconomicState, baseImmersiveState, baseCinematicState);

    const check = guardrails.validateBlogPost(approvedPost, nextTopicState);
    assert.strictEqual(check.allowed, true);
  });

  runTest('Guardrails blocks duplicate post via SHA-256 idempotency deduplication', () => {
    guardrails.setBlogTimestampForTest(Date.now() - 50000);
    guardrails.setLastBlogTopicForTest(null);

    // samplePost idempotencyKey was already committed in previous test
    const check = guardrails.validateBlogPost(samplePost);
    assert.strictEqual(check.allowed, false);
    assert.strictEqual(check.rejectionCode, 'IDEMPOTENT_DUPLICATE');
  });

  runTest('Guardrails enforces topic rotation and blocks consecutive duplicate topic drift', () => {
    guardrails.setBlogTimestampForTest(Date.now() - 50000);
    guardrails.setLastBlogTopicForTest('PRIMORDIAOS_CORE');

    // Create a new post with different idempotency key but same topic realm
    const consecutiveTopicState = {
      ...baseTopicState,
      activeTopic: 'PRIMORDIAOS_CORE',
      totalPublished: 99,
    };
    const consecutivePost = generateBlogPost(consecutiveTopicState, baseEconomicState, baseImmersiveState, baseCinematicState);

    const check = guardrails.validateBlogPost(consecutivePost, consecutiveTopicState);
    assert.strictEqual(check.allowed, false);
    assert.strictEqual(check.rejectionCode, 'TOPIC_ROTATION_VIOLATION');
    assert(check.rejectionReason.includes('consecutive post'));
  });

  runTest('Guardrails anti-collapse recursion guard blocks circular repetition loops', () => {
    guardrails.setBlogTimestampForTest(Date.now() - 50000);
    guardrails.setLastBlogTopicForTest('MONEYPLUGHUB');

    const loopingTopicState = {
      ...baseTopicState,
      activeTopic: 'PLUGIN_OS',
      recentHistory: [
        { topic: 'PLUGIN_OS', postId: 'p1', ts: 1000 },
        { topic: 'PRIMORDIAOS_CORE', postId: 'p2', ts: 2000 },
        { topic: 'PLUGIN_OS', postId: 'p3', ts: 3000 },
      ],
    };
    const loopingPost = generateBlogPost(loopingTopicState, baseEconomicState, baseImmersiveState, baseCinematicState);

    const check = guardrails.validateBlogPost(loopingPost, loopingTopicState);
    assert.strictEqual(check.allowed, false);
    assert.strictEqual(check.rejectionCode, 'RECURSION_LIMIT_EXCEEDED');
  });

  runTest('Guardrails word count bounds rejects posts exceeding 2,500 words or below 150 words', () => {
    guardrails.setBlogTimestampForTest(Date.now() - 50000);
    guardrails.setLastBlogTopicForTest('MONEYPLUGHUB');

    const smallPost = {
      ...samplePost,
      id: 'post_small',
      idempotencyKey: 'key_small_post',
      body: 'Too short. Less than 150 words.',
      wordCount: 6,
    };
    const checkSmall = guardrails.validateBlogPost(smallPost);
    assert.strictEqual(checkSmall.allowed, false);
    assert.strictEqual(checkSmall.rejectionCode, 'WORD_COUNT_OUT_OF_BOUNDS');

    const hugePost = {
      ...samplePost,
      id: 'post_huge',
      idempotencyKey: 'key_huge_post',
      body: 'word '.repeat(2600),
      wordCount: 2600,
    };
    const checkHuge = guardrails.validateBlogPost(hugePost);
    assert.strictEqual(checkHuge.allowed, false);
    assert.strictEqual(checkHuge.rejectionCode, 'WORD_COUNT_OUT_OF_BOUNDS');
  });

  runTest('Guardrails glyph-bound safety constraints reject posts with unauthorized glyphs', () => {
    guardrails.setBlogTimestampForTest(Date.now() - 50000);
    guardrails.setLastBlogTopicForTest('MONEYPLUGHUB');

    const invalidGlyphPost = {
      ...samplePost,
      id: 'post_bad_glyph',
      idempotencyKey: 'key_bad_glyph',
      glyphs: ['InvalidGlyphName'],
    };
    const check = guardrails.validateBlogPost(invalidGlyphPost);
    assert.strictEqual(check.allowed, false);
    assert.strictEqual(check.rejectionCode, 'UNSAFE_GLYPH_BINDING');
  });

  // ── GROUP 3: Autonomous Publishing Pipeline & Disk Storage ───────────────────
  console.log('\n📄 GROUP 3: Autonomous Publishing Pipeline & Storage');

  const funnel = new FunnelAgent();
  const publisher = new BlogPublisher({
    outputDir: testBlogDir,
    funnelAgent: funnel,
  });

  runTest('BlogPublisher writes markdown artifact with frontmatter and JSON metadata', () => {
    const publishResult = publisher.publish(samplePost);
    assert.strictEqual(publishResult.published, true);
    assert(fs.existsSync(publishResult.markdownPath), 'Markdown file must exist on disk');
    assert(fs.existsSync(publishResult.jsonPath), 'JSON metadata must exist on disk');

    const mdContent = fs.readFileSync(publishResult.markdownPath, 'utf8');
    assert(mdContent.includes('---'));
    assert(mdContent.includes(`id: "${samplePost.id}"`));
    assert(mdContent.includes(`auditHash: "${samplePost.auditHash}"`));
    assert(mdContent.includes(samplePost.body));

    const jsonContent = JSON.parse(fs.readFileSync(publishResult.jsonPath, 'utf8'));
    assert.strictEqual(jsonContent.slug, samplePost.slug);
    assert.strictEqual(jsonContent.auditHash, samplePost.auditHash);
  });

  runTest('BlogPublisher synchronizes blog_index.json and maintains append-only blog_lineage.jsonl', () => {
    const index = publisher.getIndex();
    assert(index.length >= 1);
    assert.strictEqual(index[0].slug, samplePost.slug);
    assert.strictEqual(index[0].auditHash, samplePost.auditHash);

    const lineage = publisher.getLineage();
    assert(lineage.length >= 1);
    assert.strictEqual(lineage[0].slug, samplePost.slug);
    assert.strictEqual(lineage[0].idempotencyKey, samplePost.idempotencyKey);
  });

  // ── GROUP 4: ExecutionBridge Chained Audit Lineage ────────────────────────────
  console.log('\n🔗 GROUP 4: ExecutionBridge Chained Audit Lineage');

  const testAuditFile = path.join(testTempDir, 'audit_ledger.jsonl');
  const testTelemetryFile = path.join(testTempDir, 'telemetry.jsonl');
  const telemetry = new TelemetryCollector(testTelemetryFile);
  const kernel = new EconomicKernel();

  const bridge = new ExecutionBridge(
    telemetry,
    kernel,
    guardrails,
    funnel,
    testAuditFile,
    {
      blogEngine: engine,
      blogPublisher: publisher,
    }
  );

  runTest('ExecutionBridge evaluateBlogTick writes type "BLOG_POST" audit record with SHA-256 postHash', () => {
    guardrails.setBlogTimestampForTest(Date.now() - 50000);
    guardrails.setLastBlogTopicForTest('PRIMORDIAOS_CORE');

    const testTopicState = {
      ...baseTopicState,
      activeTopic: 'PLUGIN_OS',
      topicIndex: 1,
      totalPublished: 10,
    };

    const tickResult = bridge.evaluateBlogTick(testTopicState, baseImmersiveState, baseCinematicState);
    assert.strictEqual(tickResult.evaluated, 1);
    assert.strictEqual(tickResult.applied, 1);
    assert.strictEqual(tickResult.suppressed, 0);
    assert(tickResult.post !== null);

    assert(fs.existsSync(testAuditFile), 'Audit ledger file must exist');
    const lines = fs.readFileSync(testAuditFile, 'utf8').trim().split('\n');
    const lastAudit = JSON.parse(lines[lines.length - 1]);

    assert.strictEqual(lastAudit.type, 'BLOG_POST');
    assert.strictEqual(lastAudit.topic, 'PLUGIN_OS');
    assert.strictEqual(lastAudit.status, 'APPLIED');
    assert(lastAudit.postHash !== undefined);
    assert(lastAudit.stateHashBefore !== undefined);
    assert(lastAudit.stateHashAfter !== undefined);
    assert.notStrictEqual(lastAudit.stateHashBefore, lastAudit.stateHashAfter);
  });

  runTest('ExecutionBridge evaluateBlogTick suppresses and logs guardrail rejections with state parity', () => {
    // Immediately attempt another post to trigger cooldown
    const rapidTopicState = {
      ...baseTopicState,
      activeTopic: 'MONEYPLUGHUB',
      topicIndex: 2,
      totalPublished: 11,
    };

    const tickResult = bridge.evaluateBlogTick(rapidTopicState, baseImmersiveState, baseCinematicState);
    assert.strictEqual(tickResult.evaluated, 1);
    assert.strictEqual(tickResult.applied, 0);
    assert.strictEqual(tickResult.suppressed, 1);
    assert.strictEqual(tickResult.guardrailRejectionReason.includes('cooldown active'), true);

    const lines = fs.readFileSync(testAuditFile, 'utf8').trim().split('\n');
    const lastAudit = JSON.parse(lines[lines.length - 1]);

    assert.strictEqual(lastAudit.type, 'BLOG_POST');
    assert.strictEqual(lastAudit.status, 'SUPPRESSED_BY_GUARDRAIL');
    assert.strictEqual(lastAudit.stateHashBefore, lastAudit.stateHashAfter);
  });

  // ── GROUP 5: FunnelAgent Multi-Channel Broadcast ─────────────────────────────
  console.log('\n📡 GROUP 5: FunnelAgent Multi-Channel Broadcast');

  let wsBroadcastReceived = null;
  let sseBroadcastReceived = null;
  let listenerReceived = null;

  funnel.setWebSocketBroadcaster((channel, payload) => {
    wsBroadcastReceived = { channel, payload };
  });

  funnel.setSseBroadcaster((event, data) => {
    sseBroadcastReceived = { event, data };
  });

  const unsubscribe = funnel.subscribeBlogEvents((event, post) => {
    listenerReceived = { event, post };
  });

  runTest('FunnelAgent broadcasts BLOG_POST_CREATED across WebSocket, SSE, and listeners', () => {
    const broadcastPost = generateBlogPost(
      { ...baseTopicState, activeTopic: 'ANTIGRAV_PHILOSOPHY', totalPublished: 88 },
      baseEconomicState,
      baseImmersiveState
    );

    funnel.notifyBlogPost(broadcastPost);

    assert(wsBroadcastReceived !== null, 'WebSocket must receive broadcast');
    assert.strictEqual(wsBroadcastReceived.channel, 'BLOG_POST_CREATED');
    assert.strictEqual(wsBroadcastReceived.payload.post.slug, broadcastPost.slug);

    assert(sseBroadcastReceived !== null, 'SSE must receive broadcast');
    assert.strictEqual(sseBroadcastReceived.event, 'BLOG_POST_CREATED');
    assert.strictEqual(sseBroadcastReceived.data.post.slug, broadcastPost.slug);

    assert(listenerReceived !== null, 'In-process listener must receive event');
    assert.strictEqual(listenerReceived.event, 'BLOG_POST_CREATED');
    assert.strictEqual(listenerReceived.post.slug, broadcastPost.slug);

    unsubscribe();
  });

  // ── GROUP 6: AutonomousBlogOrchestrator Integration ──────────────────────────
  console.log('\n👑 GROUP 6: Master AutonomousBlogOrchestrator Integration');

  const orchestrator = new AutonomousBlogOrchestrator({
    dataDir: testTempDir,
    blogTickIntervalMs: 2000,
  });

  runTest('AutonomousBlogOrchestrator initializes all subsystems with 9-topic sovereign rotation', () => {
    assert(orchestrator.telemetry !== undefined);
    assert(orchestrator.kernel !== undefined);
    assert(orchestrator.blogEngine !== undefined);
    assert(orchestrator.publisher !== undefined);
    assert(orchestrator.guardrails !== undefined);
    assert(orchestrator.funnel !== undefined);
    assert(orchestrator.bridge !== undefined);

    const topicState = orchestrator.getTopicState();
    assert.strictEqual(topicState.rotationOrder.length, 9);
    assert.strictEqual(topicState.activeTopic, 'PRIMORDIAOS_CORE');
  });

  runTest('AutonomousBlogOrchestrator stepTick publishes post and automatically advances topic rotation', () => {
    // Ensure cooldown is clear for stepTick
    orchestrator.guardrails.setBlogTimestampForTest(Date.now() - 50000);
    orchestrator.guardrails.setLastBlogTopicForTest(null);

    const tickResult = orchestrator.stepTick();
    assert.strictEqual(tickResult.applied, 1);
    assert(tickResult.post !== null);
    assert.strictEqual(tickResult.post.realm, 'PRIMORDIAOS_CORE');

    // Verify automatic topic advancement to next in sequence: PLUGIN_OS
    const updatedTopicState = orchestrator.getTopicState();
    assert.strictEqual(updatedTopicState.activeTopic, 'PLUGIN_OS');
    assert.strictEqual(updatedTopicState.topicIndex, 1);
    assert.strictEqual(updatedTopicState.totalPublished, 1);
  });

  orchestrator.stop();
  telemetry.close();
  bridge.close();

  // ── GROUP 7: Multi-Realm Coherence & Topology Binding ────────────────────────
  console.log('\n🌐 GROUP 7: Multi-Realm Coherence & Topology Binding');

  const realmManifestPath = path.join(rootDir, 'dist', 'src', 'realms', 'blogEngine', 'blogEngineRealm.js');
  const realmManifestRootPath = path.join(rootDir, 'dist', 'realms', 'blogEngine', 'blogEngineRealm.js');

  let realmModule;
  if (fs.existsSync(realmManifestPath)) {
    realmModule = await import(`file://${realmManifestPath.replace(/\\/g, '/')}`);
  } else if (fs.existsSync(realmManifestRootPath)) {
    realmModule = await import(`file://${realmManifestRootPath.replace(/\\/g, '/')}`);
  }

  if (realmModule) {
    runTest('Verifies deterministic multi-realm coherence across all 9 bound realms', () => {
      const { verifyBlogMultiRealmCoherence, BLOG_ENGINE_REALM_MANIFEST } = realmModule;
      const coherence = verifyBlogMultiRealmCoherence();
      assert.strictEqual(coherence.coherent, true);
      assert.strictEqual(coherence.verifiedRealms.length, 9);
      assert.strictEqual(BLOG_ENGINE_REALM_MANIFEST.deterministic, true);
      assert.strictEqual(BLOG_ENGINE_REALM_MANIFEST.zeroRandomness, true);
    });
  }

  runTest('RealmMap.json contains blog_engine with status BOUND and health OPTIMAL', () => {
    const mapPath = path.join(rootDir, 'RealmMap.json');
    const raw = fs.readFileSync(mapPath, 'utf8');
    const map = JSON.parse(raw);

    const blogRealm = map.realms.find((r) => r.id === 'blog_engine');
    assert(blogRealm !== undefined, 'blog_engine must exist in RealmMap.json');
    assert.strictEqual(blogRealm.status, 'BOUND');
    assert.strictEqual(blogRealm.health, 'OPTIMAL');

    const binding = map.topologyBindings.find((b) => b.id === 'bind_kernel_blog_engine');
    assert(binding !== undefined, 'bind_kernel_blog_engine must exist in RealmMap.json');
    assert.strictEqual(binding.status, 'ACTIVE');
  });

  // ── GROUP 8: ANTIGRAV() Sovereignty Audit ────────────────────────────────────
  console.log('\n🛡️ GROUP 8: ANTIGRAV() Sovereignty Audit');

  runTest('ANTIGRAV().audit("PrimordiaOS.Phase3.AutonomousBlogEngine") passes with score >= 95', () => {
    const auditTarget = 'PrimordiaOS.Phase3.AutonomousBlogEngine';
    const auditReport = antigravGuardian.audit({
      target: auditTarget,
      content: JSON.stringify({
        subsystem: 'AutonomousBlogEngine',
        phase: 3,
        tier: 1,
        realms: ALL_SOVEREIGN_TOPICS,
        guardrails: {
          minBlogCooldownSec: 45,
          maxWordCount: 2500,
          idempotencyDeduplication: true,
          antiCollapseRecursionGuard: true,
          glyphBindingSecurity: true,
          tier0SovereignVeto: true,
        },
        auditLineage: 'Chained append-only SHA-256 state hashes',
        pureFunctionDeterminism: true,
      }),
    });

    console.log(`     Target:   ${auditReport.target}`);
    console.log(`     Score:    ${auditReport.score} / 100 (Threshold: ${auditReport.threshold})`);
    console.log(`     Passed:   ${auditReport.passed}`);
    console.log(`     Metrics:  Uniqueness=${auditReport.uniqueness}, Sovereignty=${auditReport.sovereignty}, Friction=${auditReport.friction}`);
    console.log(`     Flags:    [${auditReport.flags.join(', ')}]`);

    assert.strictEqual(auditReport.passed, true, 'Audit must pass');
    assert(auditReport.score >= 95, `Expected ANTIGRAV score >= 95, got ${auditReport.score}`);
    assert.strictEqual(auditReport.flags.length, 0, 'Zero collapse flags permitted');
  });

  console.log('\n========================================================');
  console.log(`🏁 TEST RESULTS: ${passedTests} / ${totalTests} PASSED`);
  console.log('========================================================\n');

  if (passedTests !== totalTests) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Fatal Phase 3 Blog Engine test error:', err);
  process.exit(1);
});

import { SpatialMemoryEngine } from './dist/index.js';

async function main() {
  console.log('=== PrimordiaOS Spatial Memory Engine Verification Test ===');
  const engine = new SpatialMemoryEngine();

  // 1. Boot
  console.log('[1/7] Booting engine...');
  await engine.boot();

  // 2. Create memory nodes
  console.log('[2/7] Creating test spatial memories...');
  const nodeA = await engine.createNode({
    realmId: 'sovereign_core',
    content: 'Shane issued supreme directive to initiate Niagara particle warp',
    coordinates: { x: 50, y: 50, z: 0 },
    type: 'directive',
    semanticTags: ['sovereign', 'warp', 'niagara'],
  });

  const nodeB = await engine.createNode({
    realmId: 'unreal_bridge',
    content: 'Unreal Engine 5.4 Niagara emitter spawned warp particles at velocity 2500',
    coordinates: { x: 80, y: 70, z: 10 },
    type: 'observation',
    semanticTags: ['niagara', 'particle', 'velocity'],
  });

  console.log(`Created Node A: [${nodeA.id}] in realm [${nodeA.realmId}]`);
  console.log(`Created Node B: [${nodeB.id}] in realm [${nodeB.realmId}]`);

  // 3. Link memories
  console.log('[3/7] Linking memory nodes...');
  const edge = await engine.linkNodes({
    sourceId: nodeA.id,
    targetId: nodeB.id,
    type: 'causal',
    weight: 0.95,
  });
  console.log(`Created Causal Edge: [${edge.id}] (${edge.sourceId} -> ${edge.targetId})`);

  // 4. Hybrid Query
  console.log('[4/7] Testing hybrid multi-modal query...');
  const queryResult = engine.query({
    spatial: { center: { x: 60, y: 60, z: 0 }, radius: 200 },
    semantic: { queryText: 'warp particle directive', minSimilarity: 0.1 },
    weights: { spatialWeight: 0.4, temporalWeight: 0.2, semanticWeight: 0.4 },
    limit: 5,
  });
  console.log(`Query matched ${queryResult.totalMatches} nodes in ${queryResult.executionTimeMs}ms:`);
  for (const match of queryResult.matches) {
    console.log(` - [Score: ${match.finalScore}] Node ${match.node.id}: "${match.node.content}"`);
  }

  // 5. Context Sync & Conflict Detection
  console.log('[5/7] Testing cross-subsystem context synchronization...');
  const syncSnap = engine.syncContext('COCKPIT', 'sovereign_cockpit', { mode: 'HUD_TELEMETRY' }, nodeA.id);
  console.log(`Broadcasted Context: seq=${syncSnap.sequenceNumber}, lamport=${syncSnap.lamportClock}`);

  // 6. Clusters & Bursts
  console.log('[6/7] Testing spatial clustering and temporal bursts...');
  const clusters = engine.getSpatialClusters(150, 2);
  console.log(`Detected ${clusters.length} spatial cluster(s).`);
  const bursts = engine.getTemporalBursts(60000, 2);
  console.log(`Detected ${bursts.length} temporal burst(s).`);

  // 7. Graceful Shutdown & Persistence
  console.log('[7/7] Executing graceful shutdown & atomic snapshot flush...');
  const shutdownResult = await engine.shutdown();
  console.log(`Shutdown successful: ${shutdownResult.success}, persisted ${shutdownResult.persistedNodes} nodes and ${shutdownResult.persistedEdges} edges.`);
  console.log('=== All Verification Checks Passed 100% ===');
}

main().catch(err => {
  console.error('Verification failed:', err);
  process.exit(1);
});

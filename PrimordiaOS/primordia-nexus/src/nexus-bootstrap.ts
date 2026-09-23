// src/nexus-bootstrap.ts

import { EventBus } from '../primordia-core/shared/event-bus';
import { Config } from '../primordia-core/shared/config';

import { VisionCore } from '../primordia-core/vision/vision-core';
import { OsmiumLedger } from '../primordia-core/osmium/osmium-ledger';
import { SnapshotManager } from '../primordia-core/osmium/snapshots';

import { AntigravityPipeline } from '../primordia-core/pipelines/antigravity-pipeline';
import { PipelineRegistry } from '../primordia-core/pipelines/pipeline-registry';

import { UnrealBridge } from '../primordia-core/unreal/unreal-bridge';
import { SimulationSync } from '../primordia-core/unreal/simulation-sync';

import { AgentRegistry } from '../primordia-core/agents/agent-registry';
import { DiagnosticAgent } from '../primordia-core/agents/diagnostic-agent';
import { ExecutionAgent } from '../primordia-core/agents/execution-agent';
import { OpportunityAgent } from '../primordia-core/agents/opportunity-agent';
import { AuditAgent } from '../primordia-core/agents/audit-agent';
import { MobileNodeAgent } from '../primordia-core/agents/mobile-node-agent';

import { bootstrapVoice } from '../primordia-core/voice/voice-bootstrap';

export async function bootstrapNexus() {
  console.log('🔮 PrimordiaOS Nexus Booting...');

  const eventBus = new EventBus();
  const config = new Config();

  const visionCore = new VisionCore({ eventBus, config });
  const osmium = new OsmiumLedger({ eventBus, config });
  const snapshots = new SnapshotManager();

  const pipelineRegistry = new PipelineRegistry({
    eventBus,
    config,
    visionCore,
    osmium,
  });

  pipelineRegistry.registerDefaults();

  const unrealBridge = new UnrealBridge({ eventBus, config });

  const simulationSync = new SimulationSync({
    eventBus,
    config,
    unrealBridge,
    visionCore,
  });

  const agentRegistry = new AgentRegistry({
    eventBus,
    config,
    visionCore,
    osmium,
    antigravity: pipelineRegistry.get('antigravity'),
    unreal: unrealBridge,
  });

  agentRegistry.register(new DiagnosticAgent({ eventBus, config, visionCore, osmium, antigravity: pipelineRegistry.get('antigravity'), unreal: unrealBridge }));
  agentRegistry.register(new ExecutionAgent({ eventBus, config, visionCore, osmium, antigravity: pipelineRegistry.get('antigravity'), unreal: unrealBridge }));
  agentRegistry.register(new OpportunityAgent({ eventBus, config, visionCore, osmium, antigravity: pipelineRegistry.get('antigravity'), unreal: unrealBridge }));
  agentRegistry.register(new AuditAgent({ eventBus, config, visionCore, osmium, antigravity: pipelineRegistry.get('antigravity'), unreal: unrealBridge }));
  agentRegistry.register(new MobileNodeAgent({ eventBus, config, visionCore, osmium, antigravity: pipelineRegistry.get('antigravity'), unreal: unrealBridge }));

  await visionCore.start();
  await osmium.start();
  await pipelineRegistry.start();
  await unrealBridge.start();
  await simulationSync.start();
  await agentRegistry.start();

  const voice = await bootstrapVoice(eventBus, config);

  console.log('🌌 PrimordiaOS Nexus Online');

  return {
    eventBus,
    config,
    visionCore,
    osmium,
    snapshots,
    pipelineRegistry,
    unrealBridge,
    simulationSync,
    agentRegistry,
    voice,
  };
}

bootstrapNexus().catch((err) => {
  console.error('❌ Nexus Boot Failure:', err);
});

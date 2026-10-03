import "./core/bootstrap";
import { kernel } from "./core/kernel";
import { primordiaFlow } from "./primordiaflow";
import { worldgen } from "./worldgen";
import { visionCore } from "./vision-core";
import { vessels } from "./vessels";
import { unrealBridge } from "./unreal-bridge";
import { ascensionLayer } from "./ascension-layer";
import { metaFlow } from "./meta-flow";
import { selfModificationEngine } from "./self-modification-engine";
import { overascensionPrime } from "./overascension-prime";
import { primeKernel } from "./prime-kernel";
import { readFileSync } from "fs";

interface BuildTask {
  name: string;
  path: string;
  spec: string;
}

interface BuildGraph {
  version: string;
  root: string;
  tasks: BuildTask[];
}

function loadGraph(): BuildGraph {
  const raw = readFileSync("primordiaos.buildgraph.json", "utf8");
  return JSON.parse(raw) as BuildGraph;
}

async function startAutonomy(): Promise<void> {
  await kernel.startAll();
  console.log("[AutonomyMode] Kernel started.");

  const graph = loadGraph();
  primordiaFlow.register({
    id: "primordiaos.autonomous.build",
    nodes: graph.tasks.map(t => ({
      id: t.name,
      type: "build-task",
      config: t
    })),
    edges: []
  });

  console.log("[AutonomyMode] Registered autonomous build flow.");

  setInterval(async () => {
    console.log("[AutonomyMode] Triggering autonomous build...");
    await primordiaFlow.execute("primordiaos.autonomous.build", {
      reason: "autonomy-mode",
      timestamp: Date.now()
    });

    await worldgen.pulse();
    await visionCore.snapshot();
    await vessels.pulseAll();
    await unrealBridge.pulse();
    await ascensionLayer.pulse();
    await metaFlow.pulse();
    await selfModificationEngine.pulse();
    await overascensionPrime.pulse();
    await primeKernel.pulse();
  }, 60000);
}

startAutonomy().catch(err => {
  console.error("[AutonomyMode] Failed:", err);
  process.exit(1);
});

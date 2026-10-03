import { primordiaFlow } from "./primordiaflow";
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
  return JSON.parse(raw);
}

async function autonomousBuildLoop() {
  const graph = loadGraph();
  primordiaFlow.register({
    id: "primordiaos.build",
    nodes: graph.tasks.map(t => ({
      id: t.name,
      type: "build-task",
      config: t,
    })),
    edges: [],
  });

  while (true) {
    console.log("[Autonomy] Triggering PrimordiaOS build flow...");
    await primordiaFlow.execute("primordiaos.build", { reason: "periodic" });
    await new Promise(r => setTimeout(r, 30000));
  }
}

autonomousBuildLoop().catch(err => {
  console.error("[Autonomy] Failed:", err);
  process.exit(1);
});

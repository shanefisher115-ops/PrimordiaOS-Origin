import { readFileSync } from "fs";
import { join } from "path";

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

async function runTask(task: BuildTask) {
  console.log(\[GraphRunner] Building \ at \ (spec: \)\);
  // Placeholder: here you call Jules / PrimordiaFlow / agents.
}

async function main() {
  const graph = loadGraph();
  console.log("[GraphRunner] Loaded graph version", graph.version);
  for (const task of graph.tasks) {
    await runTask(task);
  }
}

main().catch(err => {
  console.error("[GraphRunner] Failed:", err);
  process.exit(1);
});

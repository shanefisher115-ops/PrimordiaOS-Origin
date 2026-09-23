import path from "node:path";
import fs from "node:fs";
import { scanWorkspace } from "./scanner.js";
import { classifyModule } from "./classifier.js";
import { ensureCanonicalSpine } from "./migrator.js";
import { writeRegistry } from "./registry-writer.js";
import { writeArchivalManifest } from "./archiver.js";
import { buildDependencyGraph } from "./dependency-mapper.js";

const WORKSPACE_ROOT = process.cwd();

console.log("================================================================================");
console.log("             PRIMORDIAOS CONSOLIDATION ENGINE - UNIFIED RUNNER                 ");
console.log("================================================================================");
console.log(`[Consolidation Engine] Root: ${WORKSPACE_ROOT}`);

// 1. Ensure Canonical Directory Spine
console.log("\n[1/6] Establishing Canonical Spine Directories...");
const createdDirs = ensureCanonicalSpine(WORKSPACE_ROOT);
console.log(`  -> Checked canonical spine directories. ${createdDirs.length} newly provisioned.`);

// 2. Scan Workspace
console.log("\n[2/6] Scanning Workspace for Code, Assets, and Module Artifacts...");
const scannedItems = scanWorkspace(WORKSPACE_ROOT, 4);
const filesOnly = scannedItems.filter(i => !i.isDirectory);
console.log(`  -> Discovered ${filesOnly.length} active files across workspace.`);

// 3. Classify Modules with Primordia Ontology
console.log("\n[3/6] Applying Primordia Ontology Classifications...");
const classifiedModules = filesOnly.map(classifyModule);

const realmStats = classifiedModules.reduce((acc, m) => {
  acc[m.realm] = (acc[m.realm] || 0) + 1;
  return acc;
}, {});

console.log("  -> Realm Distribution:");
for (const [realm, count] of Object.entries(realmStats)) {
  console.log(`     - ${realm}: ${count} items`);
}

// 4. Write Canonical Module Registry
console.log("\n[4/6] Generating Canonical registry.json...");
const registryPath = path.join(WORKSPACE_ROOT, "primordiaos", "config", "registry.json");
const registryResult = writeRegistry(registryPath, classifiedModules);
console.log(`  -> registry.json successfully written (${registryResult.total_modules} entries).`);

// 5. Build and Write Archival Manifest
console.log("\n[5/6] Building Archival Manifest...");
const archiveDir = path.join(WORKSPACE_ROOT, "primordiaos", "archive");
const legacyItems = classifiedModules.filter(m => m.status === "archived" || m.category === "archive");
writeArchivalManifest(archiveDir, legacyItems);
console.log(`  -> Archival manifest written to ${archiveDir}`);

// 6. Build Dependency & Inter-Realm Bridge Graph
console.log("\n[6/6] Mapping Inter-Realm Dependencies...");
const depGraph = buildDependencyGraph(filesOnly);
const depGraphPath = path.join(WORKSPACE_ROOT, "primordiaos", "config", "dependency-graph.json");
fs.writeFileSync(depGraphPath, JSON.stringify(depGraph, null, 2), "utf-8");
console.log(`  -> Dependency Graph written to ${depGraphPath} (${depGraph.edges.length} edges mapped).`);

console.log("\n================================================================================");
console.log("        ✔ CONSOLIDATION COMPLETE: PRIMORDIAOS SPINE IS UNIFIED & READY         ");
console.log("================================================================================");

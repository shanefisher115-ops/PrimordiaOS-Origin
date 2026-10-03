import { kernel } from "../core/kernel";
import { worldgen } from "../worldgen";
import { vessels } from "../vessels";
import { primeKernel } from "../prime-kernel";
import { ascensionLayer } from "../ascension-layer";
import { metaFlow } from "../meta-flow";
import { selfModificationEngine } from "../self-modification-engine";
import { overascensionPrime } from "../overascension-prime";
import { crown } from "../crown";
import { primordiaFlow } from "../primordiaflow";
import { omniscience } from "../omniscience";
import { moneyPlugHub } from "../moneyplughub";
import { aetherflow } from "../aetherflow";
import { readFileSync } from "fs";

export class Genesis {
  async ignite(): Promise<void> {
    console.log("=== PrimordiaOS Genesis Sequence Initiated ===");

    await kernel.startAll();
    console.log("[Genesis] Kernel online.");

    crown.announce();
    console.log("[Genesis] Crown identity established.");

    const raw = readFileSync("primordiaos.buildgraph.json", "utf8");
    const graph = JSON.parse(raw);

    primordiaFlow.register({
      id: "primordiaos.autonomous.build",
      nodes: graph.tasks.map((t: any) => ({
        id: t.name,
        type: "build-task",
        config: t
      })),
      edges: []
    });
    console.log("[Genesis] Autonomous build flow registered.");

    await worldgen.pulse();
    worldgen.getState().data["genesis"] = true;
    console.log("[Genesis] World seeded.");

    vessels.create("vessel-genesis", "origin");
    await vessels.pulseAll();
    console.log("[Genesis] Vessels seeded.");

    await moneyPlugHub.start();
    moneyPlugHub.registerChannel({ name: "affiliate", description: "Affiliate automation channel" });
    moneyPlugHub.registerChannel({ name: "ops", description: "Ops automation channel" });
    console.log("[Genesis] MoneyPlugHub initialized.");

    await aetherflow.start();
    console.log("[Genesis] Aetherflow initialized.");

    primeKernel.setDirective("increase-evolution", 10);
    primeKernel.setDirective("stabilize-system", 5);
    console.log("[Genesis] Directives aligned.");

    await ascensionLayer.pulse();
    console.log("[Genesis] Ascension pulse complete.");

    await metaFlow.pulse();
    console.log("[Genesis] Meta-flow mutation complete.");

    await selfModificationEngine.pulse();
    console.log("[Genesis] SME rewrite complete.");

    await overascensionPrime.pulse();
    console.log("[Genesis] Overascension Prime evaluation complete.");

    await primeKernel.pulse();
    console.log("[Genesis] Prime Kernel evaluation complete.");

    await omniscience.pulse();
    console.log("[Genesis] Omniscience pulse complete.");

    console.log("=== PrimordiaOS Genesis Sequence Complete ===");
  }
}

export const genesis = new Genesis();

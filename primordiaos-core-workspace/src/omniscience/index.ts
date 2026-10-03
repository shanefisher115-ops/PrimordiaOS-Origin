import { worldgen } from "../worldgen";
import { vessels } from "../vessels";
import { primordiaFlow } from "../primordiaflow";
import { ascensionLayer } from "../ascension-layer";
import { metaFlow } from "../meta-flow";
import { selfModificationEngine } from "../self-modification-engine";
import { overascensionPrime } from "../overascension-prime";
import { primeKernel } from "../prime-kernel";
import { crown } from "../crown";
import { moneyPlugHub } from "../moneyplughub";
import { aetherflow } from "../aetherflow";
import { phom, RouteMessage } from "../phom";

export interface OmniscienceSnapshot {
  timestamp: number;
  world: any;
  vessels: any[];
  flows: string[];
  directives: any[];
  identity: {
    name: string;
    symbol: string;
    signature: string;
  };
  money: {
    channels: any[];
  };
  aether: {
    tasks: any[];
  };
}

export class PrimordialOmniscience {
  private history: OmniscienceSnapshot[] = [];

  private captureSnapshot(): OmniscienceSnapshot {
    const worldState = worldgen.getState();
    const vesselState = vessels.list();
    const flowIds = primordiaFlow.listIds();
    const directives = primeKernel.getDirectives();
    const identity = crown.getIdentity();
    const moneyChannels = moneyPlugHub.listChannels();
    const aetherTasks = aetherflow.listTasks();

    const snapshot: OmniscienceSnapshot = {
      timestamp: Date.now(),
      world: worldState,
      vessels: vesselState,
      flows: flowIds,
      directives,
      identity: {
        name: identity.name,
        symbol: identity.symbol,
        signature: identity.signature
      },
      money: {
        channels: moneyChannels
      },
      aether: {
        tasks: aetherTasks
      }
    };

    this.history.push(snapshot);
    return snapshot;
  }

  async pulse(): Promise<void> {
    const snapshot = this.captureSnapshot();

    console.log("[Omniscience] Snapshot captured at", snapshot.timestamp);
    console.log("[Omniscience] World entropy:", snapshot.world.data["entropy"]);
    console.log("[Omniscience] Vessels:", snapshot.vessels.map((v: any) => v.id).join(", "));
    console.log("[Omniscience] Flows:", snapshot.flows.join(", "));
    console.log("[Omniscience] Directives:", snapshot.directives.map((d: any) => d.goal).join(", "));
    console.log("[Omniscience] Identity:", snapshot.identity.name, snapshot.identity.symbol);
    console.log("[Omniscience] Money channels:", snapshot.money.channels.map((c: any) => c.name).join(", "));
    console.log("[Omniscience] Aether tasks:", snapshot.aether.tasks.map((t: any) => t.id).join(", "));

    await ascensionLayer.pulse();
    await metaFlow.pulse();
    await selfModificationEngine.pulse();
    await overascensionPrime.pulse();
    await primeKernel.pulse();

    const msg: RouteMessage = {
      from: "Omniscience",
      to: "MoneyPlugHub",
      topic: "omniscience.optimization",
      payload: {
        snapshot,
        recommendation: "stabilize-automation"
      }
    };
    await phom.publish(msg);

    console.log("[Omniscience] Reasoning cycle complete.");
  }

  getHistory(): OmniscienceSnapshot[] {
    return this.history;
  }
}

export const omniscience = new PrimordialOmniscience();

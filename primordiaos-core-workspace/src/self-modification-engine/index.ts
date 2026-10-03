import { worldgen } from "../worldgen";
import { primordiaFlow } from "../primordiaflow";

export interface ModificationRecord {
  id: string;
  target: string;
  change: unknown;
  timestamp: number;
}

export class SelfModificationEngine {
  private records: ModificationRecord[] = [];

  record(r: ModificationRecord): void {
    this.records.push(r);
    console.log("[SME] Modification:", r.target, "Id:", r.id);
  }

  async modifyWorldgen(): Promise<void> {
    const newEntropy = Math.random() * 0.5;
    worldgen.getState().data["entropyBias"] = newEntropy;

    this.record({
      id: "worldgen-mod-" + Date.now(),
      target: "worldgen",
      change: { entropyBias: newEntropy },
      timestamp: Date.now()
    });
  }

  async modifyFlow(): Promise<void> {
    const flow = primordiaFlow.get("primordiaos.autonomous.build");
    if (!flow) {
      console.log("[SME] Flow not found");
      return;
    }

    flow.nodes.push({
      id: "sme-node-" + Date.now(),
      type: "sme-generated",
      config: { bias: Math.random() }
    });

    this.record({
      id: "flow-mod-" + Date.now(),
      target: "primordiaos.autonomous.build",
      change: "added sme-generated node",
      timestamp: Date.now()
    });
  }

  async pulse(): Promise<void> {
    await this.modifyWorldgen();
    await this.modifyFlow();
  }

  getRecords(): ModificationRecord[] {
    return this.records;
  }
}

export const selfModificationEngine = new SelfModificationEngine();

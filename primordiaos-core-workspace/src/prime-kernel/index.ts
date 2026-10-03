import { worldgen } from "../worldgen";
import { ascensionLayer } from "../ascension-layer";
import { metaFlow } from "../meta-flow";
import { selfModificationEngine } from "../self-modification-engine";
import { overascensionPrime } from "../overascension-prime";

export interface PrimeDirective {
  id: string;
  goal: string;
  priority: number;
  timestamp: number;
}

export class PrimeKernel {
  private directives: PrimeDirective[] = [];

  setDirective(goal: string, priority: number): void {
    const d: PrimeDirective = {
      id: "directive-" + Date.now(),
      goal: goal,
      priority: priority,
      timestamp: Date.now()
    };

    this.directives.push(d);
    console.log("[PrimeKernel] Directive set:", goal, "Priority:", priority);
  }

  async evaluate(): Promise<void> {
    const world = worldgen.getState();
    const entropy = world.data["entropy"] ?? 0;

    const top = this.directives.sort((a, b) => b.priority - a.priority)[0];
    if (!top) {
      console.log("[PrimeKernel] No directives");
      return;
    }

    console.log("[PrimeKernel] Evaluating directive:", top.goal);

    if (top.goal === "increase-evolution") {
      if (entropy < 0.5) {
        await ascensionLayer.pulse();
        await metaFlow.pulse();
        await selfModificationEngine.pulse();
      }
    }

    if (top.goal === "stabilize-system") {
      if (entropy > 0.7) {
        await overascensionPrime.pulse();
      }
    }
  }

  async pulse(): Promise<void> {
    await this.evaluate();
  }

  getDirectives(): PrimeDirective[] {
    return this.directives;
  }
}

export const primeKernel = new PrimeKernel();

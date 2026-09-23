// realms/monetization/monetizationRealmAdapter.ts

import { signalBus } from "../../state/signalBus";
import { realmRegistry } from "../../state/realmRegistry";
import { memoryGraph } from "../../state/memoryGraphInstance";

export class MonetizationRealmAdapter {
  recordRevenue(amount: number, source: string) {
    const timestamp = Date.now();

    realmRegistry.markActive("monetization");

    signalBus.emit({
      id: `monetization-revenue-${timestamp}`,
      realm: "monetization",
      strength: Math.min(1, amount / 100),
      payload: { amount, source },
      timestamp,
    });

    memoryGraph.upsertNode({
      id: `monetization-mem-${timestamp}`,
      kind: "RevenueEvent",
      label: source,
      importance: 0.6,
      payload: { amount, source },
      timestamp,
    });
  }

  recordConversion(rate: number) {
    const timestamp = Date.now();

    realmRegistry.markActive("monetization");

    signalBus.emit({
      id: `monetization-conversion-${timestamp}`,
      realm: "monetization",
      strength: rate,
      payload: { rate },
      timestamp,
    });

    memoryGraph.upsertNode({
      id: `monetization-conv-${timestamp}`,
      kind: "ConversionEvent",
      label: "conversion",
      importance: 0.4,
      payload: { rate },
      timestamp,
    });
  }
}

export const monetizationRealm = new MonetizationRealmAdapter();

import React from "react";
import { SchemaHUD } from "../hud/schema/index.js";
import { FinancialHUD } from "../hud/financial/index.js";
import { AgentHUD } from "../hud/agents/index.js";
import { MemoryHUD } from "../hud/memory/index.js";
import { SimulationHUD } from "../hud/simulation/index.js";

export function RealmManager({ currentRealm = "schema" }) {
  const os = typeof window !== "undefined" && window.PrimordiaOS ? window.PrimordiaOS : {};

  switch (currentRealm) {
    case "schema":
      return (
        <SchemaHUD
          ledger={os.schema?.ledger || []}
          diffs={os.schema?.diffs || ""}
          environments={os.schema?.environments || { dev: true, staging: true, production: true }}
          pulse={true}
          commentary={os.schema?.commentary || []}
          voiceLines={os.schema?.voiceLines || []}
        />
      );
    case "financial":
      return <FinancialHUD data={os.finance || {}} />;
    case "agents":
      return <AgentHUD agents={os.agents || []} />;
    case "memory":
      return <MemoryHUD timeline={os.timeline || []} />;
    case "simulation":
      return <SimulationHUD sim={os.simulation || {}} />;
    default:
      return <SchemaHUD ledger={os.schema?.ledger || []} />;
  }
}

export default RealmManager;


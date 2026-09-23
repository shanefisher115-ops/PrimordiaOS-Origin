// primordia/core/registry.ts
import { DirectorAgent } from "../mcp/director/director.js";
import { RealmAgent } from "./agents.js";

export const REALM_AGENTS: RealmAgent[] = [
  {
    id: "director",
    realm: "cinema",
    run: (payload) => {
      const agent = new DirectorAgent();
      return agent.runProduction(payload.brief);
    }
  }
];

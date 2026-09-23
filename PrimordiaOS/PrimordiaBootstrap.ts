// ======================================================
// PRIMORDIAOS — BOOTSTRAP
// ======================================================
// Responsibilities:
// - Initialize OS
// - Load realms
// - Load agents
// - Apply configuration
// ======================================================

import { PrimordiaOS } from "./PrimordiaOS";
import { PrimordiaConfig } from "./PrimordiaConfig";

export class PrimordiaBootstrap {
    static async init(config: PrimordiaConfig) {
        const os = new PrimordiaOS();

        // Load realms
        config.realms.forEach(r => os.realms.register(r));

        // Load agents
        config.agents.forEach(a => os.agents.createAgent(a.id, a.sovereignty, a.capabilities));

        return os;
    }
}

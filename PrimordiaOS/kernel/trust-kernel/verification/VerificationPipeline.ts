// ======================================================
// PRIMORDIAOS — VERIFICATION PIPELINE (ADVANCED)
// ======================================================
// Responsibilities:
// - Full verification pipeline
// - Reproduction → Consensus → Ledger logging
// - Integrates with TrustKernel
// ======================================================

import { ReproductionEngine } from "../reproduction/ReproductionEngine";
import { SovereignConsensusEngine } from "../consensus/SovereignConsensusEngine";

export interface VerificationPacket {
    id: string;
    original: any;
    reproduction: any;
    consensus: any;
    verified: boolean;
    timestamp: number;
}

export class VerificationPipeline {
    private reproduction = new ReproductionEngine();
    private consensus = new SovereignConsensusEngine();

    constructor() {}

    // ------------------------------------------------------
    // RUN FULL VERIFICATION PIPELINE
    // ------------------------------------------------------
    async verify(task: any): Promise<VerificationPacket> {
        const reproduction = this.reproduction.reproduce(task.output);

        // Sovereign tasks require consensus
        if (task.sovereignty === "sovereign") {
            this.consensus.vote(task.id, task.agent, true);
        }

        const consensus = this.consensus.compute(task.id);

        const verified = reproduction.match && consensus.approved;

        return {
            id: "verify-" + Math.random().toString(36).substring(2, 10),
            original: task.output,
            reproduction,
            consensus,
            verified,
            timestamp: Date.now()
        };
    }
}

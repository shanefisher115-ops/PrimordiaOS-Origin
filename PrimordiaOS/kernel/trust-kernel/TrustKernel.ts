// ======================================================
// PRIMORDIAOS — TRUST KERNEL (MASTER ORCHESTRATOR)
// ======================================================
// Wires together:
// - Academic Verification Bus (AVB)
// - Attribution Governor
// - Knowledge Graph
// - Ledger
// - Replay Engine
// - SDC Interpreter
// - Consensus + Reproduction engines (from AVB)
// ======================================================

import { AcademicVerificationBus } from "./avb/AcademicVerificationBus";
import { AttributionGovernor } from "./attribution/AttributionGovernor";
import { KnowledgeGraph } from "./knowledge-graph/KnowledgeGraph";
import { Ledger } from "./ledger/Ledger";
import { ReplayEngine } from "./replay/ReplayEngine";
import { SDCInterpreter } from "./sdc/SDCInterpreter";

export class TrustKernel {
    avb: AcademicVerificationBus;
    attribution: AttributionGovernor;
    graph: KnowledgeGraph;
    ledger: Ledger;
    replay: ReplayEngine;
    sdc: SDCInterpreter;

    constructor() {
        this.avb = new AcademicVerificationBus();
        this.attribution = new AttributionGovernor();
        this.graph = new KnowledgeGraph();
        this.ledger = new Ledger();
        this.replay = new ReplayEngine();
        this.sdc = new SDCInterpreter();
    }

    // ------------------------------------------------------
    // VERIFY CLAIM
    // ------------------------------------------------------
    async verifyClaim(claim: any) {
        const verification = await this.avb.verify(claim);

        this.ledger.write("verification", verification);
        this.graph.addNode(verification.id, "verification", verification);
        this.graph.addEdge(claim.id, verification.id, "verified_by");

        return verification;
    }

    // ------------------------------------------------------
    // RECORD ATTRIBUTION
    // ------------------------------------------------------
    recordAttribution(id: string, lineage: any[]) {
        const record = this.attribution.recordAttribution(id, lineage);
        this.ledger.write("attribution", record);
        return record;
    }

    // ------------------------------------------------------
    // SNAPSHOT FOR REPLAY
    // ------------------------------------------------------
    snapshot(state: any, events: any[]) {
        const ledgerState = this.ledger.readAll();
        return this.replay.createSnapshot(state, events, ledgerState);
    }

    // ------------------------------------------------------
    // RESTORE SNAPSHOT
    // ------------------------------------------------------
    restore(snapshot: any) {
        return this.replay.restore(snapshot);
    }
}

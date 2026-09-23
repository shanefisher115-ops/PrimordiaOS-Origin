// ======================================================
// PRIMORDIAOS — SOVEREIGN CONSENSUS ENGINE
// ======================================================
// Responsibilities:
// - Consensus for sovereign-level tasks
// - Multi-agent voting
// - Deterministic consensus result
// ======================================================

export interface ConsensusVote {
    agent: string;
    vote: boolean;
    timestamp: number;
}

export interface ConsensusResult {
    taskId: string;
    approved: boolean;
    votes: ConsensusVote[];
    timestamp: number;
}

export class SovereignConsensusEngine {
    private votes: Map<string, ConsensusVote[]> = new Map();

    constructor() {}

    // ------------------------------------------------------
    // CAST VOTE
    // ------------------------------------------------------
    vote(taskId: string, agent: string, approve: boolean) {
        if (!this.votes.has(taskId)) {
            this.votes.set(taskId, []);
        }

        this.votes.get(taskId)!.push({
            agent,
            vote: approve,
            timestamp: Date.now()
        });
    }

    // ------------------------------------------------------
    // COMPUTE CONSENSUS
    // ------------------------------------------------------
    compute(taskId: string): ConsensusResult {
        const votes = this.votes.get(taskId) || [];

        const approvals = votes.filter(v => v.vote).length;
        const rejections = votes.length - approvals;

        return {
            taskId,
            approved: approvals > rejections,
            votes,
            timestamp: Date.now()
        };
    }

    // ------------------------------------------------------
    // CLEAR (REPLAY MODE)
    // ------------------------------------------------------
    clear() {
        this.votes.clear();
    }
}

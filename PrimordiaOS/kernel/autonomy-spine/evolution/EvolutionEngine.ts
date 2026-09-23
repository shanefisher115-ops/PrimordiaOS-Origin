// ======================================================
// PRIMORDIAOS — EVOLUTION ENGINE
// ======================================================
// Responsibilities:
// - Agent learning and adaptation
// - Reinforcement signals from task results
// - Sovereignty-aware evolution
// - Lineage tracking
// - Replay-safe mutation
// ======================================================

export interface EvolutionRecord {
    agent: string;
    reward: number;
    mutation: any;
    timestamp: number;
}

export class EvolutionEngine {
    private history: EvolutionRecord[] = [];
    private agentProfiles: Map<string, any> = new Map();

    constructor() {}

    // ------------------------------------------------------
    // MAIN ENTRYPOINT — LEARN FROM RESULT
    // ------------------------------------------------------
    learn(result: any) {
        const agent = result.agent;
        const reward = this.computeReward(result);

        const mutation = this.mutate(agent, reward);

        const record: EvolutionRecord = {
            agent,
            reward,
            mutation,
            timestamp: Date.now()
        };

        this.history.push(record);

        // Update agent profile
        const profile = this.agentProfiles.get(agent) || {
            skill: 0,
            reliability: 0,
            sovereignty: "low"
        };

        profile.skill += reward * 0.1;
        profile.reliability += reward * 0.05;

        this.agentProfiles.set(agent, profile);

        return record;
    }

    // ------------------------------------------------------
    // REWARD COMPUTATION
    // ------------------------------------------------------
    private computeReward(result: any): number {
        // Basic reward: success = +10, failure = -5
        if (result.output && typeof result.output === "string") {
            return result.output.includes("Executed") ? 10 : -5;
        }
        return 0;
    }

    // ------------------------------------------------------
    // MUTATION LOGIC (REPLAY-SAFE)
    // ------------------------------------------------------
    private mutate(agent: string, reward: number) {
        const seed = agent.length * reward;
        return {
            deltaSkill: seed % 3,
            deltaReliability: seed % 2
        };
    }

    // ------------------------------------------------------
    // GET AGENT PROFILE
    // ------------------------------------------------------
    getProfile(agent: string) {
        return this.agentProfiles.get(agent) || null;
    }

    // ------------------------------------------------------
    // GET EVOLUTION HISTORY
    // ------------------------------------------------------
    getHistory(): EvolutionRecord[] {
        return [...this.history];
    }

    // ------------------------------------------------------
    // CLEAR HISTORY (REPLAY MODE)
    // ------------------------------------------------------
    clear() {
        this.history = [];
        this.agentProfiles.clear();
    }
}

import { emitEngineEvent } from "../ws-server.ts";
export function sendAgentState(agentId, energy, status, vector) {
    emitEngineEvent({
        type: "AGENT_STATE",
        payload: { id: agentId, energy, status, vector },
    });
}

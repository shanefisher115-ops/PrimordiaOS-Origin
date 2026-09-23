import { emitEngineEvent } from "../ws-server.ts";

export function sendAgentState(agentId: string, energy: number, status: string, vector: [number, number, number]) {
  emitEngineEvent({
    type: "AGENT_STATE",
    payload: { id: agentId, energy, status, vector },
  });
}

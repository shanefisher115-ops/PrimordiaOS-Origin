export const OrchestratorState = {
  agents: {} as Record<string, {
    id: string;
    realm: string;
    status: "idle" | "busy" | "dead";
    lastHeartbeat: number;
  }>,

  tasks: [] as {
    id: string;
    payload: any;
    assignedTo?: string;
    status: "pending" | "running" | "done" | "failed";
  }[]
};

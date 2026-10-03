import { toolchain } from ".";
import { AgentTask, AgentResult } from "../agents";

export function registerDefaultTools() {
  toolchain.register({
    name: "echo",
    async run(task: AgentTask, ctx): Promise<AgentResult> {
      return { success: true, output: { realm: ctx.realm, payload: task.payload } };
    },
  });
}

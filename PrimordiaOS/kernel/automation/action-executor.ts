import { PrimordiaEvent, registerHandler, emit } from "./event-bus";
import { sendToUnreal } from "../../bridges/unreal/unreal-bridge";

export function startActionExecutor() {
  registerHandler(async (event: PrimordiaEvent) => {
    if (event.type === "world-command") {
      const cmd = event.payload.command;

      if (cmd.target === "unreal") {
        await sendToUnreal(cmd);
        await emit({
          id: `unreal-ack-${Date.now()}`,
          type: "unreal",
          source: "unreal-bridge",
          payload: { ok: true, cmd },
          timestamp: Date.now(),
        });
      }

      if (cmd.target === "cli") {
        // TODO: spawn child process, run script, etc.
      }
    }
  });
}

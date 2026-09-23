// core/daemon-orchestrator.mjs
// PrimordiaOS Daemon Orchestrator (Cinematic + Real)

import { globalEventBus } from "./event-bus.mjs";

const daemons = [];

export function registerDaemon(name, startFn) {
  daemons.push({ name, startFn });
  console.log(
    `✦ [PrimordiaOS::Daemon] Registered daemon: ${name} (realm-bound)`
  );
}

export async function startAllDaemons() {
  console.log("✦ [PrimordiaOS::Daemon] Initiating daemon constellation...");
  for (const daemon of daemons) {
    console.log(
      `✦ [PrimordiaOS::Daemon] Spinning up: ${daemon.name} (sovereign thread)`
    );
    try {
      await daemon.startFn(globalEventBus);
      console.log(
        `✦ [PrimordiaOS::Daemon] ${daemon.name} is now ONLINE (pulse stable)`
      );
    } catch (err) {
      console.error(
        `✦ [PrimordiaOS::Daemon] ${daemon.name} failed to start:`,
        err
      );
    }
  }
  globalEventBus.emit("primordia", "daemons:online", {
    timestamp: Date.now(),
  });
}

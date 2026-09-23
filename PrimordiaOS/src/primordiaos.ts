import { bootstrapIntelligenceCoordinator } from "./core/bootstrap";

console.log("===============================================");
console.log("        PrimordiaOS — System Booting           ");
console.log("===============================================");
console.log("PrimordiaOS: Registering realms...");
console.log("? Realms registered in RealmRegistry");
console.log("? Realm adapters loaded");
console.log("-----------------------------------------------");
console.log("? Realm adapters registered");
console.log("-----------------------------------------------");

async function boot() {
  const coordinator = await bootstrapIntelligenceCoordinator();
  console.log("? Intelligence Coordinator initialized");
  console.log("? Omniscience ? Horizon ? Continuity wired");
  console.log("? Subsystem instances loaded");
  console.log("-----------------------------------------------");
  console.log("? Intelligence Loop created");
  console.log("-----------------------------------------------");
  console.log("PrimordiaOS Intelligence Loop: STARTED");
  console.log("? PrimordiaOS Intelligence Loop running");
  console.log("===============================================");

  // Background execution loop
  setInterval(async () => {
    try {
      if (typeof coordinator.runCycle === 'function') {
        await coordinator.runCycle();
      }
    } catch (err: any) {
      console.error("Intelligence Loop Error:", err.message);
    }
  }, 1000);
}

boot();

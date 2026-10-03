import { kernel } from "./core/kernel";
import "./core/bootstrap";

async function main() {
  await kernel.startAll();
  console.log("PrimordiaOS kernel started.");

  const { swarm } = await import("./agents");
  const { memoryEngine } = await import("./memory-engine");
  const { phom } = await import("./phom");

  await memoryEngine.set("root", "example", { foo: "bar" });

  const results = await swarm.dispatch(
    { id: "t1", type: "general", payload: { hello: "world" } },
    {
      realm: "root",
      memory: key => memoryEngine.get("root", key),
      emit: (topic, payload) =>
        phom.publish({ from: "agents", to: "phom", topic, payload }),
    }
  );

  console.log("Swarm results:", results);
}

main().catch(err => {
  console.error("PrimordiaOS failed:", err);
  process.exit(1);
});

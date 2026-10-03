import { genesis } from "./index";

async function main(): Promise<void> {
  await genesis.ignite();
}

main().catch(err => {
  console.error("[GenesisBoot] Failed:", err);
  process.exit(1);
});

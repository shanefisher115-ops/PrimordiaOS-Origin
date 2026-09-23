// MoneyPlugHub Autonomous Loop
// PrimordiaOS — Shane Edition

import { amoUpdate } from "./amo/amo";
import { checkHypergrowth } from "./amo/hypergrowth";

import { v4 as uuid } from "uuid";
import chalk from "chalk";

// --- Primordia Kernel ---
import { primordiaKernelTick } from "./kernel/kernel";

// --- MoneyPlugHub graph + rails ---
import { buildMoneyPlugGraph } from "./moneyplug/graph";
import { runAffiliateNode } from "./moneyplug/nodes";
import { fetchOffers } from "./moneyplug/offers";

// --- Safety + loop control ---
const LOOP_INTERVAL = 5000; // 5 seconds
const MAX_DEPTH = 9999;

interface MoneyPlugState {
  loopId: string;
  depth: number;
  graph: ReturnType<typeof buildMoneyPlugGraph>;
  lastRevenue: number;
}

const state: MoneyPlugState = {
  loopId: uuid(),
  depth: 0,
  graph: buildMoneyPlugGraph(),
  lastRevenue: 0
};

async function moneyPlugTick() {
  state.depth++;

  if (state.depth > MAX_DEPTH) {
    console.log(chalk.red("MoneyPlugHub depth exceeded — auto‑reset triggered."));
    state.depth = 0;
  }

  console.log(
    chalk.green(
      `\n[MoneyPlugHub] Tick ${state.depth} — Loop ${state.loopId}`
    )
  );

  // 1. Fetch fresh offers from your rails
  const offers = await fetchOffers(state.graph);
  console.log(chalk.blue(`Fetched ${offers.length} offers.`));

  // 2. Run each affiliate node
  let revenue = 0;
  for (const node of state.graph.nodes) {
    const earned = await runAffiliateNode(node, offers);
    revenue += earned;
  }

  // 3. Update state
  state.lastRevenue = revenue;

  console.log(
    chalk.yellow(
      `Revenue this tick: $${revenue.toFixed(2)}`
    )
  );

  // --- AMO update ---
  amoUpdate(state.graph, revenue);

  // --- Hypergrowth check ---
  checkHypergrowth(state.graph, revenue);

  // --- Primordia Kernel (Unified Realm Scheduler) ---
  await primordiaKernelTick(revenue, state.depth);
}

async function main() {
  console.log(chalk.magenta("PrimordiaOS MoneyPlugHub Autonomous Loop Starting..."));
  console.log(chalk.magenta(`Loop ID: ${state.loopId}`));

  setInterval(moneyPlugTick, LOOP_INTERVAL);
}

main().catch((err) => {
  console.error("MoneyPlugHub crashed:", err);
});

// ============================================================
//  MONEYPLUGHUB // CREATOR MONEY OS
//  Location: C:/Users/Shane/Documents/dev/PrimordiaOS/apps/moneyplughub/server.mjs
//  Mode: Cinematic + Real
// ============================================================

import express from "express";
import { globalEventBus } from "../../core/event-bus.mjs";

// ============================================================
//  CINEMATIC BOOT LOGS
// ============================================================

console.log("✦ [MoneyPlugHub] Initializing Creator Money OS...");
console.log("✦ [MoneyPlugHub] Commission streams warming...");
console.log("✦ [MoneyPlugHub] Referral lattice binding...");
console.log("✦ [MoneyPlugHub] Ledger threads aligning...");

// ============================================================
//  EXPRESS SERVER
// ============================================================

const app = express();
app.use(express.json());

// ============================================================
//  IN-MEMORY LEDGER (REAL + SIMPLE)
// ============================================================

const ledger = {
  creators: {},
  referrals: [],
  commissions: [],
};

// ============================================================
//  HELPERS
// ============================================================

function ensureCreator(id) {
  if (!ledger.creators[id]) {
    ledger.creators[id] = {
      id,
      balance: 0,
      referrals: [],
      commissions: [],
    };
  }
}

// ============================================================
//  ROUTES
// ============================================================

// HEALTH CHECK
app.get("/health", (req, res) => {
  res.json({ status: "MoneyPlugHub online", pulse: Date.now() });
});

// REGISTER CREATOR
app.post("/creator/register", (req, res) => {
  const { id } = req.body;
  ensureCreator(id);

  globalEventBus.emit("money", "creator:registered", { id });

  res.json({
    ok: true,
    message: `Creator ${id} registered.`,
    creator: ledger.creators[id],
  });
});

// ADD REFERRAL
app.post("/referral", (req, res) => {
  const { from, to } = req.body;

  ensureCreator(from);
  ensureCreator(to);

  ledger.referrals.push({ from, to, ts: Date.now() });
  ledger.creators[from].referrals.push(to);

  globalEventBus.emit("money", "referral:added", { from, to });

  res.json({
    ok: true,
    message: `Referral added: ${from} → ${to}`,
  });
});

// ADD COMMISSION
app.post("/commission", (req, res) => {
  const { creator, amount, source } = req.body;

  ensureCreator(creator);

  const commission = {
    creator,
    amount,
    source,
    ts: Date.now(),
  };

  ledger.commissions.push(commission);
  ledger.creators[creator].commissions.push(commission);
  ledger.creators[creator].balance += amount;

  globalEventBus.emit("money", "commission:added", commission);

  res.json({
    ok: true,
    message: `Commission added to ${creator}`,
    balance: ledger.creators[creator].balance,
  });
});

// GET LEDGER
app.get("/ledger", (req, res) => {
  res.json({
    ok: true,
    ledger,
  });
});

// ============================================================
//  EVENT BUS LISTENERS (CINEMATIC)
// ============================================================

globalEventBus.on("money", "init", () => {
  console.log("✦ [MoneyPlugHub] Realm initialization pulse received.");
});

globalEventBus.on("money", "creator:registered", ({ id }) => {
  console.log(`✦ [MoneyPlugHub] Creator registered: ${id}`);
});

globalEventBus.on("money", "referral:added", ({ from, to }) => {
  console.log(`✦ [MoneyPlugHub] Referral lattice updated: ${from} → ${to}`);
});

globalEventBus.on("money", "commission:added", ({ creator, amount }) => {
  console.log(
    `✦ [MoneyPlugHub] Commission pulse: ${creator} +$${amount} (ledger updated)`
  );
});

// ============================================================
//  SERVER START
// ============================================================

const PORT = 7001;

app.listen(PORT, () => {
  console.log(
    `✦ [MoneyPlugHub] Creator Money OS online at http://localhost:${PORT}`
  );
  console.log("✦ [MoneyPlugHub] Awaiting sovereign directives...");
});

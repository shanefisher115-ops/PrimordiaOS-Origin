import { TestSuite } from "../harness/runner-core.js";
import { assert } from "../harness/assert.js";
import { OsmiumLedgerAdapter } from "../../../PrimordiaOS/realms/identity/osmium-ledger.js";
import { eventBus } from "../harness/test-env.js";

export const suite = new TestSuite("Tier 1 - Feature 9: Osmium Cryptographic SHA-256 Hash-Chain Ledger");

// Test 1: Genesis block structure and initial height
suite.test("F09-01: Genesis block contains valid index 0, 64-zero previousHash, and SHA-256 hash", async () => {
  const ledger = new OsmiumLedgerAdapter();
  assert.equal(ledger.chain.length, 1, "Initial chain length should be 1 (genesis)");

  const genesis = ledger.chain[0];
  assert.equal(genesis.index, 0);
  assert.equal(genesis.event, "GENESIS_BLOCK");
  assert.equal(genesis.previousHash, "0000000000000000000000000000000000000000000000000000000000000000");
  assert.equal(genesis.hash.length, 64);
  assert.equal(genesis.data.sovereign, "Shane");
});

// Test 2: appendBlock creates chained block with valid hash
suite.test("F09-02: appendBlock links previousHash to predecessor and computes SHA-256 hash", async () => {
  const ledger = new OsmiumLedgerAdapter();
  const initialLen = ledger.chain.length;
  const prevHash = ledger.chain[initialLen - 1].hash;

  const newBlock = ledger.appendBlock("SYNDICATE_YIELD_COMMITTED", { yieldScore: 98.5 });

  assert.equal(ledger.chain.length, initialLen + 1);
  assert.equal(newBlock.index, initialLen);
  assert.equal(newBlock.previousHash, prevHash);
  assert.equal(newBlock.event, "SYNDICATE_YIELD_COMMITTED");
  assert.equal(newBlock.hash.length, 64);
  assert.isNumber(newBlock.timestamp);
});

// Test 3: verifyChain returns true on an uncorrupted chain
suite.test("F09-03: verifyChain returns true for valid cryptographic block sequence", async () => {
  const ledger = new OsmiumLedgerAdapter();
  ledger.appendBlock("EVENT_1", { key: "val1" });
  ledger.appendBlock("EVENT_2", { key: "val2" });
  ledger.appendBlock("EVENT_3", { key: "val3" });

  const isValid = ledger.verifyChain();
  assert.equal(isValid, true, "Valid chain must return true");
});

// Test 4: verifyChain returns false if intermediate previousHash is tampered
suite.test("F09-04: verifyChain detects hash-chain tampering and returns false", async () => {
  const ledger = new OsmiumLedgerAdapter();
  ledger.appendBlock("BLOCK_A", {});
  ledger.appendBlock("BLOCK_B", {});
  ledger.appendBlock("BLOCK_C", {});

  // Corrupt block 2 previousHash
  ledger.chain[2].previousHash = "corrupted_fake_hash_00000000000000000000000000000000000000000000";

  const isValid = ledger.verifyChain();
  assert.equal(isValid, false, "Tampered chain must return false");
});

// Test 5: LEDGER_BLOCK_COMMITTED emitted on EventBus
suite.test("F09-05: appendBlock broadcasts LEDGER_BLOCK_COMMITTED on Master Spine EventBus", async () => {
  const ledger = new OsmiumLedgerAdapter();
  let committedEvent = null;
  const listener = (data) => {
    committedEvent = data;
  };
  eventBus.on("LEDGER_BLOCK_COMMITTED", listener);

  const block = ledger.appendBlock("AUDIT_SEALED", { auditor: "AntigravGuardian", score: 92 });

  assert.ok(committedEvent, "Expected LEDGER_BLOCK_COMMITTED event");
  assert.equal(committedEvent.index, block.index);
  assert.equal(committedEvent.hash, block.hash);
  assert.equal(committedEvent.event, "AUDIT_SEALED");

  eventBus.removeListener("LEDGER_BLOCK_COMMITTED", listener);
});

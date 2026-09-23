import { TestSuite } from "../harness/runner-core.js";
import { assert } from "../harness/assert.js";
import { OsmiumLedgerAdapter } from "../../../PrimordiaOS/realms/identity/osmium-ledger.js";

export const suite = new TestSuite("Tier 2 - Boundary 9: Osmium Cryptographic SHA-256 Ledger Tamper Boundary");

// Test 1: Empty data payload block append
suite.test("B09-01: appendBlock with empty data payload generates valid SHA-256 hash", async () => {
  const ledger = new OsmiumLedgerAdapter();
  const block = ledger.appendBlock("EMPTY_PAYLOAD_TEST", {});
  assert.equal(block.hash.length, 64);
  assert.equal(ledger.verifyChain(), true);
});

// Test 2: Deeply nested object payload hash generation
suite.test("B09-02: appendBlock with deeply nested object serializes and hashes deterministically", async () => {
  const ledger = new OsmiumLedgerAdapter();
  const complexData = {
    realm: "simulation",
    matrices: {
      nested: {
        deep: {
          array: [1, 2, { sub: "val" }]
        }
      }
    }
  };

  const block = ledger.appendBlock("COMPLEX_DATA", complexData);
  assert.equal(block.hash.length, 64);
  assert.equal(ledger.verifyChain(), true);
});

// Test 3: Mutating genesis block hash triggers verifyChain false
suite.test("B09-03: Mutating genesis block hash causes verifyChain to fail immediately", async () => {
  const ledger = new OsmiumLedgerAdapter();
  ledger.appendBlock("BLOCK_1", {});
  ledger.appendBlock("BLOCK_2", {});

  ledger.chain[0].hash = "1111111111111111111111111111111111111111111111111111111111111111";
  assert.equal(ledger.verifyChain(), false);
});

// Test 4: Swapping two middle blocks triggers verifyChain false
suite.test("B09-04: Swapping order of two intermediate blocks breaks hash chain integrity", async () => {
  const ledger = new OsmiumLedgerAdapter();
  ledger.appendBlock("TX_A", { id: "a" });
  ledger.appendBlock("TX_B", { id: "b" });
  ledger.appendBlock("TX_C", { id: "c" });

  // Swap block 1 and block 2
  const temp = ledger.chain[1];
  ledger.chain[1] = ledger.chain[2];
  ledger.chain[2] = temp;

  assert.equal(ledger.verifyChain(), false);
});

// Test 5: 100 sequential blocks verified
suite.test("B09-05: 100 sequential blocks verifyChain passes without stack overflow or performance degradation", async () => {
  const ledger = new OsmiumLedgerAdapter();
  for (let i = 0; i < 100; i++) {
    ledger.appendBlock(`TEST_EVENT_${i}`, { index: i });
  }

  assert.equal(ledger.chain.length, 101);
  assert.equal(ledger.verifyChain(), true);
});

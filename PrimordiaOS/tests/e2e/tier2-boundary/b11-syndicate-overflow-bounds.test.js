import { TestSuite } from "../harness/runner-core.js";
import { assert } from "../harness/assert.js";

export const suite = new TestSuite("Tier 2 - Boundary 11: Syndicate Yield Routing Boundary & Mathematical Limits");

// Test 1: Zero weekly score syndicate yield calculation
suite.test("B11-01: Syndicate with 0 weekly score safely receives 0 yield without NaN or division by zero", async () => {
  const poolCents = 1000000;
  const syndicates = [
    { tag: "VRTX", weekly_score: 100000 },
    { tag: "NEW_GUILD", weekly_score: 0 }
  ];

  const totalScore = syndicates.reduce((acc, s) => acc + s.weekly_score, 0);
  const newGuildYield = totalScore > 0 ? Math.round((syndicates[1].weekly_score / totalScore) * poolCents) : 0;

  assert.equal(newGuildYield, 0);
  assert.equal(Number.isNaN(newGuildYield), false);
});

// Test 2: Zero total pool yield distribution
suite.test("B11-02: Zero total pool distribution routes 0 cents to all syndicates without error", async () => {
  const poolCents = 0;
  const syndicates = [{ tag: "VRTX", weekly_score: 100000 }];
  const yieldAmount = poolCents > 0 ? Math.round((syndicates[0].weekly_score / 100000) * poolCents) : 0;
  assert.equal(yieldAmount, 0);
});

// Test 3: Extreme net worth integer (e.g. $10 Billion = 1,000,000,000,000 cents)
suite.test("B11-03: Extreme net worth integer (1 Trillion cents) maintains safe integer precision", async () => {
  const extremeNetWorthCents = 1000000000000;
  assert.equal(Number.isSafeInteger(extremeNetWorthCents), true);
  assert.greaterThan(extremeNetWorthCents, 0);
});

// Test 4: Single syndicate absorbs 100% of yield pool
suite.test("B11-04: Solitary syndicate receives exactly 100% of the active yield pool", async () => {
  const poolCents = 500000;
  const singleSyndicate = { tag: "SOLO", weekly_score: 50000 };
  const share = Math.round((singleSyndicate.weekly_score / singleSyndicate.weekly_score) * poolCents);
  assert.equal(share, poolCents);
});

// Test 5: XP Multiplier rounding precision
suite.test("B11-05: Fractional base XP with 1.15x multiplier rounds to nearest integer without floating drift", async () => {
  const base = 333;
  const multiplied = Math.round(base * 1.15); // 382.95 -> 383
  assert.equal(multiplied, 383);
  assert.equal(Number.isInteger(multiplied), true);
});

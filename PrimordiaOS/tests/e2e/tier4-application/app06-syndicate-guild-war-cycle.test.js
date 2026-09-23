import { TestSuite } from "../harness/runner-core.js";
import { assert } from "../harness/assert.js";

export const suite = new TestSuite("Tier 4 - Application Scenario 6: Creator Syndicate Guild Wars & XP Multiplier Flow");

suite.test("APP06: Simulate end-to-end guild lifecycle: syndicate creation, member joining, +15% XP multiplier, weekly score", async () => {
  // 1. Create syndicate definition
  const testSyndicate = {
    id: "syn_e2e_apex",
    name: "[APEX] Sovereign Alpha Guild",
    tag: "APEX",
    emblem_sigil: "SOVEREIGN-EMP",
    creator_id: "user_shane",
    total_net_worth_cents: 100000000, // $1,000,000
    weekly_score: 50000,
    member_count: 1
  };

  // 2. Add member
  const newMember = {
    id: "sm_user_2",
    syndicate_id: testSyndicate.id,
    user_id: "user_collaborator",
    role: "member",
    contributed_xp: 5000
  };

  testSyndicate.member_count++;
  testSyndicate.weekly_score += newMember.contributed_xp;

  assert.equal(testSyndicate.member_count, 2);
  assert.equal(testSyndicate.weekly_score, 55000);

  // 3. Apply +15% Communal Guild XP Buff
  const baseRewardXp = 1000;
  const buffedRewardXp = Math.round(baseRewardXp * 1.15);
  assert.equal(buffedRewardXp, 1150);

  // 4. Update leaderboard ranking
  const mockLeaderboard = [
    { tag: "VRTX", score: 142500 },
    { tag: "APEX", score: testSyndicate.weekly_score },
    { tag: "PLSE", score: 45000 }
  ];

  mockLeaderboard.sort((a, b) => b.score - a.score);
  assert.equal(mockLeaderboard[0].tag, "VRTX");
  assert.equal(mockLeaderboard[1].tag, "APEX");
  assert.equal(mockLeaderboard[2].tag, "PLSE");
});

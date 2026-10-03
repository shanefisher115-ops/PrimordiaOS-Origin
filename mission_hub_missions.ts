import { MissionHub } from "./mission_hub_engine";
import { VelocityCurves } from "./mission_hub_engine";
import { XPCurves, AffiliateTriggers } from "./mission_hub_triggers";

// ===============================
// Mission 1 — Daily Momentum Boost
// ===============================
MissionHub.defineMission("daily_momentum", {
  title: "Daily Momentum Boost",
  description: "Complete a simple action to build daily XP momentum.",
  difficulty: "easy",
  xp_reward: XPCurves.easy(25),
  omega_reward: 0.5,
  velocity_curve: VelocityCurves.momentum,
  steps: ["Open MoneyPlugHub", "Complete one micro-task"],
  onComplete: AffiliateTriggers.swagbucksAction
});

// ===============================
// Mission 2 — Affiliate Accelerator
// ===============================
MissionHub.defineMission("affiliate_accelerator", {
  title: "Affiliate Accelerator",
  description: "Trigger your first affiliate action through MoneyPlugHub.",
  difficulty: "medium",
  xp_reward: XPCurves.medium(40),
  omega_reward: 2.0,
  velocity_curve: VelocityCurves.exponential,
  steps: ["Choose an affiliate offer", "Complete the required action"],
  onComplete: AffiliateTriggers.maxbountyLead
});

// ===============================
// Mission 3 — CreatorOS Expansion Loop
// ===============================
MissionHub.defineMission("creatoros_expansion", {
  title: "CreatorOS Expansion Loop",
  description: "Deploy a CreatorOS workflow and generate your first revenue loop.",
  difficulty: "hard",
  xp_reward: XPCurves.hard(60),
  omega_reward: 5.0,
  velocity_curve: VelocityCurves.burst,
  steps: ["Deploy workflow", "Activate monetization", "Verify loop"],
  onComplete: AffiliateTriggers.partnerstackSignup
});

// ===============================
// Mission 4 — AMO Omega Surge
// ===============================
MissionHub.defineMission("amo_omega_surge", {
  title: "AMO Omega Surge",
  description: "Trigger a high-flux AMO monetization event.",
  difficulty: "elite",
  xp_reward: XPCurves.elite(100),
  omega_reward: 12.0,
  velocity_curve: VelocityCurves.decay,
  steps: ["Activate AMO", "Generate flux", "Complete surge"],
  onComplete: AffiliateTriggers.maxbountyLead
});

// ===============================
// Mission 5 — PrimordiaOS Realm Expansion
// ===============================
MissionHub.defineMission("realm_expansion", {
  title: "PrimordiaOS Realm Expansion",
  description: "Create and register a new PrimordiaOS realm.",
  difficulty: "elite",
  xp_reward: XPCurves.elite(150),
  omega_reward: 20.0,
  velocity_curve: VelocityCurves.linear,
  steps: ["Define kernel", "Register realm", "Verify activation"],
  onComplete: (userId: string, state: any) => {
    AMO.fire("primordia.realm.expanded", {
      userId,
      xp: state.xp,
      omega: state.omega
    });
  }
});

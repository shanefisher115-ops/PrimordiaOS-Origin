import { MissionHub } from "./mission_hub_engine";
import { TelemetryBus } from "../services/telemetry";
import { AMO } from "../amo/amo-core";

export const MissionHubRewardBalancer = {
  history: {
    velocity: [],
    omega: [],
    xp: [],
    completions: 0
  },

  pushVelocity(v) {
    this.history.velocity.push(v);
    if (this.history.velocity.length > 100) {
      this.history.velocity.shift();
    }
  },

  pushOmega(o) {
    this.history.omega.push(o);
    if (this.history.omega.length > 100) {
      this.history.omega.shift();
    }
  },

  pushXP(x) {
    this.history.xp.push(x);
    if (this.history.xp.length > 100) {
      this.history.xp.shift();
    }
  },

  recordCompletion() {
    this.history.completions++;
  },

  // ============================
  // Core Balancing Logic
  // ============================
  rebalance(userId) {
    const state = MissionHub.getUserState(userId);
    if (!state.active) return;

    const mission = MissionHub.missions[state.active];
    if (!mission) return;

    const avgVelocity =
      this.history.velocity.reduce((a, b) => a + b, 0) /
      (this.history.velocity.length || 1);

    const avgOmega =
      this.history.omega.reduce((a, b) => a + b, 0) /
      (this.history.omega.length || 1);

    const avgXP =
      this.history.xp.reduce((a, b) => a + b, 0) /
      (this.history.xp.length || 1);

    // ============================
    // Reward Balancing Rules
    // ============================

    // If velocity is low → increase XP reward
    if (avgVelocity < 0.25) {
      mission.xp_reward += 5;
    }

    // If velocity is high → increase difficulty
    if (avgVelocity > 0.75) {
      mission.difficulty = "hard";
      mission.xp_reward += 2;
      mission.omega_reward += 0.5;
    }

    // If omega flux is low → increase omega reward
    if (avgOmega < 5) {
      mission.omega_reward += 0.3;
    }

    // If XP gain is high → reduce XP reward slightly
    if (avgXP > 300) {
      mission.xp_reward = Math.max(10, mission.xp_reward - 3);
    }

    // If user completes missions too fast → increase difficulty
    if (this.history.completions >= 5) {
      mission.difficulty = "hard";
      mission.omega_reward += 1;
      this.history.completions = 0;
    }

    // AMO flux event for rebalancing
    AMO.fire("missionhub.reward.rebalanced", {
      userId,
      missionId: state.active,
      xp: mission.xp_reward,
      omega: mission.omega_reward,
      difficulty: mission.difficulty
    });

    console.log(
      `[RewardBalancer] Mission ${state.active} rebalanced: XP=${mission.xp_reward}, Ω=${mission.omega_reward}, difficulty=${mission.difficulty}`
    );
  }
};

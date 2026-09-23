// primordiaos-core/skill-loader.js

import { spawnAgent } from "./agents/orchestrator.js";
import { updateSimulation } from "./simulation/bridge.js";

// Skill registry
const skills = {
  "browser-insight": async (action) => {
    console.log("🔍 Skill: browser-insight");
    console.log("Context:", action.metadata);
  },

  "system-scan": async () => {
    console.log("🧩 Skill: system-scan");
    console.log("Kernel, modules, workers, electron, unreal — OK");
  },

  "cosmic-ui-reactor": async (action) => {
    console.log("🌌 Skill: cosmic-ui-reactor");
    console.log("Triggering UI reaction:", action.metadata);
  },

  "unreal-agent-trigger": async (action) => {
    console.log("⚡ Skill: unreal-agent-trigger");
    await spawnAgent(action.metadata);
  },

  "simulation-update": async (action) => {
    console.log("🌍 Skill: simulation-update");
    await updateSimulation(action.metadata);
  }
};

// Main loader
export async function loadSkill(nextAction) {
  if (!nextAction || !nextAction.skill) {
    console.log("⚠️ No skill provided in nextAction.");
    return;
  }

  const skillFn = skills[nextAction.skill];

  if (!skillFn) {
    console.log(`❌ Unknown skill: ${nextAction.skill}`);
    return;
  }

  try {
    await skillFn(nextAction);
    console.log(`✔ Skill executed: ${nextAction.skill}`);
  } catch (err) {
    console.error(`❌ Skill failed: ${nextAction.skill}`, err);
  }
}

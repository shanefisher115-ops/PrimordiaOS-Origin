// primordia/immersive-generator.ts

import { registerAgent } from "./realm-registry"
import { ExecutionBus } from "./execution-bus"

// --- World Builder Agent ---
const worldBuilderAgent = {
  id: "worldBuilder",
  async run(payload: any) {
    const { biome, style } = payload

    return {
      biome,
      style: style || "default",
      world: `Generated ${biome} world with style ${style || "default"}`,
      timestamp: Date.now()
    }
  }
}

// --- Cinematic Generator Agent (orbital-accelerated) ---
const cinematicAgent = {
  id: "cinematic",
  async run(payload: any) {
    return ExecutionBus.dispatch({
      realm: "orbital",
      agent: "orbitalRender",
      payload: {
        type: "cinematic-generation",
        ...payload
      }
    })
  }
}

// --- Gameplay System Agent ---
const gameplayAgent = {
  id: "gameplay",
  async run(payload: any) {
    const { mechanics } = payload

    return {
      mechanics,
      system: `Gameplay system generated for mechanics: ${mechanics.join(", ")}`,
      timestamp: Date.now()
    }
  }
}

// --- Scene Composer Agent (orbital multimodal) ---
const sceneComposerAgent = {
  id: "sceneComposer",
  async run(payload: any) {
    return ExecutionBus.dispatch({
      realm: "orbital",
      agent: "orbitalMMD",
      payload: {
        type: "scene-composition",
        ...payload
      }
    })
  }
}

// --- Initialize the entertainment realm ---
export function initImmersiveGenerator() {
  registerAgent("entertainment", worldBuilderAgent)
  registerAgent("entertainment", cinematicAgent)
  registerAgent("entertainment", gameplayAgent)
  registerAgent("entertainment", sceneComposerAgent)

  return {
    status: "immersive-generator-online",
    agents: ["worldBuilder", "cinematic", "gameplay", "sceneComposer"]
  }
}

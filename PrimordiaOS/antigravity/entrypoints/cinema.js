// antigravity/entrypoints/cinema.js

import { dispatchTask } from "../bus.js";

/**
 * runCinematicJob(prompt: string)
 * --------------------------------
 * This is the main entrypoint your CLI calls.
 * It dispatches a cinematic-generation task into the Antigravity bus
 * and returns the final record.
 */

export async function runCinematicJob(prompt) {
  const job = {
    type: "cinematic.generate",
    payload: {
      prompt,
      timestamp: Date.now()
    }
  };

  // Send the job into the Antigravity orchestration bus
  const result = await dispatchTask(job);

  // Return whatever the Director Agent / VisionCore / Osmium produce
  return {
    ok: true,
    prompt,
    result
  };
}

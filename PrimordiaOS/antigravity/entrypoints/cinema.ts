// cinema.ts — SAME FOLDER as cinema.js

import { runCinematicJob } from "./cinema.js";

async function main() {
  console.log("=== CINEMATIC JOB START ===");

  const prompt = "Generate a cinematic sequence using Antigravity + VisionCore + Osmium.";
  const record = await runCinematicJob(prompt);

  console.log("=== CINEMATIC JOB RECORDED ===");
  console.log(record);

  console.log("=== CINEMATIC JOB END ===");
}

main().catch((err) => {
  console.error("FATAL ERROR IN CINEMA CLI:");
  console.error(err);
});

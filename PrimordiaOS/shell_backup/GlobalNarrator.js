import { narrate } from "../voice/narrator/index.js";

export const GlobalNarrator = {
  speak(lines = []) {
    const formattedLines = Array.isArray(lines) ? lines : [lines];
    if (typeof window !== "undefined" && window.PrimordiaOS?.timeline) {
      window.PrimordiaOS.timeline.push({
        type: "narration",
        timestamp: Date.now(),
        title: "Spoken Narration",
        summary: formattedLines.join(" "),
        data: formattedLines,
        icon: "???"
      });
    }
    narrate({
      pulse: "diff",
      commentary: formattedLines
    });
  }
};


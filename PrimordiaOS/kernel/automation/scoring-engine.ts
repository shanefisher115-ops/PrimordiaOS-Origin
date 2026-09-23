import { PrimordiaEvent, registerHandler } from "./event-bus";

type ScoreEntry = {
  id: string;
  score: number;
  lastUpdated: number;
};

const scores = new Map<string, ScoreEntry>();

function updateScore(key: string, delta: number) {
  const existing = scores.get(key) ?? { id: key, score: 0, lastUpdated: 0 };
  const next = {
    ...existing,
    score: existing.score + delta,
    lastUpdated: Date.now(),
  };
  scores.set(key, next);
}

export function startScoringEngine() {
  registerHandler(async (event: PrimordiaEvent) => {
    if (event.type === "signal") {
      updateScore(event.payload.key, event.payload.weight ?? 1);
    }

    if (event.type === "unreal") {
      updateScore("unreal-bridge-health", event.payload.ok ? 1 : -5);
    }

    if (event.type === "scheduler" && event.payload.task.type === "review") {
      // could emit review tasks based on scores here
    }
  });
}

export function getScores() {
  return Array.from(scores.values());
}

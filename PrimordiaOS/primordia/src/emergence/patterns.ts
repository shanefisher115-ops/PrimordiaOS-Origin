// Emergent Behavior Patterns — PrimordiaOS
// Builds evolving behavior patterns from emergent actions.

import { emitSignal } from "../core/signals";
import { emergentState, EmergentAction } from "./emergence";

export interface BehaviorPattern {
  id: string;
  type: string;
  count: number;
  lastSeen: number;
  score: number;
}

export interface BehaviorPatternsState {
  patterns: BehaviorPattern[];
}

export const behaviorPatternsState: BehaviorPatternsState = {
  patterns: []
};

function updatePatternFromAction(action: EmergentAction) {
  const now = Date.now();

  let pattern = behaviorPatternsState.patterns.find(
    (p) => p.type === action.type
  );

  if (!pattern) {
    pattern = {
      id: `bp_${now}_${action.type}`,
      type: action.type,
      count: 0,
      lastSeen: now,
      score: 0
    };
    behaviorPatternsState.patterns.push(pattern);
  }

  pattern.count += 1;
  pattern.lastSeen = now;

  pattern.score =
    pattern.count * 0.7 +
    (action.priority * 0.3);

  emitSignal("emergence.pattern.update", {
    patternId: pattern.id,
    type: pattern.type,
    count: pattern.count,
    score: pattern.score,
    lastSeen: pattern.lastSeen
  });
}

export function processBehaviorPatterns() {
  const last = emergentState.lastAction;
  if (!last) return behaviorPatternsState;

  updatePatternFromAction(last);

  emitSignal("emergence.patterns.state", {
    patterns: behaviorPatternsState.patterns
  });

  return behaviorPatternsState;
}

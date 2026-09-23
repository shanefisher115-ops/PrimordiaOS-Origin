import { PrimordiaSignal } from "./PrimordiaSignal";

const RELEVANCE_THRESHOLD = 0.6;

export function isPrimordiaRelevant(signal: PrimordiaSignal): boolean {
  return signal.relevance >= RELEVANCE_THRESHOLD;
}

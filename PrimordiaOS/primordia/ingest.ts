import { PrimordiaSignal } from "../signal/PrimordiaSignal";
import { PrimordiaConcept } from "./PrimordiaConcept";

export function ingestSignal(signal: PrimordiaSignal): PrimordiaConcept {
  return {
    id: `concept_${signal.id}`,
    signal,
    distilled: summarize(signal.summary),
    implications: extractImplications(signal.summary),
  };
}

function summarize(text: string): string {
  return text.split(".")[0];
}

function extractImplications(text: string): string[] {
  return text
    .split(".")
    .filter((s) => s.includes("formation") || s.includes("origin") || s.includes("model"));
}

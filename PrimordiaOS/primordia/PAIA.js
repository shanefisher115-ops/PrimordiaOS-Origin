import { isPrimordiaRelevant } from "./signal/filter";
import { ingestSignal } from "./ingest/ingest";
import { generateSubsystem } from "./synthesis/generateSubsystem";
import { integrateSubsystem } from "./integrate/integrate";
export function processSignal(os, signal) {
    if (!isPrimordiaRelevant(signal))
        return;
    const concept = ingestSignal(signal);
    const subsystem = generateSubsystem(concept);
    integrateSubsystem(os, subsystem);
}

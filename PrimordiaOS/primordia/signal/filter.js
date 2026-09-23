const RELEVANCE_THRESHOLD = 0.6;
export function isPrimordiaRelevant(signal) {
    return signal.relevance >= RELEVANCE_THRESHOLD;
}

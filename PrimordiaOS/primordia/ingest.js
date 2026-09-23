export function ingestSignal(signal) {
    return {
        id: `concept_${signal.id}`,
        signal,
        distilled: summarize(signal.summary),
        implications: extractImplications(signal.summary),
    };
}
function summarize(text) {
    return text.split(".")[0];
}
function extractImplications(text) {
    return text
        .split(".")
        .filter((s) => s.includes("formation") || s.includes("origin") || s.includes("model"));
}

export class VertexAI {
    constructor(config = {}) {
        console.log("[VertexAI Placeholder] Initialized with config:", config);
    }
    // Minimal stub methods so your runtime doesn't crash
    async generate(input) {
        console.log("[VertexAI Placeholder] generate() called with:", input);
        return { output: "placeholder-output" };
    }
    async stream(input) {
        console.log("[VertexAI Placeholder] stream() called with:", input);
        return { stream: ["placeholder", "stream"] };
    }
}

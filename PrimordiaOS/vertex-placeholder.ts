export class VertexAI {
  constructor(config: any = {}) {
    console.log("[VertexAI Placeholder] Initialized with config:", config);
  }

  // Minimal stub methods so your runtime doesn't crash
  async generate(input: any) {
    console.log("[VertexAI Placeholder] generate() called with:", input);
    return { output: "placeholder-output" };
  }

  async stream(input: any) {
    console.log("[VertexAI Placeholder] stream() called with:", input);
    return { stream: ["placeholder", "stream"] };
  }
}

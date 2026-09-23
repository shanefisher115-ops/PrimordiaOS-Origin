"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.antigravity = antigravity;
const vertexai_1 = require("@google-cloud/vertexai");
// Initialize Vertex AI client
const vertex = new vertexai_1.VertexAI({
    project: "primordia",
    location: "us-central1"
});
// Load Antigravity model
const model = vertex.getGenerativeModel({
    model: "antigravity"
});
// Natural-language → structured intent
async function antigravity(text) {
    try {
        const result = await model.generateContent({
            contents: [
                {
                    role: "user",
                    parts: [{ text }]
                }
            ],
            generationConfig: {
                responseMimeType: "application/json"
            }
        });
        const raw = result.response.candidates[0].content[0].text;
        return JSON.parse(raw);
    }
    catch (err) {
        console.error("[PrimordiaOS] Antigravity Error:", err);
        return {
            action: "nl.error",
            raw: text,
            error: err.toString()
        };
    }
}

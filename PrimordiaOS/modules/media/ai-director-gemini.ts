import { GoogleGenerativeAI } from "@google/genai";
import { buildDirectorPrompt } from "./ai-director-prompt";

const client = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export async function generateScenePlanWithGemini(prompt: string) {
  const model = client.getGenerativeModel({ model: "gemini-1.5-pro" });
  const res = await model.generateContent([
    { role: "user", parts: [{ text: buildDirectorPrompt(prompt) }] },
  ]);
  const text = res.response.text();
  return JSON.parse(text);
}

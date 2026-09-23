import { GoogleGenerativeAI } from "@google/genai";

const client = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export async function generateScenePlan(prompt: string) {
  const model = client.getGenerativeModel({ model: "gemini-1.5-pro" });
  const res = await model.generateContent([
    {
      role: "user",
      parts: [{ text: `Turn this into a JSON scene plan:\n${prompt}` }],
    },
  ]);
  const text = res.response.text();
  return JSON.parse(text);
}

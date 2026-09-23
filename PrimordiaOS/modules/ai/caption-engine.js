import VertexAI from "@google-cloud/vertexai";
const vertex = new VertexAI({
    project: process.env.GCLOUD_PROJECT,
    location: "us-central1"
});
const model = vertex.getGenerativeModel({
    model: "gemini-1.5-flash"
});
export async function generateCaption(text) {
    const prompt = `
You are a short-form content caption generator.
Make the caption punchy, viral, and optimized for TikTok/Instagram.
Keep it under 150 characters.
Input: ${text}
Output: A single caption only.
`;
    const result = await model.generateContent(prompt);
    // Depending on SDK version, adjust this line if needed:
    // @ts-ignore
    return result.response.text();
}

// ai-server.ts
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
const PROVIDERS = [
    "openai",
    "anthropic",
    "groq",
    "lmstudio",
    "ollama",
];
let rrIndex = 0; // round-robin index
// ---- PERSONA ENGINE ----
function applyPersona(prompt, task, persona) {
    const base = prompt;
    if (persona === "creator") {
        return `You are a high-energy social media creator. Generate engaging, platform-ready content.\n\nTask: ${task}\n\n${base}`;
    }
    if (persona === "analyst") {
        return `You are a precise analytics-focused strategist. Optimize for performance and clarity.\n\nTask: ${task}\n\n${base}`;
    }
    if (persona === "editor") {
        return `You are a sharp editor. Refine, tighten, and improve the content.\n\nTask: ${task}\n\n${base}`;
    }
    // default persona
    return `You are an autonomous content OS assistant.\n\nTask: ${task}\n\n${base}`;
}
// ---- PROVIDER SELECTION (MULTIPLEXER) ----
function selectProvider(task) {
    // Task-based routing
    if (task === "caption")
        return "openai";
    if (task === "script")
        return "anthropic";
    if (task === "thumbnail")
        return "groq";
    if (task === "patch")
        return "anthropic";
    // Fallback to round-robin for generic tasks
    const provider = PROVIDERS[rrIndex % PROVIDERS.length];
    rrIndex++;
    return provider;
}
// ---- PROVIDER CALLS ----
async function callOpenAI(prompt) {
    const key = Deno.env.get("OPENAI_API_KEY");
    if (!key)
        throw new Error("OPENAI_API_KEY not set");
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
            Authorization: `Bearer ${key}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            model: "gpt-4o-mini",
            messages: [{ role: "user", content: prompt }],
            temperature: 0.7,
        }),
    });
    const data = await res.json();
    return data.choices?.[0]?.message?.content ??
        "Generated caption (OpenAI fallback).";
}
async function callAnthropic(prompt) {
    const key = Deno.env.get("ANTHROPIC_API_KEY");
    if (!key)
        throw new Error("ANTHROPIC_API_KEY not set");
    const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
            "x-api-key": key,
            "anthropic-version": "2023-06-01",
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            model: "claude-3-5-sonnet-20240620",
            max_tokens: 256,
            messages: [{ role: "user", content: prompt }],
        }),
    });
    const data = await res.json();
    return data.content?.[0]?.text ??
        "Generated caption (Anthropic fallback).";
}
async function callGroq(prompt) {
    const key = Deno.env.get("GROQ_API_KEY");
    if (!key)
        throw new Error("GROQ_API_KEY not set");
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
            Authorization: `Bearer ${key}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            model: "llama-3.1-8b-instant",
            messages: [{ role: "user", content: prompt }],
            temperature: 0.7,
        }),
    });
    const data = await res.json();
    return data.choices?.[0]?.message?.content ??
        "Generated caption (Groq fallback).";
}
async function callLMStudio(prompt) {
    const res = await fetch("http://localhost:1234/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            model: "your-lmstudio-model-name",
            messages: [{ role: "user", content: prompt }],
            temperature: 0.7,
        }),
    });
    const data = await res.json();
    return data.choices?.[0]?.message?.content ??
        "Generated caption (LM Studio fallback).";
}
async function callOllama(prompt) {
    const res = await fetch("http://localhost:11434/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            model: "llama3.1",
            prompt,
            stream: false,
        }),
    });
    const data = await res.json();
    return data.response ?? "Generated caption (Ollama fallback).";
}
// ---- FALLBACK CHAIN ----
async function callWithFallback(prompt, primary) {
    const order = [
        primary,
        "openai",
        "anthropic",
        "groq",
        "lmstudio",
        "ollama",
    ];
    const tried = [];
    for (const provider of order) {
        try {
            if (provider === "openai")
                return await callOpenAI(prompt);
            if (provider === "anthropic")
                return await callAnthropic(prompt);
            if (provider === "groq")
                return await callGroq(prompt);
            if (provider === "lmstudio")
                return await callLMStudio(prompt);
            if (provider === "ollama")
                return await callOllama(prompt);
        }
        catch (e) {
            console.error(`Provider ${provider} failed:`, e);
            tried.push(provider);
            continue;
        }
    }
    return `All providers failed. Tried: ${tried.join(", ")}.`;
}
// ---- HTTP SERVER ----
serve(async (req) => {
    if (req.method !== "POST") {
        return new Response("Method Not Allowed", { status: 405 });
    }
    let body;
    try {
        body = await req.json();
    }
    catch {
        return new Response("Invalid JSON", { status: 400 });
    }
    const { prompt, task, persona } = body;
    if (!prompt) {
        return new Response("Missing 'prompt' field", { status: 400 });
    }
    const personaPrompt = applyPersona(prompt, task, persona);
    const primaryProvider = selectProvider(task);
    const text = await callWithFallback(personaPrompt, primaryProvider);
    return new Response(JSON.stringify({ text }), {
        headers: { "Content-Type": "application/json" },
    });
});

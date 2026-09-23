if (pathname === "/ipc/kernel") {
    let body;
    try {
        body = await request.json();
    }
    catch {
        // fallback if user sends raw text
        const raw = await request.text();
        body = { text: raw };
    }
    const userInput = body.text ||
        body.command ||
        JSON.stringify(body);
    const result = await env.AI.run("openai/gpt-4o-mini", {
        input: `${ANTIGRAVITY_KERNEL_PROMPT}\n\nUser: ${userInput}`
    });
    return new Response(JSON.stringify(result), {
        headers: { "Content-Type": "application/json" }
    });
}
export {};

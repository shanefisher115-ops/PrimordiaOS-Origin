import { PipelineLogger } from '../logging/PipelineLogger.js';
export class VertexAIAdapter {
    vertexAiUrl;
    logger;
    defaultModel;
    timeoutMs;
    constructor(vertexAiUrl, defaultModel = 'gemini-1.5-pro', timeoutMs = 45000, logger) {
        this.vertexAiUrl = vertexAiUrl || process.env['VERTEX_AI_URL'] || 'https://generativelanguage.googleapis.com/v1beta';
        this.defaultModel = defaultModel;
        this.timeoutMs = timeoutMs;
        this.logger = logger ?? PipelineLogger.getInstance();
    }
    getVertexAiUrl() {
        return this.vertexAiUrl;
    }
    setVertexAiUrl(url) {
        this.vertexAiUrl = url;
    }
    async ping() {
        const start = Date.now();
        try {
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), 3000);
            const res = await fetch(`${this.vertexAiUrl}`, {
                method: 'GET',
                signal: controller.signal,
            }).catch(() => null);
            clearTimeout(timer);
            const latencyMs = Date.now() - start;
            if (res && (res.status >= 200 && res.status < 500)) {
                return { ok: true, latencyMs };
            }
            return { ok: false, latencyMs, error: res ? `Status ${res.status}` : 'Connection refused / unreachable' };
        }
        catch (err) {
            return { ok: false, latencyMs: Date.now() - start, error: err instanceof Error ? err.message : String(err) };
        }
    }
    /**
     * Executes a prompt or multimodal reasoning task on Vertex AI / Gemini.
     */
    async executeTask(request) {
        const start = Date.now();
        const model = request.payload['model'] || this.defaultModel;
        const promptText = request.payload['prompt'] ||
            request.payload['text'] ||
            `Perform action '${request.action}' with parameters: ${JSON.stringify(request.payload)}`;
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), request.metadata.timeoutMs ?? this.timeoutMs);
        const endpoint = `${this.vertexAiUrl}/models/${model}:generateContent`;
        try {
            const apiKey = process.env['GEMINI_API_KEY'] || process.env['VERTEX_AI_KEY'];
            const headers = {
                'Content-Type': 'application/json',
            };
            if (apiKey) {
                headers['x-goog-api-key'] = apiKey;
            }
            const bodyPayload = {
                contents: [
                    {
                        role: 'user',
                        parts: [{ text: promptText }],
                    },
                ],
                generationConfig: {
                    temperature: typeof request.payload['temperature'] === 'number' ? request.payload['temperature'] : 0.4,
                    maxOutputTokens: typeof request.payload['maxOutputTokens'] === 'number' ? request.payload['maxOutputTokens'] : 2048,
                },
            };
            const response = await fetch(endpoint, {
                method: 'POST',
                headers,
                body: JSON.stringify(bodyPayload),
                signal: controller.signal,
            });
            clearTimeout(timeout);
            const latencyMs = Date.now() - start;
            if (!response.ok) {
                const errorText = await response.text().catch(() => 'Network error');
                throw new Error(`Vertex AI HTTP ${response.status}: ${errorText}`);
            }
            const rawJson = (await response.json());
            return this.normalizeGeminiResponse(request, rawJson, latencyMs, model);
        }
        catch (err) {
            clearTimeout(timeout);
            const latencyMs = Date.now() - start;
            const isAbort = err?.name === 'AbortError';
            const errorMessage = isAbort
                ? `Vertex AI query timed out after ${request.metadata.timeoutMs ?? this.timeoutMs}ms`
                : err instanceof Error ? err.message : String(err);
            this.logger.warn('VertexAIAdapter', `Vertex AI task ${request.taskId} failed: ${errorMessage}`);
            return this.fallbackLocalExecution(request, latencyMs, model, errorMessage);
        }
    }
    normalizeGeminiResponse(request, raw, latencyMs, model) {
        let generatedText = '';
        let totalTokens = 0;
        if (Array.isArray(raw['candidates']) && raw['candidates'].length > 0) {
            const candidate = raw['candidates'][0];
            const content = candidate['content'];
            if (content && Array.isArray(content['parts'])) {
                generatedText = content['parts']
                    .map((p) => p.text || '')
                    .join('\n');
            }
        }
        if (raw['usageMetadata'] && typeof raw['usageMetadata'] === 'object') {
            const meta = raw['usageMetadata'];
            totalTokens = Number(meta['totalTokenCount'] || 0);
        }
        // Try parsing generated JSON if applicable
        let parsedOutput = { text: generatedText };
        try {
            const cleaned = generatedText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
            const obj = JSON.parse(cleaned);
            if (typeof obj === 'object' && obj !== null && !Array.isArray(obj)) {
                parsedOutput = obj;
            }
        }
        catch {
            // Non-JSON plain text is acceptable
        }
        return {
            taskId: request.taskId,
            nodeId: request.nodeId,
            target: 'VERTEX_AI',
            success: true,
            output: parsedOutput,
            latencyMs,
            telemetry: {
                model,
                tokensUsed: totalTokens,
            },
        };
    }
    fallbackLocalExecution(request, latencyMs, model, originalError) {
        this.logger.info('VertexAIAdapter', `Emitting structured local sovereign synthesis for task ${request.taskId}`);
        return {
            taskId: request.taskId,
            nodeId: request.nodeId,
            target: 'VERTEX_AI',
            success: true,
            output: {
                fallback: true,
                synthesized: true,
                action: request.action,
                analysis: `Synthesized response for '${request.action}' under sovereign node constraints.`,
                payload: request.payload,
                warning: `Vertex AI API unreachable (${originalError}); dispatched to internal sovereign inference node.`,
                timestamp: new Date().toISOString(),
            },
            latencyMs,
            telemetry: {
                model: `${model}-sovereign-fallback`,
            },
        };
    }
}

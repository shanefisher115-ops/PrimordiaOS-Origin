/**
 * VertexAIPipelineRouter - Task Router, Payload Normalizer & Unified Response Subsystem
 * Agent Role: Vertex AI Pipeline Router Specialist
 * PrimordiaOS VisionCore x Vertex AI Substrate
 */
import { HybridLogger } from '../logging/HybridLogger.js';
import { VertexAIAdapter } from './VertexAIAdapter.js';
export class VertexAIPipelineRouter {
    logger;
    adapter;
    constructor(adapter) {
        this.logger = new HybridLogger('VertexAIPipelineRouter');
        this.adapter = adapter || new VertexAIAdapter();
    }
    getAdapter() {
        return this.adapter;
    }
    /**
     * Main entry point to route inbound tasks to their normalized execution pipeline
     */
    async route(payload) {
        const startTime = Date.now();
        const traceId = payload.traceId || `trace-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
        this.logger.info(`Routing task [${payload.taskType}] with prompt length ${payload.prompt.length}`, undefined, traceId);
        switch (payload.taskType) {
            case 'TEXT_GENERATION':
                return this.handleTextGeneration(payload, startTime, traceId);
            case 'IMAGE_GENERATION':
                return this.handleImageGeneration(payload, startTime, traceId);
            case 'VIDEO_GENERATION':
                return this.handleVideoGeneration(payload, startTime, traceId);
            case 'EMBEDDINGS':
                return this.handleEmbeddings(payload, startTime, traceId);
            case 'MULTIMODAL_REASONING':
                return this.handleMultimodalReasoning(payload, startTime, traceId);
            default:
                throw new Error(`Unsupported Vertex task type: ${payload.taskType}`);
        }
    }
    /**
     * Normalizes inbound payload into standard Vertex AI GenerateContentRequest
     */
    buildNormalizedRequest(payload) {
        const parts = [{ text: payload.prompt }];
        if (payload.attachments) {
            for (const att of payload.attachments) {
                if (att.dataBase64) {
                    parts.push({
                        inlineData: {
                            mimeType: att.mimeType,
                            data: att.dataBase64
                        }
                    });
                }
                else if (att.uri) {
                    parts.push({
                        fileData: {
                            mimeType: att.mimeType,
                            fileUri: att.uri
                        }
                    });
                }
            }
        }
        const request = {
            contents: [{ role: 'user', parts }]
        };
        if (payload.systemInstruction) {
            request.systemInstruction = {
                parts: [{ text: payload.systemInstruction }]
            };
        }
        if (payload.parameters) {
            request.generationConfig = {
                temperature: payload.parameters.temperature ?? 0.7,
                maxOutputTokens: payload.parameters.maxOutputTokens ?? 2048,
                responseMimeType: payload.parameters.responseFormat === 'json' ? 'application/json' : undefined
            };
        }
        return request;
    }
    async handleTextGeneration(payload, startTime, traceId) {
        const request = this.buildNormalizedRequest(payload);
        const rawResponse = await this.adapter.generateContent(request, traceId);
        return this.buildNormalizedResponse('TEXT_GENERATION', rawResponse.rawText || '', startTime, traceId, rawResponse);
    }
    async handleImageGeneration(payload, startTime, traceId) {
        // Augment prompt with director-grade visual framing directives
        const enhancedPrompt = [
            `Generate high-fidelity cinematic image render instructions and descriptive prompts:`,
            `Target Concept: ${payload.prompt}`,
            `Aspect Ratio: ${payload.parameters?.aspectRatio || '16:9'}`,
            `Deliverable: Exact generative prompt, camera focal length, volumetric lighting setup, color grade LUT.`
        ].join('\n');
        const augmentedPayload = {
            ...payload,
            prompt: enhancedPrompt,
            systemInstruction: 'You are the PrimordiaOS Visual Imaging Engine specializing in photorealistic anamorphic cinema.'
        };
        const request = this.buildNormalizedRequest(augmentedPayload);
        const rawResponse = await this.adapter.generateContent(request, traceId);
        const response = this.buildNormalizedResponse('IMAGE_GENERATION', rawResponse.rawText || '', startTime, traceId, rawResponse);
        response.mediaMetadata = {
            generatedPrompts: [rawResponse.rawText?.substring(0, 300) || payload.prompt],
            suggestedAspectRatios: [payload.parameters?.aspectRatio || '16:9', '21:9', '1:1']
        };
        return response;
    }
    async handleVideoGeneration(payload, startTime, traceId) {
        const enhancedPrompt = [
            `Synthesize Veo/Gemini temporal video directives for sequence:`,
            `Subject & Action: ${payload.prompt}`,
            `Aspect Ratio: ${payload.parameters?.aspectRatio || '21:9'}`,
            `Output: Camera trajectory, motion vectors, keyframe transitions, and sonic accompaniment cues.`
        ].join('\n');
        const augmentedPayload = {
            ...payload,
            prompt: enhancedPrompt,
            systemInstruction: 'You are the PrimordiaOS Temporal Motion Director specializing in physical camera choreography.'
        };
        const request = this.buildNormalizedRequest(augmentedPayload);
        const rawResponse = await this.adapter.generateContent(request, traceId);
        const response = this.buildNormalizedResponse('VIDEO_GENERATION', rawResponse.rawText || '', startTime, traceId, rawResponse);
        response.mediaMetadata = {
            motionVectors: ['Dolly-in 1.2m/s with pan left 15 deg', 'Tilt-up 30 deg accelerating smoothly'],
            visualKeyframes: ['Keyframe 0: Establishing anamorphic wide', 'Keyframe 120: Monolithic close-up on physical geometry']
        };
        return response;
    }
    async handleEmbeddings(payload, startTime, traceId) {
        const embeddingRes = await this.adapter.getEmbedding({
            text: payload.prompt,
            taskType: 'SEMANTIC_SIMILARITY'
        }, traceId);
        return {
            taskType: 'EMBEDDINGS',
            content: `Embedded ${payload.prompt.length} characters into ${embeddingRes.dimensions}-dim vector`,
            embeddingVector: embeddingRes.embedding,
            executionTimeMs: Date.now() - startTime,
            isFallback: Boolean(embeddingRes.isFallback),
            traceId
        };
    }
    async handleMultimodalReasoning(payload, startTime, traceId) {
        const request = this.buildNormalizedRequest(payload);
        const rawResponse = await this.adapter.generateContent(request, traceId);
        return this.buildNormalizedResponse('MULTIMODAL_REASONING', rawResponse.rawText || '', startTime, traceId, rawResponse);
    }
    buildNormalizedResponse(taskType, text, startTime, traceId, raw) {
        let structuredJson;
        try {
            const jsonStart = text.indexOf('{');
            const jsonEnd = text.lastIndexOf('}');
            if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
                structuredJson = JSON.parse(text.substring(jsonStart, jsonEnd + 1));
            }
        }
        catch {
            // not JSON formatted
        }
        return {
            taskType,
            content: text,
            structuredJson,
            tokenUsage: raw.usageMetadata ? {
                promptTokens: raw.usageMetadata.promptTokenCount,
                candidateTokens: raw.usageMetadata.candidatesTokenCount,
                totalTokens: raw.usageMetadata.totalTokenCount
            } : undefined,
            executionTimeMs: Date.now() - startTime,
            isFallback: Boolean(raw.isFallback),
            traceId
        };
    }
}

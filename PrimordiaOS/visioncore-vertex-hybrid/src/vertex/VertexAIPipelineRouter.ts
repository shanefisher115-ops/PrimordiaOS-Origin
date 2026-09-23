/**
 * VertexAIPipelineRouter - Task Router, Payload Normalizer & Unified Response Subsystem
 * Agent Role: Vertex AI Pipeline Router Specialist
 * PrimordiaOS VisionCore x Vertex AI Substrate
 */

import { HybridLogger } from '../logging/HybridLogger.js';
import {
  VertexAIAdapter,
  GenerateContentRequest,
  GenerateContentResponse,
  MultimodalPart,
  EmbeddingResponse
} from './VertexAIAdapter.js';

export type VertexTaskType =
  | 'TEXT_GENERATION'
  | 'IMAGE_GENERATION'
  | 'VIDEO_GENERATION'
  | 'EMBEDDINGS'
  | 'MULTIMODAL_REASONING';

export interface MultimodalAttachment {
  type: 'image' | 'video' | 'audio' | 'document';
  mimeType: string;
  dataBase64?: string;
  uri?: string;
}

export interface InboundTaskPayload {
  taskType: VertexTaskType;
  prompt: string;
  systemInstruction?: string;
  attachments?: MultimodalAttachment[];
  parameters?: {
    temperature?: number;
    maxOutputTokens?: number;
    aspectRatio?: '16:9' | '9:16' | '1:1' | '4:3' | '21:9';
    seed?: number;
    responseFormat?: 'text' | 'json';
  };
  traceId?: string;
}

export interface VertexNormalizedResponse {
  taskType: VertexTaskType;
  content: string;
  structuredJson?: Record<string, unknown>;
  mediaMetadata?: {
    generatedPrompts?: string[];
    suggestedAspectRatios?: string[];
    motionVectors?: string[];
    visualKeyframes?: string[];
  };
  embeddingVector?: number[];
  tokenUsage?: {
    promptTokens: number;
    candidateTokens: number;
    totalTokens: number;
  };
  executionTimeMs: number;
  isFallback: boolean;
  traceId: string;
}

export class VertexAIPipelineRouter {
  private logger: HybridLogger;
  private adapter: VertexAIAdapter;

  constructor(adapter?: VertexAIAdapter) {
    this.logger = new HybridLogger('VertexAIPipelineRouter');
    this.adapter = adapter || new VertexAIAdapter();
  }

  public getAdapter(): VertexAIAdapter {
    return this.adapter;
  }

  /**
   * Main entry point to route inbound tasks to their normalized execution pipeline
   */
  public async route(payload: InboundTaskPayload): Promise<VertexNormalizedResponse> {
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
        throw new Error(`Unsupported Vertex task type: ${(payload as { taskType: string }).taskType}`);
    }
  }

  /**
   * Normalizes inbound payload into standard Vertex AI GenerateContentRequest
   */
  private buildNormalizedRequest(payload: InboundTaskPayload): GenerateContentRequest {
    const parts: MultimodalPart[] = [{ text: payload.prompt }];

    if (payload.attachments) {
      for (const att of payload.attachments) {
        if (att.dataBase64) {
          parts.push({
            inlineData: {
              mimeType: att.mimeType,
              data: att.dataBase64
            }
          });
        } else if (att.uri) {
          parts.push({
            fileData: {
              mimeType: att.mimeType,
              fileUri: att.uri
            }
          });
        }
      }
    }

    const request: GenerateContentRequest = {
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

  private async handleTextGeneration(
    payload: InboundTaskPayload,
    startTime: number,
    traceId: string
  ): Promise<VertexNormalizedResponse> {
    const request = this.buildNormalizedRequest(payload);
    const rawResponse = await this.adapter.generateContent(request, traceId);

    return this.buildNormalizedResponse(
      'TEXT_GENERATION',
      rawResponse.rawText || '',
      startTime,
      traceId,
      rawResponse
    );
  }

  private async handleImageGeneration(
    payload: InboundTaskPayload,
    startTime: number,
    traceId: string
  ): Promise<VertexNormalizedResponse> {
    // Augment prompt with director-grade visual framing directives
    const enhancedPrompt = [
      `Generate high-fidelity cinematic image render instructions and descriptive prompts:`,
      `Target Concept: ${payload.prompt}`,
      `Aspect Ratio: ${payload.parameters?.aspectRatio || '16:9'}`,
      `Deliverable: Exact generative prompt, camera focal length, volumetric lighting setup, color grade LUT.`
    ].join('\n');

    const augmentedPayload: InboundTaskPayload = {
      ...payload,
      prompt: enhancedPrompt,
      systemInstruction: 'You are the PrimordiaOS Visual Imaging Engine specializing in photorealistic anamorphic cinema.'
    };

    const request = this.buildNormalizedRequest(augmentedPayload);
    const rawResponse = await this.adapter.generateContent(request, traceId);

    const response = this.buildNormalizedResponse(
      'IMAGE_GENERATION',
      rawResponse.rawText || '',
      startTime,
      traceId,
      rawResponse
    );

    response.mediaMetadata = {
      generatedPrompts: [rawResponse.rawText?.substring(0, 300) || payload.prompt],
      suggestedAspectRatios: [payload.parameters?.aspectRatio || '16:9', '21:9', '1:1']
    };

    return response;
  }

  private async handleVideoGeneration(
    payload: InboundTaskPayload,
    startTime: number,
    traceId: string
  ): Promise<VertexNormalizedResponse> {
    const enhancedPrompt = [
      `Synthesize Veo/Gemini temporal video directives for sequence:`,
      `Subject & Action: ${payload.prompt}`,
      `Aspect Ratio: ${payload.parameters?.aspectRatio || '21:9'}`,
      `Output: Camera trajectory, motion vectors, keyframe transitions, and sonic accompaniment cues.`
    ].join('\n');

    const augmentedPayload: InboundTaskPayload = {
      ...payload,
      prompt: enhancedPrompt,
      systemInstruction: 'You are the PrimordiaOS Temporal Motion Director specializing in physical camera choreography.'
    };

    const request = this.buildNormalizedRequest(augmentedPayload);
    const rawResponse = await this.adapter.generateContent(request, traceId);

    const response = this.buildNormalizedResponse(
      'VIDEO_GENERATION',
      rawResponse.rawText || '',
      startTime,
      traceId,
      rawResponse
    );

    response.mediaMetadata = {
      motionVectors: ['Dolly-in 1.2m/s with pan left 15 deg', 'Tilt-up 30 deg accelerating smoothly'],
      visualKeyframes: ['Keyframe 0: Establishing anamorphic wide', 'Keyframe 120: Monolithic close-up on physical geometry']
    };

    return response;
  }

  private async handleEmbeddings(
    payload: InboundTaskPayload,
    startTime: number,
    traceId: string
  ): Promise<VertexNormalizedResponse> {
    const embeddingRes: EmbeddingResponse = await this.adapter.getEmbedding({
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

  private async handleMultimodalReasoning(
    payload: InboundTaskPayload,
    startTime: number,
    traceId: string
  ): Promise<VertexNormalizedResponse> {
    const request = this.buildNormalizedRequest(payload);
    const rawResponse = await this.adapter.generateContent(request, traceId);

    return this.buildNormalizedResponse(
      'MULTIMODAL_REASONING',
      rawResponse.rawText || '',
      startTime,
      traceId,
      rawResponse
    );
  }

  private buildNormalizedResponse(
    taskType: VertexTaskType,
    text: string,
    startTime: number,
    traceId: string,
    raw: GenerateContentResponse
  ): VertexNormalizedResponse {
    let structuredJson: Record<string, unknown> | undefined;

    try {
      const jsonStart = text.indexOf('{');
      const jsonEnd = text.lastIndexOf('}');
      if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
        structuredJson = JSON.parse(text.substring(jsonStart, jsonEnd + 1));
      }
    } catch {
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

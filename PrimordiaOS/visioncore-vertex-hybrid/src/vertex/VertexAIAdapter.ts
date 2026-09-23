/**
 * VertexAIAdapter - Resilient Multimodal Client for Google Vertex AI & Gemini APIs
 * Agent Role: Gemini Adapter Specialist
 * PrimordiaOS VisionCore x Vertex AI Substrate
 */

import { HybridLogger } from '../logging/HybridLogger.js';

export interface VertexConfig {
  projectId?: string;
  location?: string;
  model?: string;
  apiKey?: string;
  maxRetries?: number;
  timeoutMs?: number;
}

export interface MultimodalPart {
  text?: string;
  inlineData?: {
    mimeType: string;
    data: string; // base64
  };
  fileData?: {
    mimeType: string;
    fileUri: string;
  };
}

export interface MultimodalContent {
  role: 'user' | 'model' | 'system';
  parts: MultimodalPart[];
}

export interface GenerateContentRequest {
  contents: MultimodalContent[];
  systemInstruction?: {
    parts: MultimodalPart[];
  };
  generationConfig?: {
    temperature?: number;
    topP?: number;
    topK?: number;
    maxOutputTokens?: number;
    stopSequences?: string[];
    responseMimeType?: string;
  };
  safetySettings?: Array<{
    category: string;
    threshold: string;
  }>;
}

export interface CandidateResponse {
  content: {
    role: string;
    parts: Array<{
      text?: string;
      inlineData?: { mimeType: string; data: string };
    }>;
  };
  finishReason?: string;
  safetyRatings?: Array<{
    category: string;
    probability: string;
  }>;
}

export interface GenerateContentResponse {
  candidates?: CandidateResponse[];
  usageMetadata?: {
    promptTokenCount: number;
    candidatesTokenCount: number;
    totalTokenCount: number;
  };
  modelVersion?: string;
  rawText?: string;
  isFallback?: boolean;
}

export interface EmbeddingRequest {
  text: string;
  taskType?: 'RETRIEVAL_QUERY' | 'RETRIEVAL_DOCUMENT' | 'SEMANTIC_SIMILARITY' | 'CLASSIFICATION' | 'CLUSTERING';
  title?: string;
}

export interface EmbeddingResponse {
  embedding: number[];
  dimensions: number;
  isFallback?: boolean;
}

export class VertexAIAdapter {
  private logger: HybridLogger;
  private config: Required<VertexConfig>;

  constructor(config?: VertexConfig) {
    this.logger = new HybridLogger('VertexAIAdapter');
    this.config = {
      projectId: config?.projectId || process.env.VERTEX_AI_PROJECT_ID || '',
      location: config?.location || process.env.VERTEX_AI_LOCATION || 'us-central1',
      model: config?.model || process.env.VERTEX_AI_MODEL || 'gemini-1.5-pro',
      apiKey: config?.apiKey || process.env.VERTEX_AI_API_KEY || '',
      maxRetries: config?.maxRetries ?? 3,
      timeoutMs: config?.timeoutMs ?? 45000
    };

    if (!this.hasValidCredentials()) {
      this.logger.warn('No Vertex AI project or API key configured. Adapter running in resilient Director Heuristic Fallback mode.');
    } else {
      this.logger.info(`VertexAIAdapter initialized for model [${this.config.model}] at location [${this.config.location}]`);
    }
  }

  public hasValidCredentials(): boolean {
    return Boolean(this.config.apiKey || (this.config.projectId && this.config.location));
  }

  public getConfig(): Readonly<Required<VertexConfig>> {
    return { ...this.config };
  }

  /**
   * Builds the API target URL based on available credentials (API Key vs Vertex AI GCP Endpoint)
   */
  private buildEndpointUrl(action: 'generateContent' | 'embedContent' = 'generateContent'): string {
    if (this.config.apiKey) {
      // Direct Gemini Developer / Express endpoint
      return `https://generativelanguage.googleapis.com/v1beta/models/${this.config.model}:${action}?key=${this.config.apiKey}`;
    }
    // Google Cloud Vertex AI standard endpoint
    return `https://${this.config.location}-aiplatform.googleapis.com/v1/projects/${this.config.projectId}/locations/${this.config.location}/publishers/google/models/${this.config.model}:${action}`;
  }

  /**
   * Executes multimodal generation with exponential backoff retries and payload parsing
   */
  public async generateContent(
    request: GenerateContentRequest,
    traceId?: string
  ): Promise<GenerateContentResponse> {
    const startTime = Date.now();

    // If no credentials are provided, return the deterministic sovereign fallback
    if (!this.hasValidCredentials()) {
      this.logger.debug('Executing local sovereign heuristic generation (no cloud credentials)', undefined, traceId);
      return this.generateHeuristicFallback(request);
    }

    const endpoint = this.buildEndpointUrl('generateContent');
    let attempt = 0;
    let delay = 1000;

    while (attempt < this.config.maxRetries) {
      attempt++;
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), this.config.timeoutMs);

        const headers: Record<string, string> = {
          'Content-Type': 'application/json'
        };

        const response = await fetch(endpoint, {
          method: 'POST',
          headers,
          body: JSON.stringify(request),
          signal: controller.signal
        });

        clearTimeout(timer);

        if (!response.ok) {
          const errorBody = await response.text();
          // Check for rate limit or server error to trigger retry
          if (response.status === 429 || (response.status >= 500 && response.status < 600)) {
            this.logger.warn(`Vertex AI temporary error (${response.status}) on attempt ${attempt}: ${errorBody}`);
            if (attempt < this.config.maxRetries) {
              const jitter = Math.floor(Math.random() * 300);
              await new Promise(resolve => setTimeout(resolve, delay + jitter));
              delay *= 2;
              continue;
            }
          }
          throw new Error(`Vertex AI HTTP error ${response.status}: ${errorBody}`);
        }

        const data = (await response.json()) as GenerateContentResponse;
        const textParts = data.candidates?.[0]?.content?.parts?.map(p => p.text).filter(Boolean) || [];
        data.rawText = textParts.join('\n');

        const duration = Date.now() - startTime;
        this.logger.info(`Vertex AI generation succeeded in ${duration}ms (tokens: ${data.usageMetadata?.totalTokenCount ?? 'N/A'})`, undefined, traceId);
        return data;

      } catch (err) {
        if (attempt >= this.config.maxRetries) {
          this.logger.quarantine(err, { request, attempt, endpoint }, 'HIGH', traceId);
          this.logger.warn('Vertex AI API exhausted retries. Falling back to sovereign heuristic response.', undefined, traceId);
          return this.generateHeuristicFallback(request);
        }
        const jitter = Math.floor(Math.random() * 300);
        await new Promise(resolve => setTimeout(resolve, delay + jitter));
        delay *= 2;
      }
    }

    return this.generateHeuristicFallback(request);
  }

  /**
   * Generates vector embeddings for semantic similarity and trend forecasting
   */
  public async getEmbedding(
    req: EmbeddingRequest,
    traceId?: string
  ): Promise<EmbeddingResponse> {
    if (!this.hasValidCredentials()) {
      return this.generateDeterministicEmbedding(req.text);
    }

    try {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${this.config.apiKey}`;
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'models/text-embedding-004',
          content: { parts: [{ text: req.text }] }
        })
      });

      if (response.ok) {
        const json = await response.json() as { embedding?: { values: number[] } };
        const values = json.embedding?.values || [];
        return {
          embedding: values,
          dimensions: values.length,
          isFallback: false
        };
      }
    } catch (err) {
      this.logger.warn('Embedding request failed, falling back to deterministic local embedding.', { error: String(err) }, traceId);
    }

    return this.generateDeterministicEmbedding(req.text);
  }

  /**
   * High-altitude deterministic heuristic generator used in test environments
   * or when external connectivity is restricted.
   */
  private generateHeuristicFallback(request: GenerateContentRequest): GenerateContentResponse {
    const userPrompt = request.contents[0]?.parts[0]?.text || 'Cinematic Sequence';

    const fallbackDirectorNarrative = [
      `[VISIONCORE-VERTEX HEURISTIC SYNTHESIS]`,
      `Directorial Directive: Manifest high-friction technophysical sovereignty for: "${userPrompt.substring(0, 100)}"`,
      `Optics & Framing: Anamorphic 35mm T1.5 prime lens, focal planes calibrated with deliberate depth-of-field separation.`,
      `Lighting Architecture: Chiaroscuro keying in Imperial Gold (#D4AF37) contrasted with deep void shadows and Cyberpunk Emerald (#00FF88) fill accents.`,
      `Spatial Topology: Brutalist concrete geometry, dynamic motion parallax, particulate atmospheric haze with realistic scattering.`,
      `Acoustic Fabric: Sub-bass resonant harmonics coupled with rhythmic granular mechanical pulse.`,
      `Pacing: Measured architectural accelerando transitioning into monolithic affirmation.`
    ].join('\n\n');

    return {
      candidates: [
        {
          content: {
            role: 'model',
            parts: [{ text: fallbackDirectorNarrative }]
          },
          finishReason: 'STOP',
          safetyRatings: [
            { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', probability: 'NEGLIGIBLE' },
            { category: 'HARM_CATEGORY_HARASSMENT', probability: 'NEGLIGIBLE' }
          ]
        }
      ],
      usageMetadata: {
        promptTokenCount: 64,
        candidatesTokenCount: 198,
        totalTokenCount: 262
      },
      modelVersion: 'heuristic-sovereign-fallback-v1',
      rawText: fallbackDirectorNarrative,
      isFallback: true
    };
  }

  /**
   * Deterministic 64-dimensional pseudo-embedding from text hash for offline testing
   */
  private generateDeterministicEmbedding(text: string): EmbeddingResponse {
    const dimensions = 64;
    const embedding: number[] = new Array(dimensions).fill(0);
    let hash = 0;

    for (let i = 0; i < text.length; i++) {
      hash = (hash << 5) - hash + text.charCodeAt(i);
      hash |= 0;
      const idx = Math.abs(hash) % dimensions;
      embedding[idx] = (embedding[idx] + (text.charCodeAt(i) / 255)) / 2;
    }

    // Normalize vector
    const norm = Math.sqrt(embedding.reduce((sum, v) => sum + v * v, 0)) || 1;
    const normalized = embedding.map(v => Number((v / norm).toFixed(6)));

    return {
      embedding: normalized,
      dimensions,
      isFallback: true
    };
  }
}

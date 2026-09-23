/**
 * VisionCoreSafetyGuards - Directive Validation, Resource Envelopes & Anti-Collapse Guardrails
 * Agent Role: Safety & Logging Specialist
 */

import { VisionCoreLogger } from '../logging/VisionCoreLogger.js';

export interface SafetyValidationResult {
  valid: boolean;
  score: number; // 0 to 100
  violations: string[];
  sanitizedInput?: string;
  quarantineTriggered: boolean;
}

export interface ResourceEnvelope {
  maxRenderSteps: number;
  maxResolutionWidth: number;
  maxResolutionHeight: number;
  maxExecutionTimeoutMs: number;
  maxMemoryAllocBytes: number;
}

export class VisionCoreSafetyGuards {
  private logger: VisionCoreLogger;
  private envelope: ResourceEnvelope;

  constructor(customEnvelope?: Partial<ResourceEnvelope>) {
    this.logger = new VisionCoreLogger('VisionCoreSafetyGuards');
    this.envelope = {
      maxRenderSteps: 64,
      maxResolutionWidth: 7680, // Up to 8K UHD
      maxResolutionHeight: 4320,
      maxExecutionTimeoutMs: 300000, // 5 minutes
      maxMemoryAllocBytes: 1024 * 1024 * 1024 * 2, // 2GB
      ...customEnvelope
    };
  }

  /**
   * Validate creative prompt input for sovereignty, anti-collapse, and integrity.
   */
  public validateDirective(prompt: string, traceId?: string): SafetyValidationResult {
    const violations: string[] = [];
    let score = 100;

    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      violations.push('EMPTY_DIRECTIVE: Directive cannot be empty or non-string.');
      score -= 50;
    }

    const trimmed = prompt ? prompt.trim() : '';

    // Anti-collapse check: verify minimal cognitive friction / non-trivial length
    if (trimmed.length > 0 && trimmed.length < 5) {
      violations.push('LOW_ENTROPY_COLLAPSE: Directive lacks sufficient semantic depth.');
      score -= 30;
    }

    // Safety checks against script injection or raw system command escapes
    const destructivePatterns = [
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      /(\brm\s+-rf\b|\bDROP\s+DATABASE\b|\bFORMAT\s+C:\b)/i,
      /__proto__|prototype\[/
    ];

    for (const pattern of destructivePatterns) {
      if (pattern.test(trimmed)) {
        violations.push(`MALFORMED_PAYLOAD_DETECTED: Directive matched prohibited hazard pattern: ${pattern}`);
        score -= 70;
      }
    }

    const quarantineTriggered = score < 50;
    if (quarantineTriggered) {
      this.logger.quarantine(
        new Error(`Safety Guardrail Violation: ${violations.join('; ')}`),
        { prompt: trimmed, violations },
        'HIGH',
        traceId
      );
    } else {
      this.logger.debug('Safety directive validation succeeded', { score, violationsCount: violations.length }, traceId);
    }

    return {
      valid: violations.length === 0,
      score: Math.max(0, score),
      violations,
      sanitizedInput: this.sanitizePrompt(trimmed),
      quarantineTriggered
    };
  }

  /**
   * Cleans input string of control characters and hazardous tokens.
   */
  public sanitizePrompt(input: string): string {
    if (!input) return '';
    return input
      .replace(/[\u0000-\u0008\u000B-\u000C\u000E-\u001F]/g, '') // remove ASCII control characters
      .trim();
  }

  /**
   * Validate resource allocation against Director-Grade boundaries.
   */
  public evaluateResourceEnvelope(
    steps: number,
    width: number,
    height: number,
    timeoutMs?: number
  ): { allowed: boolean; reason?: string } {
    if (steps > this.envelope.maxRenderSteps) {
      return { allowed: false, reason: `Requested steps (${steps}) exceeds maximum envelope (${this.envelope.maxRenderSteps})` };
    }
    if (width > this.envelope.maxResolutionWidth || height > this.envelope.maxResolutionHeight) {
      return {
        allowed: false,
        reason: `Requested resolution (${width}x${height}) exceeds envelope limit (${this.envelope.maxResolutionWidth}x${this.envelope.maxResolutionHeight})`
      };
    }
    if (timeoutMs && timeoutMs > this.envelope.maxExecutionTimeoutMs) {
      return {
        allowed: false,
        reason: `Timeout limit (${timeoutMs}ms) exceeds maximum allowable threshold (${this.envelope.maxExecutionTimeoutMs}ms)`
      };
    }

    return { allowed: true };
  }

  public getEnvelope(): ResourceEnvelope {
    return { ...this.envelope };
  }
}

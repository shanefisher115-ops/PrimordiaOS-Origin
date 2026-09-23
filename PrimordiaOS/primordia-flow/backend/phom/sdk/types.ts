/**
 * ==============================================================================
 * ⭐ PHOM SDK — TYPES
 * Unified type definitions for external integrations, plugins, and custom swarms.
 * ==============================================================================
 */

import { NormalizedSignal, ExtractedProspect, ProspectScore, SynthesizedPersona, DistributionResult } from '../real/types';
import { RealBoostResult } from '../real/real_boost_engine';

export type PhomPlatform = 'x' | 'linkedin' | 'reddit' | 'bluesky' | 'mastodon' | 'instagram' | 'tiktok' | 'webhook';
export type PhomHeatBand = 'cold' | 'warm' | 'hot';

export interface PhomSdkConfig {
  apiKey?: string;
  endpoint?: string;
  dryRun?: boolean;
  debug?: boolean;
  maxConcurrency?: number;
}

export interface PhomEventMap {
  'signal:ingested': NormalizedSignal;
  'prospect:discovered': ExtractedProspect;
  'prospect:scored': { prospect: ExtractedProspect; score: ProspectScore };
  'persona:synthesized': SynthesizedPersona;
  'outbound:crafted': { prospect: ExtractedProspect; text: string; platform: PhomPlatform };
  'post:distributed': DistributionResult;
  'analytics:recorded': { postId: string; clicks: number; impressions: number; conversions?: number };
  'pipeline:start': { boostId: string; directive: string; timestamp: number };
  'pipeline:step': { layer: number; name: string; durationMs: number; status: 'success' | 'failed' | 'skipped' };
  'pipeline:complete': RealBoostResult;
  'pipeline:error': { boostId?: string; error: string };
  'pipeline:cancelled': { boostId: string; reason: string };
}

export interface AgentHookContext<TInput = unknown, TOutput = unknown> {
  agentName: string;
  executionId: string;
  startTime: number;
  input: TInput;
  output?: TOutput;
  error?: Error;
}

export interface PhomPlugin {
  name: string;
  version: string;
  install?: (sdk: any) => void | Promise<void>;
  onBeforePipeline?: (context: { boostId: string; options: any }) => void | Promise<void>;
  onAfterPipeline?: (context: { boostId: string; result: RealBoostResult }) => void | Promise<void>;
  onSignal?: (signal: NormalizedSignal) => NormalizedSignal | Promise<NormalizedSignal>;
  onProspect?: (prospect: ExtractedProspect) => ExtractedProspect | Promise<ExtractedProspect>;
  onOutbound?: (text: string, prospect: ExtractedProspect) => string | Promise<string>;
}

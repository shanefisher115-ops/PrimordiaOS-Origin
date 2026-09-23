/**
 * ==============================================================================
 * ⭐ LAYER 9: MAKE ORCHESTRATOR
 * Orchestrates workflows with Make.com, Zapier, n8n, and custom webhooks:
 * - Webhook → Make (Inbound trigger)
 * - Make → your Node API (Signal processing & Swarm execution)
 * - Make → Distributor (Outbound dispatch)
 * - Make → Analytics (Feedback loop)
 * ==============================================================================
 */

import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { normalizeSignal } from './layer0_inputs';
import { discoveryAgent } from './agents/discoveryAgent';
import { scoringAgent } from './agents/scoringAgent';
import { personaAgent } from './agents/personaAgent';
import { outboundAgent } from './agents/outboundAgent';
import { distributorAgent } from './agents/distributorAgent';
import { analyticsAgent } from './agents/analyticsAgent';

export const makeOrchestratorRouter = Router();

export interface MakeOrchestratorTrace {
  id: string;
  source: string;
  stage: string;
  status: 'received' | 'routed' | 'completed' | 'failed';
  data: Record<string, unknown>;
  timestamp: number;
}

const ORCHESTRATOR_TRACES: MakeOrchestratorTrace[] = [];

/**
 * Log orchestrator trace
 */
function logTrace(stage: string, source: string, status: MakeOrchestratorTrace['status'], data: Record<string, unknown>) {
  const trace: MakeOrchestratorTrace = {
    id: `trace_${crypto.randomUUID().slice(0, 8)}`,
    source,
    stage,
    status,
    data,
    timestamp: Math.floor(Date.now() / 1000)
  };
  ORCHESTRATOR_TRACES.unshift(trace);
  if (ORCHESTRATOR_TRACES.length > 200) {
    ORCHESTRATOR_TRACES.pop();
  }
  return trace;
}

// ── Helper Functions for Missing Matrix Items ────────────────────────────────

/**
 * Heat-Band Routing: routes leads to appropriate execution branch based on thermal band.
 */
export function routeHeatBand(heatBand: string, heatScore: number = 0): 'vip_executive' | 'priority_amplification' | 'standard_nurture' | 'cold_archive' {
  const norm = String(heatBand || '').toUpperCase();
  if (norm === 'SUPERCRITICAL' || heatScore >= 85) {
    return 'vip_executive';
  } else if (norm === 'HOT' || heatScore >= 65) {
    return 'priority_amplification';
  } else if (norm === 'WARM' || heatScore >= 40) {
    return 'standard_nurture';
  }
  return 'cold_archive';
}

/**
 * Fallback Execution Pipeline:
 * Try 1: External Make.com / Webhook
 * Try 2: Local Direct Execution
 * Try 3: Durable SQLite Fallback Queue
 */
export async function executeWithFallback(
  webhookUrl: string | undefined,
  payload: Record<string, any>,
  fallbackAction: () => Promise<any>
): Promise<{ success: boolean; executedVia: 'make_webhook' | 'local_execution' | 'durable_queue'; result: any }> {
  // Try 1: External webhook
  if (webhookUrl) {
    try {
      const res = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const json = await res.json().catch(() => ({}));
        return { success: true, executedVia: 'make_webhook', result: json };
      }
    } catch (err) {
      logTrace('fallback_make_failed', 'make', 'failed', { error: (err as any).message });
    }
  }

  // Try 2: Local direct execution
  try {
    const localRes = await fallbackAction();
    return { success: true, executedVia: 'local_execution', result: localRes };
  } catch (err) {
    logTrace('fallback_local_failed', 'local', 'failed', { error: (err as any).message });
  }

  // Try 3: Durable SQLite queue fallback
  try {
    const { RealCloudCore } = await import('./layer10_cloud_core');
    const queueId = RealCloudCore.enqueue('phom_fallback_queue', payload);
    return { success: true, executedVia: 'durable_queue', result: { queueId, status: 'enqueued_for_retry' } };
  } catch (err) {
    return { success: false, executedVia: 'durable_queue', result: { error: (err as any).message } };
  }
}

/**
 * Multi-Branch Amplification:
 * Branch 1: Direct targeted message (LinkedIn / Email)
 * Branch 2: Public social cascade (X / Bluesky / Reddit)
 * Branch 3: Internal boardroom alert / 3D telemetry pulse
 */
export async function amplifyMultiBranch(
  outbound: any,
  prospect: any,
  autoDistribute: boolean = false
): Promise<{
  branch1_direct: any;
  branch2_social: any;
  branch3_boardroom: any;
}> {
  let branch1_direct: any = null;
  let branch2_social: any = null;
  let branch3_boardroom: any = null;

  if (autoDistribute) {
    // Branch 1: Direct platform
    branch1_direct = await distributorAgent.run({
      id: outbound.id,
      text: outbound.text,
      platform: outbound.platform || 'linkedin'
    });

    // Branch 2: Public social cascade
    const cascadePlatform = outbound.platform === 'x' ? 'bluesky' : 'x';
    branch2_social = await distributorAgent.run({
      id: `${outbound.id}_social`,
      text: `Benchmark Alert for ${prospect.company_name || prospect.domain || 'Infrastructure'}: ${outbound.text.slice(0, 140)}...`,
      platform: cascadePlatform
    });
  }

  // Branch 3: Internal boardroom alert & 3D telemetry
  branch3_boardroom = {
    alert: `High-Heat Prospect Amplified: ${prospect.name} (${prospect.domain})`,
    boardroomUrl: `https://moneyplughub.com/?tab=boardroom&prospect=${encodeURIComponent(prospect.id || '')}`,
    dispatchedAt: new Date().toISOString()
  };

  return { branch1_direct, branch2_social, branch3_boardroom };
}

// ── 1. Webhook → Make / Inbound Webhook Listener ─────────────────────────────
makeOrchestratorRouter.post('/webhook', async (req: Request, res: Response) => {
  try {
    const rawPayload = req.body?.data || req.body?.payload || req.body || {};
    const trace = logTrace('webhook_receive', rawPayload.source || 'make', 'received', rawPayload);

    // Normalize incoming signal
    const normalized = normalizeSignal(rawPayload);

    // Run discovery agent
    const disc = await discoveryAgent.run(normalized);

    // Run scoring agent
    const score = await scoringAgent.run(disc.prospect, normalized);

    // Heat-Band Routing
    const branch = routeHeatBand(score.score.band, score.score.heat);

    // If warm or hot, synthesize persona & draft outbound
    let persona = null;
    let outbound = null;
    let distribution = null;
    let amplification = null;

    if (score.score.band !== 'cold' || branch !== 'cold_archive') {
      const p = await personaAgent.run(disc.prospect, normalized);
      persona = p.persona;
      const o = await outboundAgent.run(p.persona, disc.prospect);
      outbound = o.outbound;

      if (rawPayload.autoDistribute === true) {
        const d = await distributorAgent.run({
          id: o.messageId,
          text: outbound.text,
          platform: outbound.platform
        });
        distribution = d.result;

        // Run multi-branch amplification for high heat
        if (branch === 'vip_executive' || branch === 'priority_amplification') {
          amplification = await amplifyMultiBranch(
            { id: o.messageId, text: outbound.text, platform: outbound.platform },
            disc.prospect,
            true
          );
        }
      }
    }

    logTrace('webhook_pipeline_complete', normalized.source, 'completed', {
      prospectId: disc.prospect.id,
      heat: score.score.heat,
      band: score.score.band,
      branch
    });

    res.json({
      success: true,
      trace_id: trace.id,
      normalized_signal: normalized,
      prospect: disc.prospect,
      score: score.score,
      branch,
      persona,
      outbound,
      distribution,
      amplification
    });
  } catch (err: any) {
    logTrace('webhook_error', 'make', 'failed', { error: err.message });
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── 2. Make → Node API: Swarm Pipeline Runner with Heat-Band Routing ────────
makeOrchestratorRouter.post('/pipeline/run', async (req: Request, res: Response) => {
  try {
    const signal = normalizeSignal(req.body);
    const disc = await discoveryAgent.run(signal);
    const score = await scoringAgent.run(disc.prospect, signal);
    const branch = routeHeatBand(score.score.band, score.score.heat);
    const pers = await personaAgent.run(disc.prospect, signal);
    const out = await outboundAgent.run(pers.persona, disc.prospect);

    let distResult = null;
    let amplification = null;

    if (req.body.autoDistribute === true) {
      const d = await distributorAgent.run({
        id: out.messageId,
        text: out.outbound.text,
        platform: out.outbound.platform
      });
      distResult = d.result;

      if (branch === 'vip_executive' || branch === 'priority_amplification') {
        amplification = await amplifyMultiBranch(
          { id: out.messageId, text: out.outbound.text, platform: out.outbound.platform },
          disc.prospect,
          true
        );
      }
    }

    res.json({
      success: true,
      signal,
      prospect: disc.prospect,
      score: score.score,
      branch,
      persona: pers.persona,
      outbound: out.outbound,
      distribution: distResult,
      amplification
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── 3. Make → Distributor: Direct Platform Posting ───────────────────────────
makeOrchestratorRouter.post('/distribute', async (req: Request, res: Response) => {
  try {
    const { text, platform, webhookUrl, outboundId } = req.body;
    if (!text) {
      return res.status(400).json({ success: false, error: 'Missing text in distribution payload' });
    }

    const dist = await distributorAgent.run({
      id: outboundId,
      text,
      platform: platform || 'webhook',
      webhookUrl
    });

    res.json({
      success: dist.result.success,
      data: dist.result
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── 4. Make → Analytics: Metrics Ingestion ───────────────────────────────────
makeOrchestratorRouter.post('/analytics', async (req: Request, res: Response) => {
  try {
    const { postId, metrics } = req.body;
    if (!postId) {
      return res.status(400).json({ success: false, error: 'Missing postId in analytics payload' });
    }

    const analyticsOutput = await analyticsAgent.run(postId, metrics || {});

    res.json({
      success: true,
      data: analyticsOutput.analytics
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── 5. Query Recent Traces ───────────────────────────────────────────────────
makeOrchestratorRouter.get('/traces', (_req: Request, res: Response) => {
  res.json({
    success: true,
    count: ORCHESTRATOR_TRACES.length,
    traces: ORCHESTRATOR_TRACES
  });
});

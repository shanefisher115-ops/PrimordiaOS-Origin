/**
 * ==============================================================================
 * ⭐ LAYER 3: PERSONA SYNTHESIZER
 * Builds a simple persona model by:
 * - Extracting tone from comments
 * - Extracting interests from keywords
 * - Storing in SQLite
 *
 * Deliverable:
 * function synthesizePersona(prospect) {
 *   return {
 *     tone: "technical",
 *     interests: ["AI", "infra"],
 *     preferredPlatform: "LinkedIn"
 *   }
 * }
 * ==============================================================================
 */

import crypto from 'crypto';
import { SynthesizedPersona, ExtractedProspect, NormalizedSignal } from './types';
import { db } from '../db';

// Keyword to Interest taxonomy
const INTEREST_TAXONOMY: Record<string, string[]> = {
  'AI': ['ai', 'agent', 'swarm', 'llm', 'inference', 'model', 'ray', 'cuda', 'pytorch', 'prompt'],
  'infra': ['infra', 'latency', 'p99', 'cold start', 'docker', 'kubernetes', 'cloud', 'serverless', 'datacenter'],
  'database': ['sqlite', 'wal', 'database', 'postgres', 'sql', 'storage', 'cache', 'redis'],
  'automation': ['workflow', 'make', 'zapier', 'n8n', 'webhook', 'cron', 'pipeline', 'outreach'],
  'enterprise': ['sla', 'contract', 'pricing', 'security', 'compliance', 'audit', 'governance']
};

/**
 * Extracts tone from content text.
 */
export function extractTone(text: string): string {
  if (!text) return 'technical';
  const lower = text.toLowerCase();

  if (lower.includes('p99') || lower.includes('latency') || lower.includes('benchmark') || lower.includes('stack')) {
    return 'technical';
  }
  if (lower.includes('why') || lower.includes('doubt') || lower.includes('prove') || lower.includes('skeptical')) {
    return 'skeptical';
  }
  if (lower.includes('contract') || lower.includes('budget') || lower.includes('enterprise') || lower.includes('roi')) {
    return 'executive';
  }
  if (lower.includes('excited') || lower.includes('love') || lower.includes('great') || lower.includes('awesome')) {
    return 'enthusiastic';
  }
  return 'technical';
}

/**
 * Extracts interests array from content text based on keyword taxonomy.
 */
export function extractInterests(text: string): string[] {
  if (!text) return ['AI', 'infra'];
  const lower = text.toLowerCase();
  const interests = new Set<string>();

  for (const [category, keywords] of Object.entries(INTEREST_TAXONOMY)) {
    for (const kw of keywords) {
      if (lower.includes(kw)) {
        interests.add(category);
        break;
      }
    }
  }

  if (interests.size === 0) {
    interests.add('AI');
    interests.add('infra');
  }

  return Array.from(interests);
}

/**
 * Determines preferred outreach platform based on domain, signal source, or role.
 */
export function inferPreferredPlatform(source?: string, domain?: string): string {
  const model = modelPlatformPreference(source, domain);
  return model.preferredPlatform;
}

/**
 * Platform Preference Model: evaluates platform scores across social & email.
 */
export function modelPlatformPreference(source?: string, domain?: string, authorHandle?: string): { preferredPlatform: string; platformScores: Record<string, number> } {
  const scores: Record<string, number> = {
    LinkedIn: 50,
    X: 30,
    Reddit: 10,
    Email: 20,
    Bluesky: 15,
    Mastodon: 10
  };

  if (source) {
    const s = source.toLowerCase();
    if (s.includes('linkedin')) scores.LinkedIn += 45;
    else if (s.includes('x') || s.includes('twitter')) scores.X += 45;
    else if (s.includes('reddit')) scores.Reddit += 45;
    else if (s.includes('email')) scores.Email += 45;
    else if (s.includes('bluesky')) scores.Bluesky += 45;
    else if (s.includes('mastodon')) scores.Mastodon += 45;
  }

  if (domain && !domain.includes('gmail') && !domain.includes('yahoo')) {
    scores.LinkedIn += 25;
    scores.Email += 20;
  }

  if (authorHandle?.startsWith('@')) {
    scores.X += 20;
  } else if (authorHandle?.startsWith('u/')) {
    scores.Reddit += 20;
  }

  // Find max platform
  let bestPlatform = 'LinkedIn';
  let bestScore = -1;
  for (const [p, sc] of Object.entries(scores)) {
    if (sc > bestScore) {
      bestScore = sc;
      bestPlatform = p;
    }
  }

  return {
    preferredPlatform: bestPlatform,
    platformScores: scores
  };
}

/**
 * CTA Preference Model: selects optimal CTA based on prospect role, domain, and tone.
 */
export function modelCtaPreference(
  prospect: ExtractedProspect | Record<string, any>,
  tone: string = 'technical'
): { optimalCta: string; ctaType: 'benchmark_teardown' | 'calibrated_pilot' | 'boardroom_briefing' | 'direct_demo' | 'quick_chat'; ctaUrl: string } {
  const cleanDomain = String(prospect?.domain || 'company').toLowerCase();

  if (tone === 'executive') {
    return {
      optimalCta: 'Review the Sovereign Executive Teardown & ROI Briefing',
      ctaType: 'boardroom_briefing',
      ctaUrl: `https://moneyplughub.com/?tab=boardroom&domain=${encodeURIComponent(cleanDomain)}`
    };
  } else if (tone === 'skeptical') {
    return {
      optimalCta: 'Inspect our Reproducible P99 Latency Benchmarks on GitHub',
      ctaType: 'benchmark_teardown',
      ctaUrl: `https://moneyplughub.com/?tab=reality-engine&benchmark=${encodeURIComponent(cleanDomain)}`
    };
  } else if (tone === 'enthusiastic') {
    return {
      optimalCta: 'Spin up an Instant Pilot Instance on your Infrastructure',
      ctaType: 'calibrated_pilot',
      ctaUrl: `https://moneyplughub.com/?tab=pilot&domain=${encodeURIComponent(cleanDomain)}`
    };
  }

  return {
    optimalCta: 'Explore the Open Benchmark Architecture Spec',
    ctaType: 'benchmark_teardown',
    ctaUrl: `https://moneyplughub.com/?tab=reality-engine&domain=${encodeURIComponent(cleanDomain)}`
  };
}

/**
 * Timing Predictor: predicts the optimal UTC delivery window.
 */
export function predictOptimalTiming(
  domain?: string,
  _locationHint?: string
): { bestUtcHour: number; recommendedDay: string; timezone: string; windowDescription: string } {
  const clean = String(domain || '').toLowerCase();
  
  // European domains
  if (clean.endsWith('.fr') || clean.endsWith('.de') || clean.endsWith('.uk') || clean.endsWith('.eu')) {
    return {
      bestUtcHour: 9,
      recommendedDay: 'Tuesday',
      timezone: 'Europe/Paris (UTC+1/+2)',
      windowDescription: 'Tuesday 09:00 UTC (10:00 CET Morning Peak)'
    };
  }

  // Asia / Pacific domains
  if (clean.endsWith('.jp') || clean.endsWith('.sg') || clean.endsWith('.au') || clean.endsWith('.in')) {
    return {
      bestUtcHour: 2,
      recommendedDay: 'Wednesday',
      timezone: 'Asia/Singapore (UTC+8)',
      windowDescription: 'Wednesday 02:00 UTC (10:00 SGT Morning Peak)'
    };
  }

  // Default US East / Central / West sweet spot (14:00 UTC = 10:00 AM EDT / 7:00 AM PDT)
  return {
    bestUtcHour: 14,
    recommendedDay: 'Tuesday',
    timezone: 'America/New_York (UTC-4/-5)',
    windowDescription: 'Tuesday 14:00 UTC (10:00 AM EDT Executive Sweet Spot)'
  };
}

/**
 * Ensures the SQLite `personas` table exists.
 */
export function initPersonaTable(): void {
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS prospects (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE,
        name TEXT,
        domain TEXT,
        heat INTEGER DEFAULT 0,
        band TEXT DEFAULT 'cold',
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS personas (
        id TEXT PRIMARY KEY,
        prospect_id TEXT UNIQUE NOT NULL,
        tone TEXT NOT NULL,
        interests TEXT NOT NULL,
        preferred_platform TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        FOREIGN KEY (prospect_id) REFERENCES prospects(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_personas_prospect ON personas(prospect_id);
    `);
  } catch (err) {
    console.error('Warning: could not init personas table in db:', err);
  }
}

/**
 * Deliverable Function:
 * Builds a simple persona model and saves it to SQLite.
 */
export function synthesizePersona(
  prospect: ExtractedProspect | Record<string, any>,
  signal?: NormalizedSignal | Record<string, any>
): SynthesizedPersona {
  initPersonaTable();

  const content = String(
    signal?.content || 
    (prospect as any)?.content || 
    (prospect as any)?.comment || 
    (Array.isArray((prospect as any)?.comments) ? (prospect as any).comments.join(' ') : (prospect as any)?.comments) || 
    (prospect as any)?.text || 
    (prospect as any)?.context || 
    (prospect as any)?.signal?.content || 
    ''
  );

  const tone = (prospect as any)?.tone || extractTone(content);
  const interests = (prospect as any)?.interests || extractInterests(content);
  
  // Platform Preference Model
  const platformPref = modelPlatformPreference(signal?.source || (prospect as any)?.source, prospect?.domain || undefined, signal?.author);
  const preferredPlatform = (prospect as any)?.preferredPlatform || platformPref.preferredPlatform;

  // CTA Preference Model
  const ctaPreference = modelCtaPreference(prospect, tone);

  // Timing Predictor
  const timingPrediction = predictOptimalTiming(prospect?.domain || undefined);

  const prospectId = prospect?.id || prospect?.email || `prosp_${crypto.randomUUID().slice(0, 8)}`;
  const personaId = `pers_${crypto.createHash('sha256').update(prospectId).digest('hex').slice(0, 10)}`;
  const now = Math.floor(Date.now() / 1000);

  const persona: SynthesizedPersona = {
    id: personaId,
    prospectId,
    tone,
    interests,
    preferredPlatform,
    ctaPreference,
    platformPreference: platformPref,
    timingPrediction
  };

  // Persist into SQLite (ensuring foreign key prospect reference exists)
  try {
    db.prepare(`
      INSERT INTO prospects (id, email, name, domain, heat, band, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO NOTHING
    `).run(prospectId, prospect?.email || null, prospect?.name || 'Valued Prospect', prospect?.domain || null, 0, 'cold', now, now);

    db.prepare(`
      INSERT INTO personas (id, prospect_id, tone, interests, preferred_platform, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(prospect_id) DO UPDATE SET
        tone = excluded.tone,
        interests = excluded.interests,
        preferred_platform = excluded.preferred_platform,
        updated_at = excluded.updated_at
    `).run(personaId, prospectId, tone, JSON.stringify(interests), preferredPlatform, now, now);
  } catch (err) {
    // Non-fatal if running in detached memory mode
    console.warn('[Persona Synthesizer] DB persist notice:', (err as any).message);
  }

  return persona;
}

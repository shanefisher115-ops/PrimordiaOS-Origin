/**
 * ==============================================================================
 * 🌑 LEVEL 33: SOVEREIGN CAPSULE BUILDER & PROTOCOL DISPATCHER
 * Encodes, Ed25519 signs, and routes Sovereign Outbound Reality Capsules.
 * Replaces RFC 5322 MIME email packets with immutable cryptographically sealed capsules.
 * ==============================================================================
 */

import crypto from 'crypto';
import { db } from '../db';
import { 
  SovereignCapsule, 
  SovereignCapsuleHeader, 
  SovereignTrustAnchor, 
  SovereignCapsulePayload, 
  PsmSignPacket 
} from './level33_types';
import { OsmiumLedger } from './osmium_ledger';
import { PrimordiaRelayFabric } from './psm_relays';
import { getBoardroomByProspect, synthesizeBoardroom, BoardroomData } from './boardroom_engine';

export interface DispatchCapsuleOptions {
  prospectId: string;
  recipientEmail?: string;
  recipientName?: string;
  customSubject?: string;
  customCopy?: string;
  agentProvenance?: string;
}

export class SovereignCapsuleEngine {
  private static initialized = false;

  public static init(): void {
    if (this.initialized) return;

    OsmiumLedger.init();
    PrimordiaRelayFabric.init();

    db.exec(`
      CREATE TABLE IF NOT EXISTS psm_capsules (
        capsule_id TEXT PRIMARY KEY,
        protocol TEXT NOT NULL,
        version TEXT NOT NULL,
        sender_uri TEXT NOT NULL,
        recipient_domain TEXT NOT NULL,
        recipient_email TEXT NOT NULL,
        recipient_name TEXT NOT NULL,
        boardroom_id TEXT NOT NULL,
        company_name TEXT NOT NULL,
        bond_serial TEXT NOT NULL,
        stake_amount_usd REAL NOT NULL,
        subject TEXT NOT NULL,
        executive_briefing TEXT NOT NULL,
        voice_script TEXT NOT NULL,
        savings_usd REAL NOT NULL,
        latency_ms REAL NOT NULL,
        efficiency_pct REAL NOT NULL,
        block_index INTEGER NOT NULL,
        block_hash TEXT NOT NULL,
        signature_hex TEXT NOT NULL,
        delivery_status TEXT NOT NULL,
        total_latency_ms REAL NOT NULL,
        receipt_id TEXT,
        created_at INTEGER NOT NULL,
        capsule_json TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_capsules_recipient ON psm_capsules(recipient_email);
      CREATE INDEX IF NOT EXISTS idx_capsules_domain ON psm_capsules(recipient_domain);
    `);

    this.initialized = true;
    console.log('[Sovereign Capsule Engine] Level 33 Dispatcher Substrate Initialized.');
  }

  /**
   * Builds, mines, signs, routes, and records a Level 33 Sovereign Capsule.
   */
  public static dispatchCapsule(options: DispatchCapsuleOptions): SovereignCapsule {
    if (!this.initialized) this.init();

    const { prospectId } = options;
    const prospect = db.prepare('SELECT * FROM prospects WHERE id = ?').get(prospectId) as any;
    if (!prospect) {
      throw new Error(`Prospect not found with ID: ${prospectId}`);
    }

    // 1. Resolve or synthesize Boardroom Trust Anchor
    let boardroom: BoardroomData | null = getBoardroomByProspect(prospectId);
    if (!boardroom) {
      boardroom = synthesizeBoardroom({
        id: prospect.id,
        email: prospect.email,
        name: prospect.name,
        domain: prospect.domain,
        mxVerified: Boolean(prospect.mx_verified),
        mxRecords: prospect.mx_records,
        enrichment: {
          industry: 'Enterprise Technology',
          companySize: '100-1000 employees',
          techStack: ['Node.js', 'PostgreSQL', 'Docker', 'Kubernetes']
        }
      });
    }

    const capsuleId = 'CAPSULE-33-' + crypto.randomUUID().slice(0, 18).toUpperCase();
    const recipientEmail = options.recipientEmail || prospect.email || `${(prospect.name || 'prospect').toLowerCase().replace(/[^a-z0-9]/g, '') || 'lead'}@sovereign.network`;
    const recipientName = options.recipientName || prospect.name || 'Sovereign Prospect';
    const recipientDomain = prospect.domain || (recipientEmail.includes('@') ? recipientEmail.split('@')[1] : 'sovereign.network');
    const bondSerial = boardroom.omegaBond?.bondSerial || ('PRIM-OMEGA-' + capsuleId.slice(11, 19));
    const stakeAmountUsd = boardroom.omegaBond?.bondAmountUsd || 12500;
    const escrowHash = boardroom.omegaBond?.escrowRef || ('0x' + crypto.randomBytes(8).toString('hex'));
    const agentProvenance = options.agentProvenance || 'discoveryAgent -> scoringAgent -> personaAgent -> outboundAgent -> soreDispatcher';

    // 2. Build Header
    const header: SovereignCapsuleHeader = {
      capsuleId,
      protocol: 'PSM/33',
      senderAuthorityUri: 'psm://origin.primordia.network/shane',
      recipientDomain,
      recipientEmail,
      recipientName,
      createdEpoch: Date.now(),
      trustTier: 'LEVEL_33_SOVEREIGN'
    };

    // 3. Build Trust Anchor
    const trustAnchor: SovereignTrustAnchor = {
      boardroomId: boardroom.id,
      boardroomUrl: boardroom.boardroomUrl,
      companyName: boardroom.companyName || recipientName,
      domain: boardroom.domain || recipientDomain,
      omegaBondSerial: bondSerial,
      bondAmountUsd: stakeAmountUsd,
      escrowHash,
      agentProvenance,
      verifiedMx: Boolean(prospect.mx_verified)
    };

    // 4. Build Structured Payload
    const subject = options.customSubject || `Sovereign Briefing: $${stakeAmountUsd.toLocaleString()} Ω-Bond Staked for ${boardroom.companyName}`;
    const executiveBriefing = options.customCopy || `PrimordiaOS Sovereign Outbound Reality Engine has established an immutable execution bridge for ${boardroom.companyName}. We have staked $${stakeAmountUsd.toLocaleString()} USD against modeled compute overhead reductions and sub-millisecond p99 latency gains.`;

    const payload: SovereignCapsulePayload = {
      subject,
      executiveBriefing,
      voiceScript: boardroom.voiceScript,
      projectedMonthlySavingsUsd: boardroom.roiMetrics.monthlySavingsUsd || 20160,
      p99LatencyReductionMs: boardroom.roiMetrics.p99LatencyReductionMs || 185,
      modeledEfficiencyPct: Math.round(((boardroom.roiMetrics.monthlySavingsUsd || 20160) / (boardroom.roiMetrics.currentMonthlyCostUsd || 48000)) * 100) || 42,
      customOutboundCopy: options.customCopy,
      actionCtaUrl: boardroom.boardroomUrl,
      actionCtaText: `Claim $${stakeAmountUsd.toLocaleString()} Ω-Bond & Access Executive Boardroom`
    };

    // 5. Calculate Canonical Payload Hash (SHA-256)
    const payloadRaw = JSON.stringify({ header, trustAnchor, payload });
    const payloadHashSha256 = crypto.createHash('sha256').update(payloadRaw).digest('hex');

    // 6. Mine & Ed25519 Sign Osmium Ledger Block
    const block = OsmiumLedger.mineBlock(
      capsuleId,
      payloadHashSha256,
      bondSerial,
      stakeAmountUsd,
      'SovereignOutboundAgent'
    );

    const signature: PsmSignPacket = {
      type: 'PSM-SIGN',
      capsuleId,
      osmiumBlockIndex: block.index,
      osmiumBlockHash: block.blockHash,
      payloadHashSha256,
      ed25519SignatureHex: block.signatureHex,
      signerPublicKeyHex: block.signerPublicKeyHex,
      omegaBondSerial: bondSerial,
      stakeAmountUsd,
      timestamp: block.timestamp
    };

    // 7. Route through Primordia Mesh Relays
    const { trace, receipt } = PrimordiaRelayFabric.routeAndDeliver(capsuleId, payloadHashSha256);

    // 8. Assemble Full Sovereign Capsule
    const capsule: SovereignCapsule = {
      capsuleId,
      protocol: 'PSM/33',
      version: '2026.1',
      header,
      trustAnchor,
      payload,
      signature,
      trace,
      receipt,
      deliveryStatus: 'delivered',
      createdAt: Date.now()
    };

    // 9. Persist Capsule to SQLite WAL
    db.prepare(`
      INSERT INTO psm_capsules (
        capsule_id, protocol, version, sender_uri, recipient_domain,
        recipient_email, recipient_name, boardroom_id, company_name,
        bond_serial, stake_amount_usd, subject, executive_briefing,
        voice_script, savings_usd, latency_ms, efficiency_pct,
        block_index, block_hash, signature_hex, delivery_status,
        total_latency_ms, receipt_id, created_at, capsule_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      capsule.capsuleId,
      capsule.protocol,
      capsule.version,
      capsule.header.senderAuthorityUri,
      capsule.header.recipientDomain,
      capsule.header.recipientEmail,
      capsule.header.recipientName,
      capsule.trustAnchor.boardroomId,
      capsule.trustAnchor.companyName,
      capsule.trustAnchor.omegaBondSerial,
      capsule.trustAnchor.bondAmountUsd,
      capsule.payload.subject,
      capsule.payload.executiveBriefing,
      capsule.payload.voiceScript,
      capsule.payload.projectedMonthlySavingsUsd,
      capsule.payload.p99LatencyReductionMs,
      capsule.payload.modeledEfficiencyPct,
      capsule.signature.osmiumBlockIndex,
      capsule.signature.osmiumBlockHash,
      capsule.signature.ed25519SignatureHex,
      capsule.deliveryStatus,
      capsule.trace.totalLatencyMs,
      capsule.receipt?.receiptId || null,
      capsule.createdAt,
      JSON.stringify(capsule)
    );

    console.log(`[Sovereign Capsule Engine] Dispatched ${capsule.capsuleId} via PSM/33 (Block #${block.index}, ${capsule.trace.totalLatencyMs}ms latency)`);
    return capsule;
  }

  public static getCapsuleById(capsuleId: string): SovereignCapsule | null {
    if (!this.initialized) this.init();
    const row = db.prepare('SELECT capsule_json FROM psm_capsules WHERE capsule_id = ?').get(capsuleId) as any;
    if (!row) return null;
    return JSON.parse(row.capsule_json);
  }

  public static listCapsules(limit = 50): SovereignCapsule[] {
    if (!this.initialized) this.init();
    const rows = db.prepare('SELECT capsule_json FROM psm_capsules ORDER BY created_at DESC LIMIT ?').all(limit) as any[];
    return rows.map(r => JSON.parse(r.capsule_json));
  }
}
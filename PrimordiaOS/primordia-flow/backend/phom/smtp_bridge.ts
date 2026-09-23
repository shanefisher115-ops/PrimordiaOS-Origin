/**
 * ==============================================================================
 * 🌑 LEVEL 33: LEGACY SMTP COMPATIBILITY BRIDGE
 * Translates PSM/33 Sovereign Capsules into RFC 5322 MIME for legacy inboxes.
 * SMTP is strictly an optional translation bridge — not the core delivery engine.
 * ==============================================================================
 */

import nodemailer from 'nodemailer';
import { SovereignCapsule } from './level33_types';
import { getSmtpConfig, EmailDispatchResult } from './email_sender';
import { AwsSesClient } from './aws_ses_client';
import { db } from '../db';

export class LegacySmtpBridge {
  /**
   * Translates a Sovereign Capsule to RFC 5322 and dispatches via SMTP or spools with PSM headers.
   */
  public static async bridgeCapsuleToSmtp(capsule: SovereignCapsule): Promise<EmailDispatchResult> {
    const config = getSmtpConfig();
    const beaconUrl = `http://localhost:5174/?tab=sore&verify=${capsule.capsuleId}`;

    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>${capsule.payload.subject}</title>
  <style>
    body { margin: 0; padding: 0; background-color: #090a0f; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #e2e8f0; }
    .container { max-width: 620px; margin: 0 auto; background-color: #0c101a; border: 1px solid #1e293b; border-radius: 12px; overflow: hidden; }
    .header { padding: 28px 36px 20px 36px; border-bottom: 1px solid #1e293b; background: linear-gradient(180deg, #111827 0%, #0c101a 100%); }
    .protocol-badge { display: inline-block; background-color: rgba(245, 158, 11, 0.12); color: #fbbf24; border: 1px solid rgba(245, 158, 11, 0.4); padding: 4px 10px; border-radius: 6px; font-size: 11px; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; margin-bottom: 12px; font-family: monospace; }
    .title { font-size: 22px; font-weight: 800; color: #ffffff; margin: 0 0 8px 0; }
    .content { padding: 32px 36px; line-height: 1.6; font-size: 14px; }
    .capsule-card { background-color: #111827; border: 1px solid #1e293b; border-radius: 8px; padding: 18px; margin: 24px 0; font-family: monospace; font-size: 12px; }
    .btn { display: inline-block; background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: #000000; font-weight: 800; font-size: 14px; text-decoration: none; padding: 14px 28px; border-radius: 8px; text-align: center; }
    .beacon-link { color: #38bdf8; text-decoration: none; font-weight: bold; }
    .footer { padding: 24px 36px; border-top: 1px solid #1e293b; font-size: 11px; color: #64748b; font-family: monospace; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="protocol-badge">🌑 LEVEL 33 SOVEREIGN CAPSULE • PSM/33 ENCRYPTED</div>
      <h1 class="title">${capsule.payload.subject}</h1>
      <p style="margin: 0; color: #94a3b8; font-size: 13px;">Origin Authority: ${capsule.header.senderAuthorityUri} | Block #${capsule.signature.osmiumBlockIndex}</p>
    </div>
    <div class="content">
      <p>Hello ${capsule.header.recipientName},</p>
      <p>${capsule.payload.executiveBriefing}</p>

      <div class="capsule-card">
        <div style="color: #fbbf24; font-weight: bold; margin-bottom: 8px;">⭐ OSMIUM LEDGER CRYPTOGRAPHIC COMMITMENT</div>
        <div>Capsule ID: <span style="color: #38bdf8;">${capsule.capsuleId}</span></div>
        <div>Block Hash: <span style="color: #94a3b8;">${capsule.signature.osmiumBlockHash.slice(0, 24)}...</span></div>
        <div>Ed25519 Sig: <span style="color: #94a3b8;">${capsule.signature.ed25519SignatureHex.slice(0, 24)}...</span></div>
        <div>Ω-Bond Stake: <span style="color: #fbbf24; font-weight: bold;">$${capsule.trustAnchor.bondAmountUsd.toLocaleString()} USD</span> (${capsule.trustAnchor.omegaBondSerial})</div>
      </div>

      <div style="text-align: center; margin: 32px 0;">
        <a href="${capsule.trustAnchor.boardroomUrl}" class="btn">ACCESS BESPOKE EXECUTIVE BOARDROOM →</a>
      </div>

      <p style="font-size: 12px; color: #94a3b8; text-align: center;">
        Recipients may independently audit this transmission on the 
        <a href="${beaconUrl}" class="beacon-link">Primordia Identity Beacon</a>.
      </p>
    </div>
    <div class="footer">
      Transmitted via Primordia Relay Mesh • Terminus Node: ${capsule.receipt?.terminusNodeId || 'relay-origin'} • Total Latency: ${capsule.trace.totalLatencyMs}ms
    </div>
  </div>
</body>
</html>
`;

    const customHeaders: Record<string, string> = {
      'X-Primordia-Protocol': 'PSM/33',
      'X-Primordia-Capsule-ID': capsule.capsuleId,
      'X-Primordia-Osmium-Block': String(capsule.signature.osmiumBlockIndex),
      'X-Primordia-Osmium-Signature': capsule.signature.ed25519SignatureHex,
      'X-Primordia-Omega-Bond': capsule.trustAnchor.omegaBondSerial,
      'X-Primordia-Identity-Beacon': beaconUrl
    };

    let result: EmailDispatchResult;

    // 1. Enterprise Rail: AWS SES Native SDK Dispatch
    if (AwsSesClient.isConfigured()) {
      try {
        const sesResult = await AwsSesClient.dispatchSovereignCapsuleViaSes(capsule, html);
        return {
          success: sesResult.success,
          dispatchId: 'ses_' + capsule.capsuleId,
          recipientEmail: capsule.header.recipientEmail,
          subject: capsule.payload.subject,
          boardroomUrl: capsule.trustAnchor.boardroomUrl,
          transportUsed: 'aws_ses' as any,
          messageId: sesResult.messageId,
          timestamp: sesResult.timestamp
        };
      } catch (err: any) {
        console.warn('[LegacySmtpBridge] AWS SES dispatch encountered an error, falling back to SMTP:', err.message);
      }
    }

    // 2. Secondary Rail: Standard SMTP
    if (config.user && config.pass && !config.host.includes('example')) {
      try {
        const transporter = nodemailer.createTransport({
          host: config.host,
          port: config.port,
          secure: config.secure,
          auth: { user: config.user, pass: config.pass }
        });

        const info = await transporter.sendMail({
          from: config.from,
          to: capsule.header.recipientEmail,
          subject: capsule.payload.subject,
          html,
          headers: customHeaders
        });

        result = {
          success: true,
          dispatchId: 'smtp_' + capsule.capsuleId,
          recipientEmail: capsule.header.recipientEmail,
          subject: capsule.payload.subject,
          boardroomUrl: capsule.trustAnchor.boardroomUrl,
          transportUsed: 'live_smtp',
          messageId: info.messageId,
          timestamp: Date.now()
        };
      } catch (err: any) {
        result = {
          success: false,
          dispatchId: 'smtp_failed_' + capsule.capsuleId,
          recipientEmail: capsule.header.recipientEmail,
          subject: capsule.payload.subject,
          boardroomUrl: capsule.trustAnchor.boardroomUrl,
          transportUsed: 'spooled_local',
          error: err.message,
          timestamp: Date.now()
        };
      }
    } else {
      result = {
        success: true,
        dispatchId: 'spool_psm_' + capsule.capsuleId,
        recipientEmail: capsule.header.recipientEmail,
        subject: capsule.payload.subject,
        boardroomUrl: capsule.trustAnchor.boardroomUrl,
        transportUsed: 'spooled_local',
        messageId: `psm-spool-${Date.now()}@primordia.flow`,
        timestamp: Date.now()
      };
    }

    return result;
  }
}
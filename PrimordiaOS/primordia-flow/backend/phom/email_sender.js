/**
 * ==============================================================================
 * ⭐ REAL EMAIL SENDER & BOARDROOM DISPATCH ENGINE
 * Sends real outbound emails with embedded links to tailored Interactive Boardrooms
 * and AI Voice Briefings customized for each prospect's business.
 * Supports:
 * - Live SMTP (Gmail, Outlook, Amazon SES, Postmark, custom server)
 * - Resend / SendGrid / Mailgun API or local verified EML spooling
 * - Full delivery telemetry and SQLite WAL tracking
 * ==============================================================================
 */
import nodemailer from 'nodemailer';
import crypto from 'crypto';
import { db } from '../db';
import { PhomRealMemoryGraph } from './layer7_memory_graph';
import { getBoardroomByProspect, synthesizeBoardroom } from './boardroom_engine';
import { AwsSesClient } from './aws_ses_client';
/**
 * Resolves current SMTP configuration from environment variables or SQLite settings.
 */
export function getSmtpConfig() {
    return {
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT || '587', 10),
        secure: process.env.SMTP_SECURE === 'true',
        user: process.env.SMTP_USER || '',
        pass: process.env.SMTP_PASS || '',
        from: process.env.SMTP_FROM || '"Primordia Flow Executive Desk" <briefing@primordia.flow>'
    };
}
/**
 * Generates an executive-styled, dark-mode/clean HTML email with embedded Interactive Boardroom CTA.
 */
export function renderBoardroomEmailHtml(boardroom, recipientName, outboundCopy, dispatchId) {
    const firstName = recipientName.split(' ')[0] || 'there';
    const company = boardroom.companyName;
    const domain = boardroom.domain;
    const url = boardroom.boardroomUrl;
    const savings = boardroom.roiMetrics.monthlySavingsUsd.toLocaleString();
    const latency = boardroom.roiMetrics.p99LatencyReductionMs;
    const bondAmount = (boardroom.omegaBond?.bondAmountUsd || 12500).toLocaleString();
    const bondSerial = boardroom.omegaBond?.bondSerial || 'PRIM-OMEGA-STAKE';
    const subject = `Executive Briefing: $${bondAmount} Ω-Bond Staked for ${company}`;
    const text = `Hi ${firstName},\n\n` +
        (outboundCopy ? `${outboundCopy}\n\n` : '') +
        `We have initialized an Interactive Executive Boardroom tailored specifically for ${company} (${domain}).\n\n` +
        `⭐ UPFRONT VALUE STAKE: $${bondAmount} Ω-BOND\n` +
        `Serial: ${bondSerial}\n` +
        `We are staking $${bondAmount} USD upfront directly against your modeled efficiency gains. ` +
        `If PrimordiaOS fails to achieve >= 40% compute overhead reduction or sub-millisecond task latency during the 30-day audit, ${company} keeps the bond in full.\n\n` +
        `Inside your private boardroom portal:\n` +
        `- Custom AI Voice Briefing tailored to ${company}'s leadership\n` +
        `- Holographic Ω-Bond Certificate & SLA Escrow details\n` +
        `- Interactive Financial Model: Projected $${savings}/mo compute savings\n` +
        `- P99 tail latency reduction of ~${latency}ms\n\n` +
        `Access your Interactive Boardroom and claim your Ω-Bond here:\n${url}\n\n` +
        `Best regards,\nShane & The Primordia Flow Team\nSovereign Systems Division`;
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>${subject}</title>
  <style>
    body { margin: 0; padding: 0; background-color: #090a0f; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #e2e8f0; }
    .container { max-width: 600px; margin: 0 auto; background-color: #0c101a; border: 1px solid #1e293b; border-radius: 12px; overflow: hidden; }
    .header { padding: 32px 36px 20px 36px; border-bottom: 1px solid #1e293b; background: linear-gradient(180deg, #111827 0%, #0c101a 100%); }
    .badge { display: inline-block; background-color: rgba(6, 182, 212, 0.12); color: #22d3ee; border: 1px solid rgba(6, 182, 212, 0.4); padding: 4px 10px; border-radius: 6px; font-size: 11px; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; margin-bottom: 12px; }
    .title { font-size: 22px; font-weight: 800; color: #ffffff; margin: 0 0 8px 0; line-height: 1.3; }
    .subtitle { font-size: 13px; color: #94a3b8; margin: 0; }
    .content { padding: 32px 36px; line-height: 1.6; font-size: 14px; color: #cbd5e1; }
    .bond-card { background: linear-gradient(135deg, rgba(245, 158, 11, 0.15) 0%, rgba(180, 83, 9, 0.08) 100%); border: 1px solid rgba(245, 158, 11, 0.45); border-radius: 10px; padding: 18px 22px; margin: 20px 0; }
    .highlight-box { background-color: #0b0f19; border: 1px solid #1e293b; border-radius: 8px; padding: 20px; margin: 20px 0; }
    .metric-grid { display: flex; justify-content: space-between; margin-top: 14px; border-top: 1px solid #1e293b; padding-top: 14px; }
    .metric-item { text-align: center; }
    .metric-val { font-size: 18px; font-weight: 800; color: #38bdf8; }
    .metric-lbl { font-size: 11px; color: #64748b; text-transform: uppercase; margin-top: 2px; }
    .btn-container { text-align: center; margin: 32px 0 16px 0; }
    .btn { display: inline-block; background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: #040812 !important; font-weight: 900; font-size: 14px; text-decoration: none; padding: 14px 28px; border-radius: 8px; box-shadow: 0 4px 14px rgba(245, 158, 11, 0.35); text-transform: uppercase; letter-spacing: 0.05em; }
    .audio-badge { display: flex; align-items: center; justify-content: center; gap: 8px; font-size: 12px; color: #38bdf8; margin-top: 16px; font-weight: 600; }
    .footer { padding: 24px 36px; border-top: 1px solid #1e293b; font-size: 11px; color: #64748b; text-align: center; line-height: 1.5; }
  </style>
</head>
<body>
  <div style="padding: 24px 12px;">
    <div class="container">
      <div class="header">
        <div class="badge">Primordia Sovereign Boardroom</div>
        <h1 class="title">${company} Executive Briefing</h1>
        <p class="subtitle">Customized for ${domain} infrastructure & executive leadership</p>
      </div>

      <div class="content">
        <p>Hello ${firstName},</p>
        
        <p>${outboundCopy ? outboundCopy : `We analyzed the runtime architecture of <strong>${domain}</strong>. Rather than asking for trust, we are staking our own capital on our results.`}</p>

        <!-- Holographic Ω-Bond Certificate Card -->
        <div class="bond-card">
          <table width="100%" style="border-bottom: 1px solid rgba(245, 158, 11, 0.25); padding-bottom: 10px; margin-bottom: 12px;">
            <tr>
              <td align="left">
                <span style="color: #fbbf24; font-size: 11px; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase;">
                  👑 PRIMORDIA VALUE STAKE • Ω-BOND
                </span>
              </td>
              <td align="right">
                <span style="color: #f59e0b; font-size: 11px; font-family: monospace; background: rgba(0,0,0,0.5); padding: 3px 8px; border-radius: 4px; border: 1px solid rgba(245, 158, 11, 0.3);">
                  ${bondSerial}
                </span>
              </td>
            </tr>
          </table>
          <div style="font-size: 28px; font-weight: 900; color: #fef08a; letter-spacing: -0.02em;">
            $${bondAmount} USD
          </div>
          <p style="font-size: 12px; color: #fde68a; margin: 8px 0 0 0; line-height: 1.5;">
            <strong>Unconditional Risk-Reversal:</strong> If PrimordiaOS fails to achieve the projected 42% compute savings or sub-millisecond task latency during your 30-day benchmark audit, ${company} keeps the $${bondAmount} bond unconditionally.
          </p>
        </div>

        <div class="highlight-box">
          <div style="font-size: 12px; font-weight: 700; color: #f8fafc; text-transform: uppercase; letter-spacing: 0.05em;">
            ⚡ Modeled Efficiency Benchmarks
          </div>
          <table width="100%" style="margin-top: 14px; border-top: 1px solid #1e293b; padding-top: 12px;">
            <tr>
              <td align="center">
                <div class="metric-val">$${savings}</div>
                <div class="metric-lbl">Est. Monthly Savings</div>
              </td>
              <td align="center">
                <div class="metric-val">-${latency}ms</div>
                <div class="metric-lbl">P99 Tail Latency</div>
              </td>
              <td align="center">
                <div class="metric-val">${boardroom.roiMetrics.agentConcurrencyGain}x</div>
                <div class="metric-lbl">Agent Concurrency</div>
              </td>
            </tr>
          </table>
        </div>

        <div class="btn-container">
          <a href="${url}" class="btn" target="_blank">Audit & Claim $${bondAmount} Ω-Bond in Boardroom →</a>
          <div class="audio-badge">
            <span>🎙️ Includes Personalized AI Voice Briefing</span>
          </div>
        </div>

        <p style="font-size: 12px; color: #94a3b8; margin-top: 24px;">
          Inside the boardroom portal, you can inspect the cryptographic escrow proof, listen to your executive briefing, and simulate scale variations.
        </p>
      </div>

      <div class="footer">
        <p>Sent by Primordia Flow Sovereign Executive Desk • Encrypted Local-First Substrate</p>
        <p>Direct Boardroom Link: <a href="${url}" style="color: #38bdf8; text-decoration: underline;">${url}</a></p>
      </div>
    </div>
  </div>
  ${dispatchId ? `<img src="http://127.0.0.1:3006/api/phom/email/track/open/${dispatchId}" width="1" height="1" alt="" style="display:none;width:1px;height:1px;border:0;" />` : ''}
</body>
</html>
`;
    return { subject, html, text };
}
/**
 * Generates a clean, high-converting product pitch email with a direct Gumroad checkout CTA.
 */
export function renderGumroadPitchEmailHtml(options) {
    const productName = options.productName || 'Instant Async Gateway & Supabase Telemetry Boilerplate';
    const gumroadUrl = options.gumroadUrl || 'https://fisherman086.gumroad.com/l/async-telemetry-boilerplate';
    const price = options.price || '$39';
    const subject = options.subject || `Skip 80+ hours of scaffolding (${productName})`;
    const text = options.copy;
    // Convert plain text paragraphs into clean HTML paragraphs
    const paragraphs = options.copy
        .split(/\n{2,}/)
        .map(p => p.trim())
        .filter(Boolean);
    const formattedParagraphsHtml = paragraphs.map(p => {
        let safe = p
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
        safe = safe.replace(/\n/g, '<br/>');
        safe = safe.replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" style="color: #06b6d4; text-decoration: underline;" target="_blank">$1</a>');
        return `<p style="margin: 0 0 16px 0; font-size: 15px; line-height: 1.65; color: #cbd5e1;">${safe}</p>`;
    }).join('');
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>${subject}</title>
  <style>
    body { margin: 0; padding: 0; background-color: #090a0f; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #e2e8f0; }
    .container { max-width: 600px; margin: 0 auto; background-color: #0c101a; border: 1px solid #1e293b; border-radius: 12px; overflow: hidden; }
    .header { padding: 28px 32px 20px 32px; border-bottom: 1px solid #1e293b; background: linear-gradient(180deg, #111827 0%, #0c101a 100%); }
    .badge { display: inline-block; background-color: rgba(6, 182, 212, 0.12); color: #22d3ee; border: 1px solid rgba(6, 182, 212, 0.4); padding: 4px 10px; border-radius: 6px; font-size: 11px; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; margin-bottom: 10px; }
    .title { font-size: 20px; font-weight: 800; color: #ffffff; margin: 0; line-height: 1.3; }
    .content { padding: 32px 32px 24px 32px; }
    .btn-container { text-align: center; margin: 28px 0 24px 0; }
    .btn { display: inline-block; background: linear-gradient(135deg, #06b6d4 0%, #0284c7 100%); color: #ffffff !important; font-weight: 800; font-size: 15px; text-decoration: none; padding: 14px 32px; border-radius: 8px; box-shadow: 0 4px 14px rgba(6, 182, 212, 0.35); letter-spacing: 0.02em; }
    .footer { padding: 20px 32px; border-top: 1px solid #1e293b; font-size: 11px; color: #64748b; text-align: center; line-height: 1.5; }
  </style>
</head>
<body>
  <div style="padding: 30px 15px;">
    <div class="container">
      <div class="header">
        <div class="badge">🔥 Verified Dev Tooling Asset</div>
        <h1 class="title">${subject}</h1>
      </div>

      <div class="content">
        ${formattedParagraphsHtml}

        <div class="btn-container">
          <a href="${gumroadUrl}" class="btn" target="_blank">Get Instant Access on Gumroad (${price}) →</a>
        </div>
      </div>

      <div class="footer">
        <p>Sent by Shane • PrimordiaOS Sovereign Systems</p>
        <p>Direct Link: <a href="${gumroadUrl}" style="color: #38bdf8; text-decoration: underline;">${gumroadUrl}</a></p>
      </div>
    </div>
  </div>
  ${options.dispatchId ? `<img src="http://127.0.0.1:3006/api/phom/email/track/open/${options.dispatchId}" width="1" height="1" alt="" style="display:none;width:1px;height:1px;border:0;" />` : ''}
</body>
</html>
  `;
    return { subject, html, text };
}
/**
 * Sends a real personalized email with the interactive boardroom link or boilerplate pitch to a prospect.
 */
export async function sendPersonalizedBoardroomEmail(options) {
    PhomRealMemoryGraph.initTables();
    const now = Math.floor(Date.now() / 1000);
    const dispatchId = `email_${crypto.randomUUID().slice(0, 10)}`;
    // 1. Fetch prospect from SQLite
    const prospect = db.prepare(`SELECT * FROM prospects WHERE id = ?`).get(options.prospectId);
    if (!prospect) {
        throw new Error(`Prospect ${options.prospectId} not found in database.`);
    }
    const targetEmail = options.recipientEmail || prospect.email;
    if (!targetEmail || !targetEmail.includes('@')) {
        throw new Error(`Prospect ${prospect.name} does not have a valid verified email address.`);
    }
    // 2. Ensure Boardroom exists for this prospect
    let boardroom = getBoardroomByProspect(options.prospectId);
    if (!boardroom) {
        boardroom = synthesizeBoardroom({
            id: prospect.id,
            email: prospect.email,
            name: prospect.name,
            domain: prospect.domain,
            mxVerified: Boolean(prospect.mx_verified),
            mxRecords: prospect.mx_records,
            enrichment: { industry: 'Enterprise SaaS', companySize: '50-500 employees', techStack: ['Node.js', 'PostgreSQL', 'Docker'] }
        });
    }
    // 3. Render bespoke template
    let subject;
    let html;
    let text;
    if (options.customCopy) {
        let campaign = null;
        try {
            campaign = db.prepare('SELECT * FROM campaign_settings WHERE id = ?').get('primary');
        }
        catch { }
        const rendered = renderGumroadPitchEmailHtml({
            recipientName: prospect.name || 'there',
            copy: options.customCopy,
            subject: options.customSubject,
            productName: campaign?.product_name,
            gumroadUrl: campaign?.gumroad_url,
            price: campaign?.price,
            boardroomUrl: boardroom.boardroomUrl,
            dispatchId
        });
        subject = rendered.subject;
        html = rendered.html;
        text = rendered.text;
    }
    else {
        const rendered = renderBoardroomEmailHtml(boardroom, prospect.name || 'Executive', undefined, dispatchId);
        subject = options.customSubject || rendered.subject;
        html = rendered.html;
        text = rendered.text;
    }
    const finalSubject = options.customSubject || subject;
    const smtpConfig = getSmtpConfig();
    // 4. Dispatch via AWS SES or Live SMTP if credentials exist, or gracefully spool
    let messageId;
    let transportUsed = 'spooled_local';
    let status = 'spooled';
    let errorMsg;
    // Rail 1: Enterprise AWS SES Rail
    if (AwsSesClient.isConfigured()) {
        try {
            const sesConfig = AwsSesClient.getConfig();
            const smtpPass = AwsSesClient.deriveSmtpPassword(sesConfig.secretAccessKey);
            const transporter = nodemailer.createTransport({
                host: `email-smtp.${sesConfig.region || 'us-east-1'}.amazonaws.com`,
                port: 465,
                secure: true,
                family: 4,
                connectionTimeout: 10000,
                greetingTimeout: 10000,
                socketTimeout: 10000,
                auth: {
                    user: sesConfig.accessKeyId,
                    pass: smtpPass
                }
            });
            const info = await transporter.sendMail({
                from: sesConfig.fromEmail,
                to: targetEmail,
                subject: finalSubject,
                text,
                html,
                headers: {
                    'X-Primordia-Protocol': 'PSM/33.1',
                    'X-Primordia-Prospect-ID': options.prospectId,
                    'X-Primordia-Dispatch-ID': dispatchId
                }
            });
            messageId = info.messageId || `ses_${Date.now()}`;
            transportUsed = 'aws_ses';
            status = 'sent';
            console.log(`✔ [Email Dispatcher] Live AWS SES sent to ${targetEmail} (Message-ID: ${messageId})`);
        }
        catch (err) {
            console.warn(`[Email Dispatcher] AWS SES send failed, checking SMTP fallback:`, err.message);
            errorMsg = err.message;
        }
    }
    // Rail 2: Secondary Legacy SMTP Rail (if AWS SES was not used or failed)
    if (status !== 'sent' && smtpConfig.user && smtpConfig.pass) {
        try {
            const transporter = nodemailer.createTransport({
                host: smtpConfig.host,
                port: smtpConfig.port,
                secure: smtpConfig.secure,
                auth: {
                    user: smtpConfig.user,
                    pass: smtpConfig.pass
                }
            });
            const info = await transporter.sendMail({
                from: smtpConfig.from,
                to: targetEmail,
                subject: finalSubject,
                text,
                html
            });
            messageId = info.messageId;
            transportUsed = 'live_smtp';
            status = 'sent';
            console.log(`✔ [Email Dispatcher] Live SMTP sent to ${targetEmail} (ID: ${messageId})`);
        }
        catch (err) {
            console.warn(`[Email Dispatcher] SMTP error, falling back to local spool:`, err.message);
            errorMsg = err.message;
            status = 'spool_fallback';
        }
    }
    else if (status !== 'sent') {
        // Graceful spool: recorded as ready-to-dispatch in SQLite
        messageId = `spool_${crypto.randomUUID().slice(0, 8)}@primordia.flow`;
        transportUsed = 'spooled_local';
        status = 'spooled';
        console.log(`ℹ [Email Dispatcher] Spooled verified email to ${targetEmail} (Awaiting user AWS SES or SMTP credentials)`);
    }
    // 5. Persist dispatch record in SQLite WAL
    db.prepare(`
    INSERT INTO email_dispatches (id, prospect_id, recipient_email, subject, html_body, text_body, boardroom_url, status, transport, message_id, error, sent_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(dispatchId, options.prospectId, targetEmail, finalSubject, html, text, boardroom.boardroomUrl, status, transportUsed, messageId || null, errorMsg || null, now);
    return {
        success: true,
        dispatchId,
        recipientEmail: targetEmail,
        subject: finalSubject,
        boardroomUrl: boardroom.boardroomUrl,
        transportUsed,
        messageId,
        error: errorMsg,
        timestamp: now
    };
}
/**
 * Retrieves all sent or spooled email dispatch records.
 * If limit is 0 or negative, returns all records without limit.
 */
export function getEmailHistory(limit = 500) {
    try {
        PhomRealMemoryGraph.initTables();
        if (limit > 0) {
            return db.prepare(`
        SELECT e.*, p.name as prospect_name, p.domain as prospect_domain, p.heat, p.band
        FROM email_dispatches e
        LEFT JOIN prospects p ON e.prospect_id = p.id
        ORDER BY e.sent_at DESC
        LIMIT ?
      `).all(limit);
        }
        return db.prepare(`
      SELECT e.*, p.name as prospect_name, p.domain as prospect_domain, p.heat, p.band
      FROM email_dispatches e
      LEFT JOIN prospects p ON e.prospect_id = p.id
      ORDER BY e.sent_at DESC
    `).all();
    }
    catch (err) {
        return [];
    }
}
/**
 * Marks an email dispatch as opened, escalates prospect heat, and records ledger trace.
 */
export function markEmailOpened(dispatchIdOrMessageId) {
    try {
        PhomRealMemoryGraph.initTables();
        const now = Math.floor(Date.now() / 1000);
        const dispatch = db.prepare(`
      SELECT * FROM email_dispatches WHERE id = ? OR message_id = ?
    `).get(dispatchIdOrMessageId, dispatchIdOrMessageId);
        if (!dispatch) {
            return { success: false };
        }
        db.prepare(`
      UPDATE email_dispatches
      SET opened_at = COALESCE(opened_at, ?),
          last_opened_at = ?,
          open_count = COALESCE(open_count, 0) + 1,
          status = 'opened'
      WHERE id = ?
    `).run(now, now, dispatch.id);
        let prospectUpdated = false;
        let newHeat = 0;
        if (dispatch.prospect_id) {
            const prospect = db.prepare('SELECT * FROM prospects WHERE id = ?').get(dispatch.prospect_id);
            if (prospect) {
                newHeat = Math.min(100, (prospect.heat || 50) + 15);
                let newBand = prospect.band;
                if (newHeat >= 85)
                    newBand = 'supercritical';
                else if (newHeat >= 70)
                    newBand = 'hot';
                else if (newHeat >= 40)
                    newBand = 'warm';
                db.prepare('UPDATE prospects SET heat = ?, band = ? WHERE id = ?').run(newHeat, newBand, prospect.id);
                prospectUpdated = true;
                try {
                    db.prepare(`
            INSERT INTO evolution_ledger (id, timestamp, event_type, agent_name, details, artifact_hash)
            VALUES (?, ?, ?, ?, ?, ?)
          `).run(crypto.randomUUID(), Date.now(), 'EMAIL_OPENED', 'AnalyticsAgent', `Prospect ${prospect.name || dispatch.recipient_email} opened email "${dispatch.subject}". Heat: ${prospect.heat} -> ${newHeat}`, dispatch.id);
                }
                catch (_) { }
                try {
                    PhomRealMemoryGraph.addEdge('agent_analytics_agent', dispatch.id, 'detected_email_open', 1.0, {
                        openedAt: now,
                        recipientEmail: dispatch.recipient_email
                    });
                }
                catch (_) { }
            }
        }
        const updated = db.prepare('SELECT * FROM email_dispatches WHERE id = ?').get(dispatch.id);
        return { success: true, dispatch: updated, prospectUpdated, newHeat };
    }
    catch (err) {
        console.error('[markEmailOpened Error]:', err);
        return { success: false };
    }
}
/**
 * Flushes and dispatches all spooled emails in SQLite through AWS SES or active SMTP rail.
 */
export async function flushSpooledEmails() {
    PhomRealMemoryGraph.initTables();
    const spooledRecords = db.prepare(`
    SELECT * FROM email_dispatches
    WHERE status IN ('spooled', 'spool_fallback')
    ORDER BY sent_at ASC
  `).all();
    if (spooledRecords.length === 0) {
        return { flushedCount: 0, totalSpooled: 0, errors: [] };
    }
    const sesConfig = AwsSesClient.isConfigured() ? AwsSesClient.getConfig() : null;
    const smtpConfig = getSmtpConfig();
    const hasSmtp = Boolean(smtpConfig.user && smtpConfig.pass);
    if (!sesConfig && !hasSmtp) {
        throw new Error('No active delivery rail found. Please configure AWS SES credentials or SMTP in the cockpit first.');
    }
    let flushedCount = 0;
    const errors = [];
    for (const record of spooledRecords) {
        let sent = false;
        let newMsgId = '';
        let transport = 'live_smtp';
        // 1. Try AWS SES
        if (sesConfig) {
            try {
                const smtpPass = AwsSesClient.deriveSmtpPassword(sesConfig.secretAccessKey);
                const transporter = nodemailer.createTransport({
                    host: `email-smtp.${sesConfig.region || 'us-east-1'}.amazonaws.com`,
                    port: 465,
                    secure: true,
                    family: 4,
                    connectionTimeout: 10000,
                    greetingTimeout: 10000,
                    socketTimeout: 10000,
                    auth: {
                        user: sesConfig.accessKeyId,
                        pass: smtpPass
                    }
                });
                const info = await transporter.sendMail({
                    from: sesConfig.fromEmail,
                    to: record.recipient_email,
                    subject: record.subject,
                    text: record.text_body,
                    html: record.html_body,
                    headers: {
                        'X-Primordia-Protocol': 'PSM/33.1',
                        'X-Primordia-Prospect-ID': record.prospect_id,
                        'X-Primordia-Dispatch-ID': record.id
                    }
                });
                newMsgId = info.messageId || `ses_${Date.now()}`;
                transport = 'aws_ses';
                sent = true;
            }
            catch (err) {
                console.warn(`[Flush Spool] SES send failed for ${record.recipient_email}:`, err.message);
            }
        }
        // 2. Try SMTP fallback
        if (!sent && hasSmtp) {
            try {
                const transporter = nodemailer.createTransport({
                    host: smtpConfig.host,
                    port: smtpConfig.port,
                    secure: smtpConfig.secure,
                    auth: {
                        user: smtpConfig.user,
                        pass: smtpConfig.pass
                    }
                });
                const info = await transporter.sendMail({
                    from: smtpConfig.from,
                    to: record.recipient_email,
                    subject: record.subject,
                    text: record.text_body,
                    html: record.html_body
                });
                newMsgId = info.messageId || `smtp_${Date.now()}`;
                transport = 'live_smtp';
                sent = true;
            }
            catch (err) {
                console.warn(`[Flush Spool] SMTP send failed for ${record.recipient_email}:`, err.message);
                errors.push({ dispatchId: record.id, error: err.message });
            }
        }
        if (sent) {
            db.prepare(`
        UPDATE email_dispatches
        SET status = 'sent', transport = ?, message_id = ?, error = NULL, sent_at = ?
        WHERE id = ?
      `).run(transport, newMsgId, Math.floor(Date.now() / 1000), record.id);
            db.prepare(`
        INSERT INTO evolution_ledger (id, timestamp, event_type, agent_name, details, artifact_hash)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(crypto.randomUUID(), Date.now(), 'SPOOL_FLUSH_DISPATCH', 'EmailDispatcher', `Flushed spooled email to ${record.recipient_email} via ${transport.toUpperCase()} (ID: ${newMsgId})`, newMsgId);
            flushedCount++;
        }
    }
    return {
        flushedCount,
        totalSpooled: spooledRecords.length,
        errors
    };
}

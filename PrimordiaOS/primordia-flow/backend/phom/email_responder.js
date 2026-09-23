import crypto from 'node:crypto';
import nodemailer from 'nodemailer';
import { db } from '../db';
import { PhomRealMemoryGraph } from './layer7_memory_graph';
import { AwsSesClient } from './aws_ses_client';
import { getSmtpConfig } from './email_sender';
/**
 * Classifies the intent and sentiment of an inbound email response.
 */
export function classifyIntentAndSentiment(text, subject = '') {
    const combined = `${subject} ${text}`.toLowerCase();
    // Negative / Unsubscribe
    if (combined.includes('unsubscribe') ||
        combined.includes('remove me') ||
        combined.includes('take me off') ||
        combined.includes('stop emailing') ||
        combined.includes('not interested') ||
        combined.includes('spam') ||
        combined.includes('do not contact')) {
        return {
            intent: 'not_interested',
            sentiment: 'negative',
            sentimentScore: 0.1
        };
    }
    // Scheduling / Meeting request
    if (combined.includes('call') ||
        combined.includes('zoom') ||
        combined.includes('meet') ||
        combined.includes('calendar') ||
        combined.includes('schedule') ||
        combined.includes('tomorrow') ||
        combined.includes('time slot') ||
        combined.includes('chat') ||
        combined.includes('sync') ||
        combined.includes('15 min') ||
        combined.includes('30 min') ||
        combined.includes('available')) {
        return {
            intent: 'scheduling',
            sentiment: 'positive',
            sentimentScore: 0.95
        };
    }
    // High Interest
    if (combined.includes('interested') ||
        combined.includes('sounds good') ||
        combined.includes('tell me more') ||
        combined.includes('send over') ||
        combined.includes('let\'s do it') ||
        combined.includes('demo') ||
        combined.includes('try it') ||
        combined.includes('details') ||
        combined.includes('love to') ||
        combined.includes('count me in') ||
        combined.includes('looks cool') ||
        combined.includes('looks great')) {
        return {
            intent: 'interested',
            sentiment: 'positive',
            sentimentScore: 0.9
        };
    }
    // Pricing Inquiry
    if (combined.includes('price') ||
        combined.includes('pricing') ||
        combined.includes('cost') ||
        combined.includes('how much') ||
        combined.includes('rate') ||
        combined.includes('tier') ||
        combined.includes('license') ||
        combined.includes('budget') ||
        combined.includes('discount') ||
        combined.includes('expensive')) {
        return {
            intent: 'pricing',
            sentiment: 'positive',
            sentimentScore: 0.75
        };
    }
    // Question / Technical Query
    if (combined.includes('how does') ||
        combined.includes('what about') ||
        combined.includes('can you') ||
        combined.includes('is it possible') ||
        combined.includes('does it') ||
        combined.includes('integrate') ||
        combined.includes('support') ||
        combined.includes('stack') ||
        combined.includes('documentation') ||
        combined.includes('docs')) {
        return {
            intent: 'question',
            sentiment: 'neutral',
            sentimentScore: 0.65
        };
    }
    // Objection
    if (combined.includes('already have') ||
        combined.includes('already using') ||
        combined.includes('competitor') ||
        combined.includes('no need') ||
        combined.includes('too late') ||
        combined.includes('contract')) {
        return {
            intent: 'objection',
            sentiment: 'neutral',
            sentimentScore: 0.4
        };
    }
    return {
        intent: 'other',
        sentiment: 'neutral',
        sentimentScore: 0.5
    };
}
/**
 * Generates an executive, personalized suggested reply based on intent and prospect info.
 */
export function generateSuggestedReply(options) {
    const name = options.fromName ? options.fromName.split(' ')[0] : 'there';
    const cleanSubject = options.subject.replace(/^(re:\s*)+/i, '').trim();
    switch (options.intent) {
        case 'scheduling':
            return `Hi ${name},\n\nThanks for following up! I'd be happy to walk you through the architecture and how the async telemetry pipeline eliminates queue overhead.\n\nWould tomorrow at 2:00 PM EST or Thursday morning work best for a quick 15-minute screen share?\n\nAlternatively, you can grab any open slot on my calendar here:\nhttps://calendly.com/primordia-flow/15min\n\nLooking forward to connecting,\nShane`;
        case 'interested':
            return `Hi ${name},\n\nGreat to hear from you! You can review the interactive boardroom model and claim the upfront Ω-Bond stake here:\n${options.boardroomUrl || 'http://localhost:5174/?tab=boardroom'}\n\nIf you prefer to grab the starter kit directly, you can check out the source code and Make.com blueprints on Gumroad:\nhttps://fisherman086.gumroad.com/l/async-telemetry-boilerplate\n\nLet me know if you have any questions or want to test a tailored sandbox!\n\nBest,\nShane`;
        case 'pricing':
            return `Hi ${name},\n\nThanks for reaching out about pricing! The boilerplate starter pack is a flat $39 one-time purchase with lifetime updates and no subscription: https://fisherman086.gumroad.com/l/async-telemetry-boilerplate.\n\nFor enterprise sovereign deployments and custom telemetry pipelines, our performance SLA bonds start at $5,000 USD with a guaranteed 40%+ compute reduction.\n\nDoes the starter kit fit your immediate project scope, or are you exploring an enterprise deployment?\n\nBest regards,\nShane`;
        case 'question':
            return `Hi ${name},\n\nGood question! Primordia Flow operates on a local-first SQLite WAL substrate with sub-50ms HTTP 200 handshakes, allowing you to bypass Redis, Celery, and SQS maintenance entirely.\n\nI can send over a 2-minute architectural demo or sample client SDKs (Python, Node.js, PowerShell) if that would be helpful for your team.\n\nBest,\nShane`;
        case 'not_interested':
            return `Hi ${name},\n\nUnderstood completely! I've removed your email address from our outreach list so you won't hear from us again.\n\nWishing you all the best with your projects!\n\nShane`;
        default:
            return `Hi ${name},\n\nThank you for getting back to me regarding "${cleanSubject}".\n\nI'd love to learn more about your current infrastructure bottlenecks and see how we can assist. Let me know the best time to connect this week!\n\nBest regards,\nShane`;
    }
}
/**
 * Ingests an inbound response, matches prospect & dispatch, calculates heat,
 * and records to SQLite + Ledger + Memory Graph.
 */
export function recordInboundResponse(params) {
    try {
        PhomRealMemoryGraph.initTables();
        const now = Math.floor(Date.now() / 1000);
        const id = `resp_${crypto.randomUUID().slice(0, 12)}`;
        // 1. Resolve Dispatch & Prospect
        let dispatchId = params.dispatchId || null;
        let prospectId = null;
        let boardroomUrl;
        if (dispatchId) {
            const dispatch = db.prepare('SELECT * FROM email_dispatches WHERE id = ?').get(dispatchId);
            if (dispatch) {
                prospectId = dispatch.prospect_id;
                boardroomUrl = dispatch.boardroom_url;
            }
        }
        // Try finding dispatch by recipient email
        if (!dispatchId) {
            const latestDispatch = db.prepare(`
        SELECT * FROM email_dispatches
        WHERE LOWER(recipient_email) = LOWER(?)
        ORDER BY sent_at DESC LIMIT 1
      `).get(params.fromEmail);
            if (latestDispatch) {
                dispatchId = latestDispatch.id;
                prospectId = latestDispatch.prospect_id;
                boardroomUrl = latestDispatch.boardroom_url;
            }
        }
        // Try finding prospect directly
        let prospect = null;
        if (prospectId) {
            prospect = db.prepare('SELECT * FROM prospects WHERE id = ?').get(prospectId);
        }
        else {
            prospect = db.prepare('SELECT * FROM prospects WHERE LOWER(email) = LOWER(?)').get(params.fromEmail);
            if (prospect) {
                prospectId = prospect.id;
            }
        }
        // 2. Classify Intent & Sentiment
        const classification = classifyIntentAndSentiment(params.bodyText, params.subject);
        // 3. Generate Suggested Reply
        const suggestedReply = generateSuggestedReply({
            intent: classification.intent,
            fromName: params.fromName || prospect?.name,
            fromEmail: params.fromEmail,
            subject: params.subject,
            bodyText: params.bodyText,
            boardroomUrl
        });
        // 4. Update Prospect Heat & Band
        let heatDelta = 0;
        let newHeat = prospect?.heat || 50;
        if (classification.intent === 'scheduling' || classification.intent === 'interested') {
            heatDelta = 30;
            newHeat = Math.min(100, (prospect?.heat || 50) + heatDelta);
        }
        else if (classification.intent === 'pricing' || classification.intent === 'question') {
            heatDelta = 15;
            newHeat = Math.min(100, (prospect?.heat || 50) + heatDelta);
        }
        else if (classification.intent === 'not_interested') {
            heatDelta = -30;
            newHeat = Math.max(10, (prospect?.heat || 50) + heatDelta);
        }
        let newBand = 'warm';
        if (newHeat >= 85)
            newBand = 'supercritical';
        else if (newHeat >= 70)
            newBand = 'hot';
        else if (newHeat >= 40)
            newBand = 'warm';
        else
            newBand = 'cold';
        if (prospectId) {
            db.prepare('UPDATE prospects SET heat = ?, band = ? WHERE id = ?').run(newHeat, newBand, prospectId);
        }
        // 5. Store Inbound Response Record
        db.prepare(`
      INSERT INTO email_responses (
        id, dispatch_id, prospect_id, from_email, from_name, to_email,
        subject, body_text, body_html, intent, sentiment, sentiment_score,
        suggested_reply, status, received_at, message_id, raw_payload_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'unread', ?, ?, ?)
    `).run(id, dispatchId, prospectId, params.fromEmail, params.fromName || (prospect?.name || null), params.toEmail || 'shane@primordia.app', params.subject, params.bodyText, params.bodyHtml || null, classification.intent, classification.sentiment, classification.sentimentScore, suggestedReply, now, params.messageId || null, params.rawPayload ? JSON.stringify(params.rawPayload) : null);
        // 6. Record Evolution Ledger
        try {
            db.prepare(`
        INSERT INTO evolution_ledger (id, timestamp, event_type, agent_name, details, artifact_hash)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(crypto.randomUUID(), Date.now(), 'EMAIL_REPLY_RECEIVED', 'DealCloserAgent', `Inbound response from ${params.fromEmail} (${classification.intent.toUpperCase()}). Heat: ${prospect?.heat || 50} -> ${newHeat}`, id);
        }
        catch (_) { }
        // 7. Graph Edge
        if (prospectId) {
            try {
                PhomRealMemoryGraph.addEdge(prospectId, id, 'replied_to_outreach', classification.sentimentScore, {
                    intent: classification.intent,
                    sentiment: classification.sentiment,
                    receivedAt: now
                });
            }
            catch (_) { }
        }
        const savedResponse = db.prepare(`
      SELECT r.*, p.name as prospect_name, p.domain as prospect_domain, p.heat, p.band
      FROM email_responses r
      LEFT JOIN prospects p ON r.prospect_id = p.id
      WHERE r.id = ?
    `).get(id);
        return {
            success: true,
            responseId: id,
            response: savedResponse,
            prospect,
            heatDelta,
            newHeat
        };
    }
    catch (err) {
        console.error('[recordInboundResponse Error]:', err);
        return { success: false, error: err.message };
    }
}
/**
 * Retrieves all stored inbound email responses with prospect metadata.
 */
export function getEmailResponses(options = {}) {
    try {
        PhomRealMemoryGraph.initTables();
        const limit = options.limit || 500;
        if (options.status && options.status !== 'all') {
            return db.prepare(`
        SELECT r.*, p.name as prospect_name, p.domain as prospect_domain, p.heat as prospect_heat, p.band as prospect_band
        FROM email_responses r
        LEFT JOIN prospects p ON r.prospect_id = p.id
        WHERE r.status = ?
        ORDER BY r.received_at DESC
        LIMIT ?
      `).all(options.status, limit);
        }
        return db.prepare(`
      SELECT r.*, p.name as prospect_name, p.domain as prospect_domain, p.heat as prospect_heat, p.band as prospect_band
      FROM email_responses r
      LEFT JOIN prospects p ON r.prospect_id = p.id
      ORDER BY r.received_at DESC
      LIMIT ?
    `).all(limit);
    }
    catch (err) {
        console.error('[getEmailResponses Error]:', err);
        return [];
    }
}
/**
 * Updates status of an email response (e.g. 'read', 'replied', 'archived').
 */
export function updateResponseStatus(responseId, status) {
    try {
        db.prepare('UPDATE email_responses SET status = ? WHERE id = ?').run(status, responseId);
        return true;
    }
    catch (err) {
        return false;
    }
}
/**
 * Sends a real reply email back to the prospect, updating status to 'replied'.
 */
export async function sendResponseReply(options) {
    try {
        const resp = db.prepare('SELECT * FROM email_responses WHERE id = ?').get(options.responseId);
        if (!resp) {
            throw new Error('Response record not found');
        }
        const targetEmail = resp.from_email;
        const finalSubject = options.customSubject || (resp.subject.startsWith('Re:') ? resp.subject : `Re: ${resp.subject}`);
        const sesConfig = AwsSesClient.isConfigured() ? AwsSesClient.getConfig() : null;
        const smtpConfig = getSmtpConfig();
        const hasSmtp = Boolean(smtpConfig.user && smtpConfig.pass);
        let sent = false;
        let transportUsed = 'aws_ses';
        let messageId = '';
        const now = Math.floor(Date.now() / 1000);
        const dispatchId = `email_reply_${crypto.randomUUID().slice(0, 10)}`;
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
                    to: targetEmail,
                    subject: finalSubject,
                    text: options.replyBody,
                    inReplyTo: resp.message_id || undefined,
                    references: resp.message_id ? [resp.message_id] : undefined
                });
                messageId = info.messageId;
                transportUsed = 'aws_ses';
                sent = true;
            }
            catch (err) {
                console.warn('[sendResponseReply] SES failed:', err.message);
            }
        }
        if (!sent && hasSmtp) {
            try {
                const transporter = nodemailer.createTransport({
                    host: smtpConfig.host,
                    port: smtpConfig.port,
                    secure: smtpConfig.secure,
                    auth: { user: smtpConfig.user, pass: smtpConfig.pass }
                });
                const info = await transporter.sendMail({
                    from: smtpConfig.from,
                    to: targetEmail,
                    subject: finalSubject,
                    text: options.replyBody,
                    inReplyTo: resp.message_id || undefined,
                    references: resp.message_id ? [resp.message_id] : undefined
                });
                messageId = info.messageId || `smtp_${Date.now()}`;
                transportUsed = 'live_smtp';
                sent = true;
            }
            catch (err) {
                console.warn('[sendResponseReply] SMTP failed:', err.message);
            }
        }
        if (!sent) {
            transportUsed = 'spooled';
            messageId = `spool_${Date.now()}`;
        }
        // Save reply dispatch to email_dispatches
        db.prepare(`
      INSERT INTO email_dispatches (
        id, prospect_id, recipient_email, subject, html_body, text_body,
        boardroom_url, status, transport, message_id, sent_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(dispatchId, resp.prospect_id || 'prospect_inbound', targetEmail, finalSubject, `<p>${options.replyBody.replace(/\n/g, '<br/>')}</p>`, options.replyBody, '', sent ? 'sent' : 'spooled', transportUsed, messageId, now);
        // Mark inbound response as replied
        db.prepare('UPDATE email_responses SET status = ? WHERE id = ?').run('replied', options.responseId);
        // Ledger trace
        db.prepare(`
      INSERT INTO evolution_ledger (id, timestamp, event_type, agent_name, details, artifact_hash)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(crypto.randomUUID(), Date.now(), 'EMAIL_REPLY_SENT', 'DealCloserAgent', `Sent reply to ${targetEmail} for response ${options.responseId} via ${transportUsed.toUpperCase()}`, dispatchId);
        return {
            success: true,
            dispatchId,
            messageId
        };
    }
    catch (err) {
        return { success: false, error: err.message };
    }
}

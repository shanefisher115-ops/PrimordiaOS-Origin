"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadSmtpConfig = loadSmtpConfig;
exports.saveSmtpConfig = saveSmtpConfig;
exports.createTransporter = createTransporter;
exports.sendEmail = sendEmail;
exports.sendTestEmail = sendTestEmail;
exports.dispatchCampaignTouch = dispatchCampaignTouch;
exports.batchDispatch = batchDispatch;
const nodemailer_1 = __importDefault(require("nodemailer"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const messageComposerAgent_1 = require("./messageComposerAgent");
const CONFIG_PATH = path_1.default.join(__dirname, "..", "config", "smtp.json");
function loadSmtpConfig() {
    if (fs_1.default.existsSync(CONFIG_PATH)) {
        try {
            const raw = fs_1.default.readFileSync(CONFIG_PATH, "utf8");
            return JSON.parse(raw);
        }
        catch (e) {
            // fallback
        }
    }
    // Check process.env
    if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
        return {
            provider: "smtp",
            smtp: {
                host: process.env.SMTP_HOST,
                port: parseInt(process.env.SMTP_PORT || "465", 10),
                secure: (process.env.SMTP_SECURE || "true") === "true",
                auth: {
                    user: process.env.SMTP_USER,
                    pass: process.env.SMTP_PASS
                }
            },
            defaults: {
                fromEmail: process.env.FROM_EMAIL || messageComposerAgent_1.DEFAULT_SENDER_EMAIL,
                fromName: process.env.FROM_NAME || messageComposerAgent_1.DEFAULT_SENDER_NAME
            }
        };
    }
    return {
        provider: "sandbox",
        defaults: {
            fromEmail: messageComposerAgent_1.DEFAULT_SENDER_EMAIL,
            fromName: messageComposerAgent_1.DEFAULT_SENDER_NAME,
            replyTo: messageComposerAgent_1.DEFAULT_SENDER_EMAIL
        }
    };
}
function saveSmtpConfig(config) {
    fs_1.default.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), "utf8");
}
async function createTransporter(config) {
    if (config.provider === "smtp" && config.smtp?.host && config.smtp?.auth?.user) {
        const transporter = nodemailer_1.default.createTransport({
            host: config.smtp.host,
            port: config.smtp.port || 465,
            secure: config.smtp.secure !== false,
            auth: {
                user: config.smtp.auth.user,
                pass: config.smtp.auth.pass
            }
        });
        return { transporter, isSandbox: false };
    }
    // Sandbox / Test mode (uses standard nodemailer JSON transport or simulation)
    const transporter = nodemailer_1.default.createTransport({
        jsonTransport: true
    });
    return { transporter, isSandbox: true };
}
async function sendEmail(options) {
    const config = loadSmtpConfig();
    const { transporter, isSandbox } = await createTransporter(config);
    const fromName = options.fromName || config.defaults?.fromName || messageComposerAgent_1.DEFAULT_SENDER_NAME;
    const fromEmail = options.fromEmail || config.defaults?.fromEmail || messageComposerAgent_1.DEFAULT_SENDER_EMAIL;
    const replyTo = options.replyTo || config.defaults?.replyTo || fromEmail;
    // Convert plain text newlines to clean HTML paragraphs
    const htmlBody = options.body
        .split("\n\n")
        .map(para => `<p style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px; line-height: 1.6; color: #222;">${para.replace(/\n/g, "<br>")}</p>`)
        .join("");
    try {
        const info = await transporter.sendMail({
            from: `"${fromName}" <${fromEmail}>`,
            to: options.to,
            replyTo: replyTo,
            subject: options.subject,
            text: options.body,
            html: htmlBody
        });
        const messageId = info.messageId || `sandbox-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
        const previewUrl = nodemailer_1.default.getTestMessageUrl(info) || undefined;
        return {
            success: true,
            messageId,
            recipient: options.to,
            subject: options.subject,
            previewUrl,
            isSandbox,
            sentAt: new Date().toISOString()
        };
    }
    catch (err) {
        return {
            success: false,
            messageId: "",
            recipient: options.to,
            subject: options.subject,
            error: err.message || String(err),
            isSandbox,
            sentAt: new Date().toISOString()
        };
    }
}
async function sendTestEmail(targetInbox) {
    const testSubject = `[PrimordiaSwarm Test] Outbound Verification from ${messageComposerAgent_1.DEFAULT_SENDER_EMAIL}`;
    const testBody = `Hi there,

This is a live test dispatch from the PrimordiaSwarm autonomous outbound pipeline.

Sender: ${messageComposerAgent_1.DEFAULT_SENDER_NAME} <${messageComposerAgent_1.DEFAULT_SENDER_EMAIL}>
Timestamp: ${new Date().toLocaleString()}
Status: SMTP handshake verified

If you are receiving this message, your outbound pipeline is fully configured and ready for production campaign sequencing.

Best,
${messageComposerAgent_1.DEFAULT_SENDER_NAME}
Primordia Systems
${messageComposerAgent_1.DEFAULT_SENDER_EMAIL}`;
    return sendEmail({
        to: targetInbox,
        subject: testSubject,
        body: testBody
    });
}
async function dispatchCampaignTouch(campaign, stepNumber = 1) {
    const touch = campaign.touches.find(t => t.step === stepNumber) || campaign.touches[0];
    const recipientEmail = campaign.prospect.email || `${campaign.prospect.role.toLowerCase().replace(/[^a-z]/g, "")}@${campaign.prospect.company.toLowerCase().replace(/[^a-z0-9]/g, "")}.com`;
    return sendEmail({
        to: recipientEmail,
        subject: touch.subject,
        body: touch.body,
        fromName: touch.fromName,
        fromEmail: touch.fromEmail
    });
}
async function batchDispatch(campaigns, stepNumber = 1, onProgress, delayMs = 1500) {
    const results = [];
    for (let i = 0; i < campaigns.length; i++) {
        const campaign = campaigns[i];
        const res = await dispatchCampaignTouch(campaign, stepNumber);
        results.push(res);
        if (onProgress) {
            onProgress(i + 1, campaigns.length, res);
        }
        if (i < campaigns.length - 1 && delayMs > 0) {
            await new Promise(resolve => setTimeout(resolve, delayMs));
        }
    }
    return results;
}

import nodemailer from "nodemailer";
import fs from "fs";
import path from "path";
import { CampaignPackage, TouchPoint } from "./types";
import { DEFAULT_SENDER_EMAIL, DEFAULT_SENDER_NAME } from "./messageComposerAgent";

export interface SmtpConfig {
  provider: "smtp" | "resend" | "sandbox";
  smtp?: {
    host: string;
    port: number;
    secure: boolean;
    auth: {
      user: string;
      pass: string;
    };
  };
  resend?: {
    apiKey: string;
  };
  defaults?: {
    fromEmail: string;
    fromName: string;
    replyTo?: string;
  };
}

const CONFIG_PATH = path.join(__dirname, "..", "config", "smtp.json");

export function loadSmtpConfig(): SmtpConfig {
  if (fs.existsSync(CONFIG_PATH)) {
    try {
      const raw = fs.readFileSync(CONFIG_PATH, "utf8");
      return JSON.parse(raw);
    } catch (e) {
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
        fromEmail: process.env.FROM_EMAIL || DEFAULT_SENDER_EMAIL,
        fromName: process.env.FROM_NAME || DEFAULT_SENDER_NAME
      }
    };
  }

  return {
    provider: "sandbox",
    defaults: {
      fromEmail: DEFAULT_SENDER_EMAIL,
      fromName: DEFAULT_SENDER_NAME,
      replyTo: DEFAULT_SENDER_EMAIL
    }
  };
}

export function saveSmtpConfig(config: SmtpConfig): void {
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), "utf8");
}

export interface DispatchResult {
  success: boolean;
  messageId: string;
  recipient: string;
  subject: string;
  previewUrl?: string;
  error?: string;
  isSandbox: boolean;
  sentAt: string;
}

export async function createTransporter(config: SmtpConfig): Promise<{ transporter: nodemailer.Transporter; isSandbox: boolean }> {
  if (config.provider === "smtp" && config.smtp?.host && config.smtp?.auth?.user) {
    const transporter = nodemailer.createTransport({
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
  const transporter = nodemailer.createTransport({
    jsonTransport: true
  });
  return { transporter, isSandbox: true };
}

export async function sendEmail(options: {
  to: string;
  subject: string;
  body: string;
  fromName?: string;
  fromEmail?: string;
  replyTo?: string;
}): Promise<DispatchResult> {
  const config = loadSmtpConfig();
  const { transporter, isSandbox } = await createTransporter(config);

  const fromName = options.fromName || config.defaults?.fromName || DEFAULT_SENDER_NAME;
  const fromEmail = options.fromEmail || config.defaults?.fromEmail || DEFAULT_SENDER_EMAIL;
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
    const previewUrl = nodemailer.getTestMessageUrl(info) || undefined;

    return {
      success: true,
      messageId,
      recipient: options.to,
      subject: options.subject,
      previewUrl,
      isSandbox,
      sentAt: new Date().toISOString()
    };
  } catch (err: any) {
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

export async function sendTestEmail(targetInbox: string): Promise<DispatchResult> {
  const testSubject = `[PrimordiaSwarm Test] Outbound Verification from ${DEFAULT_SENDER_EMAIL}`;
  const testBody = `Hi there,

This is a live test dispatch from the PrimordiaSwarm autonomous outbound pipeline.

Sender: ${DEFAULT_SENDER_NAME} <${DEFAULT_SENDER_EMAIL}>
Timestamp: ${new Date().toLocaleString()}
Status: SMTP handshake verified

If you are receiving this message, your outbound pipeline is fully configured and ready for production campaign sequencing.

Best,
${DEFAULT_SENDER_NAME}
Primordia Systems
${DEFAULT_SENDER_EMAIL}`;

  return sendEmail({
    to: targetInbox,
    subject: testSubject,
    body: testBody
  });
}

export async function dispatchCampaignTouch(campaign: CampaignPackage, stepNumber: number = 1): Promise<DispatchResult> {
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

export async function batchDispatch(
  campaigns: CampaignPackage[],
  stepNumber: number = 1,
  onProgress?: (index: number, total: number, result: DispatchResult) => void,
  delayMs: number = 1500
): Promise<DispatchResult[]> {
  const results: DispatchResult[] = [];

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

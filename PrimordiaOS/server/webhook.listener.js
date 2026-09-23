// server/webhook-listener.js
require('dotenv').config();
const express = require('express');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET;

// Use raw body for HMAC verification
app.use('/webhook', express.raw({ type: 'application/json' }));

// Simple in-memory idempotency store (replace with DB in production)
const processedEvents = new Set();

function verifySignature(req) {
  const signatureHeader = req.headers['x-webhook-signature'];
  const timestampHeader = req.headers['x-webhook-timestamp'];

  if (!signatureHeader || !timestampHeader) {
    throw new Error('Missing signature or timestamp header');
  }

  // Reject stale requests (5 minutes window)
  const now = Date.now();
  const timestampMs = Number(timestampHeader);
  if (Number.isNaN(timestampMs) || Math.abs(now - timestampMs) > 5 * 60 * 1000) {
    throw new Error('Stale webhook request');
  }

  const hmac = crypto.createHmac('sha256', WEBHOOK_SECRET);
  const digest = hmac.update(req.body).digest('hex');
  const expectedSignature = `sha256=${digest}`;

  const providedBuffer = Buffer.from(signatureHeader, 'utf8');
  const expectedBuffer = Buffer.from(expectedSignature, 'utf8');

  if (
    providedBuffer.length !== expectedBuffer.length ||
    !crypto.timingSafeEqual(providedBuffer, expectedBuffer)
  ) {
    throw new Error('Invalid webhook signature');
  }
}

async function synchronizeLedgerState(payoutId, status) {
  // Replace with real DB update
  console.log(
    `[PrimordiaFlow] Ledger updated: Payout ${payoutId} marked as ${status} (synchronized: true)`
  );
}

app.post('/webhook', (req, res) => {
  try {
    verifySignature(req);

    const event = JSON.parse(req.body.toString('utf8'));

    if (!event.event_type || !event.payout_id || !event.id) {
      console.warn('[PrimordiaFlow] Malformed event payload received.');
      return res.status(400).json({ error: 'Malformed event payload' });
    }

    // Idempotency: ignore already processed events
    if (processedEvents.has(event.id)) {
      console.log(
        `[PrimordiaFlow] Duplicate event ignored: [Event: ${event.event_type}] [ID: ${event.id}]`
      );
      return res.status(200).json({ received: true, status: 'duplicate_ignored' });
    }
    processedEvents.add(event.id);

    console.log(
      `[PrimordiaFlow] Verified webhook received: [Event: ${event.event_type}] [Payout: ${event.payout_id}]`
    );

    if (event.event_type === 'payout.settled') {
      synchronizeLedgerState(event.payout_id, 'settled').catch((err) => {
        console.error('[PrimordiaFlow] Ledger sync error:', err.message);
      });
    }

    return res.status(200).json({ received: true, status: 'synchronized' });
  } catch (error) {
    console.warn('[PrimordiaFlow] Webhook rejected:', error.message);
    if (error.message.includes('signature')) {
      return res.status(403).json({ error: 'Invalid signature' });
    }
    if (error.message.includes('Stale')) {
      return res.status(400).json({ error: 'Stale request' });
    }
    return res.status(400).json({ error: 'Bad request' });
  }
});

app.listen(PORT, () => {
  console.log(`[PrimordiaFlow] Webhook listener running on port ${PORT}`);
});

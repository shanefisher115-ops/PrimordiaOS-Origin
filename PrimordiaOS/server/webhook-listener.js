import express from 'express';
import crypto from 'crypto';

const app = express();
const PORT = process.env.PORT || 3000;
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || 'whsec_primordia_test_sig_99182';

// Capture raw body for exact HMAC verification
app.use(express.json({
  verify: (req, res, buf) => {
    req.rawBody = buf;
  }
}));

// Webhook receiver endpoint
app.post('/v3/webhooks/gateway', async (req, res) => {
  const signatureHeader = req.headers['x-signature'];

  if (!signatureHeader) {
    return res.status(401).json({ error: 'Missing X-Signature header' });
  }

  try {
    // Compute expected HMAC signature
    const hmac = crypto.createHmac('sha256', WEBHOOK_SECRET);
    const digest = hmac.update(req.rawBody).digest('hex');
    const expectedSignature = `sha256=${digest}`;

    // Constant-time comparison to prevent timing attacks
    const providedBuffer = Buffer.from(signatureHeader, 'utf8');
    const expectedBuffer = Buffer.from(expectedSignature, 'utf8');

    if (providedBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(providedBuffer, expectedBuffer)) {
      console.warn('[PrimordiaFlow] Invalid webhook signature attempt detected.');
      return res.status(403).json({ error: 'Invalid signature' });
    }

    const event = req.body;
    console.log(`[PrimordiaFlow] Verified webhook received: [Event: ${event.event_type}] [Payout: ${event.payout_id}]`);

    // Process state synchronization
    if (event.event_type === 'payout.settled') {
      await synchronizeLedgerState(event.payout_id, 'settled');
    }

    return res.status(200).json({ received: true, status: 'synchronized' });
  } catch (error) {
    console.error('[PrimordiaFlow] Webhook processing error:', error.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

async function synchronizeLedgerState(payoutId, status) {
  // Database update mock layer
  console.log(`[PrimordiaFlow] Ledger updated: Payout ${payoutId} marked as ${status} (synchronized: true)`);
}

app.listen(PORT, () => {
  console.log(`[PrimordiaFlow] Webhook listener running on port ${PORT}`);
});

import axios from 'axios';
import crypto from 'crypto';
const API_BASE = process.env.PAYOUT_API_BASE || 'http://localhost:3000/v3';
const SECRET = process.env.WEBHOOK_SECRET || 'whsec_primordia_test_sig_99182';
describe('MoneyPlugHub Creator Payout Pipeline E2E', () => {
    let payoutId;
    it('1. Verifies creator balance eligibility prior to disbursement', async () => {
        const response = await axios.get(`${API_BASE}/creators/${process.env.TEST_CREATOR_ID}/balance`);
        expect(response.status).toBe(200);
        expect(response.data.available_balance).toBeGreaterThanOrEqual(Number(process.env.SIMULATED_PAYOUT_AMOUNT));
    });
    it('2. Initiates automated payout request', async () => {
        const payload = {
            creator_id: process.env.TEST_CREATOR_ID,
            wallet_id: process.env.TEST_WALLET_ID,
            amount: Number(process.env.SIMULATED_PAYOUT_AMOUNT),
            currency: process.env.CURRENCY,
            rail: 'instant_ach'
        };
        const response = await axios.post(`${API_BASE}/payouts`, payload, {
            headers: { 'X-Idempotency-Key': crypto.randomUUID() }
        });
        expect(response.status).toBe(201);
        expect(response.data).toHaveProperty('payout_id');
        expect(response.data.status).toBe('processing');
        payoutId = response.data.payout_id;
    });
    it('3. Simulates payment gateway webhook callback (payout_settled)', async () => {
        const webhookPayload = {
            event_type: 'payout.settled',
            payout_id: payoutId,
            creator_id: process.env.TEST_CREATOR_ID,
            amount: Number(process.env.SIMULATED_PAYOUT_AMOUNT),
            timestamp: new Date().toISOString()
        };
        const rawBody = JSON.stringify(webhookPayload);
        const signature = crypto
            .createHmac('sha256', SECRET)
            .update(rawBody)
            .digest('hex');
        const webhookResponse = await axios.post(`${API_BASE}/webhooks/gateway`, rawBody, {
            headers: {
                'Content-Type': 'application/json',
                'X-Signature': `sha256=${signature}`
            }
        });
        expect(webhookResponse.status).toBe(200);
    });
    it('4. Confirms final ledger persistence and status update', async () => {
        const response = await axios.get(`${API_BASE}/payouts/${payoutId}`);
        expect(response.status).toBe(200);
        expect(response.data.status).toBe('settled');
        expect(response.data.ledger_synchronized).toBe(true);
    });
});

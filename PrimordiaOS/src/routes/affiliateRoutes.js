import { Router } from 'express';
import { cakeService } from '../services/cakeService';
import { LinkBuilder } from '../services/linkBuilder';
import { Logger } from '../core/logger';
export const affiliateRouter = Router();
affiliateRouter.get('/offers', async (_req, res) => {
    try {
        const offers = await cakeService.fetchOffers();
        return res.json({ success: true, offers });
    }
    catch (err) {
        Logger.error('/offers error', { error: err.message });
        return res.status(500).json({ success: false, error: 'Failed to fetch offers.' });
    }
});
affiliateRouter.post('/links/generate', (req, res) => {
    try {
        const { offerId, subId1, subId2, agentId, swarmId, funnelId } = req.body || {};
        if (!offerId) {
            return res.status(400).json({ success: false, error: 'offerId is required.' });
        }
        const url = LinkBuilder.buildTrackingLink({
            offerId: Number(offerId),
            subId1,
            subId2,
            agentId,
            swarmId,
            funnelId,
        });
        return res.json({ success: true, url });
    }
    catch (err) {
        Logger.error('/links/generate error', { error: err.message });
        return res.status(500).json({ success: false, error: 'Failed to generate link.' });
    }
});
affiliateRouter.get('/yield/stats', async (_req, res) => {
    // Placeholder: later this will query Supabase for EPC/yield stats
    return res.json({
        success: true,
        stats: {
            totalConversions: 0,
            avgEpc: 0,
            topOffers: [],
        },
    });
});

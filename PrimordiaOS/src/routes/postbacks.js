import { Router } from 'express';
import { postbackService } from '../services/postbackService';
import { Logger } from '../core/logger';
export const postbackRouter = Router();
postbackRouter.get('/postbacks/hitpath', async (req, res) => {
    try {
        const payload = {
            transaction_id: req.query.transaction_id,
            offer_id: req.query.offer_id,
            affiliate_id: req.query.affiliate_id,
            sub_id_1: req.query.sub_id_1,
            sub_id_2: req.query.sub_id_2,
            payout: req.query.payout,
            currency: req.query.currency,
            status: req.query.status,
        };
        await postbackService.handleHitPathPostback(payload);
        return res.status(200).send('OK');
    }
    catch (err) {
        Logger.error('/postbacks/hitpath error', { error: err.message });
        return res.status(500).send('ERROR');
    }
});

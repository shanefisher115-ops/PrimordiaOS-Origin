import { Router } from 'express';
import { postbackService } from '../services/postbackService';
import { Logger } from '../core/logger';

export const postbackRouter = Router();

postbackRouter.get('/postbacks/hitpath', async (req, res) => {
  try {
    const payload = {
      transaction_id: req.query.transaction_id as string | undefined,
      offer_id: req.query.offer_id as string | undefined,
      affiliate_id: req.query.affiliate_id as string | undefined,
      sub_id_1: req.query.sub_id_1 as string | undefined,
      sub_id_2: req.query.sub_id_2 as string | undefined,
      payout: req.query.payout as string | undefined,
      currency: req.query.currency as string | undefined,
      status: req.query.status as string | undefined,
    };

    await postbackService.handleHitPathPostback(payload);
    return res.status(200).send('OK');
  } catch (err) {
    Logger.error('/postbacks/hitpath error', { error: (err as Error).message });
    return res.status(500).send('ERROR');
  }
});

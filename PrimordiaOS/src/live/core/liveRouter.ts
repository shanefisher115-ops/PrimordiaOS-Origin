import { Router } from 'express';
import { LiveIngestion } from './liveIngestion';

export const liveRouter = Router();

liveRouter.post('/live/ingest', async (req, res) => {
  const { source, data } = req.body;
  await LiveIngestion.ingest(source, data);
  return res.json({ success: true });
});

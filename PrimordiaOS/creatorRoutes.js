import { Router } from 'express';
import { ContentMemory } from '../creator/contentMemory';
import { ContentAnalytics } from '../creator/contentAnalytics';
import { contentRewriter } from '../creator/contentRewriter';
import { contentGenerator } from '../creator/contentGenerator';
import { contentOptimizer } from '../creator/contentOptimizer';
import { ContentPersonaEngine } from '../creator/contentPersonaEngine';
export const creatorRouter = Router();
creatorRouter.get('/creator/personas', (_req, res) => {
    return res.json({ success: true, personas: ContentPersonaEngine.list() });
});
creatorRouter.post('/creator/generate', async (req, res) => {
    const { topic, personaId, platform } = req.body || {};
    if (!topic) {
        return res.status(400).json({ success: false, error: 'topic is required' });
    }
    const personaName = personaId ? ContentPersonaEngine.resolveName(personaId) : undefined;
    const script = await contentGenerator.generate(topic, personaName);
    const optimized = platform ? await contentOptimizer.optimize(script, platform) : script;
    const record = ContentMemory.save({
        platform: platform || 'generic',
        raw: topic,
        rewritten: script,
        optimized,
        persona: personaName,
    });
    return res.json({ success: true, record });
});
creatorRouter.post('/creator/rewrite', async (req, res) => {
    const { raw, personaId, platform } = req.body || {};
    if (!raw) {
        return res.status(400).json({ success: false, error: 'raw is required' });
    }
    const personaName = personaId ? ContentPersonaEngine.resolveName(personaId) : undefined;
    const rewritten = await contentRewriter.rewrite(raw, personaName);
    const optimized = platform ? await contentOptimizer.optimize(rewritten, platform) : rewritten;
    const record = ContentMemory.save({
        platform: platform || 'generic',
        raw,
        rewritten,
        optimized,
        persona: personaName,
    });
    return res.json({ success: true, record });
});
creatorRouter.get('/creator/memory', (_req, res) => {
    return res.json({ success: true, memory: ContentMemory.all() });
});
creatorRouter.get('/creator/analytics', (_req, res) => {
    return res.json({ success: true, analytics: ContentAnalytics.summary() });
});

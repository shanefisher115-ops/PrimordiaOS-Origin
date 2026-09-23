import { Router } from 'express';
import { RealmSyncEngine } from './realmSyncEngine';
import { RealmState } from './realmState';
import { RealmSyncRegistry } from './realmSyncRegistry';
export const realmSyncRouter = Router();
realmSyncRouter.post('/realm/sync', async (req, res) => {
    const { realm, data } = req.body;
    const handler = RealmSyncRegistry.get(realm);
    const result = handler ? await handler(data) : await RealmSyncEngine.sync(realm, data);
    return res.json({ success: true, synced: result });
});
realmSyncRouter.get('/realm/state', (_req, res) => {
    return res.json({ success: true, state: RealmState.dump() });
});
realmSyncRouter.get('/realm/handlers', (_req, res) => {
    return res.json({ success: true, handlers: Object.keys(RealmSyncRegistry.all()) });
});

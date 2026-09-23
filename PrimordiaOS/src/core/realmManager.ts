import { Logger } from './logger';

interface RealmRecord {
  id: string;
  name: string;
  type: 'LOCAL' | 'CLOUD' | 'SIMULATION';
  status: 'ONLINE' | 'OFFLINE';
}

const realms: Record<string, RealmRecord> = {};

export const RealmManager = {
  register(id: string, name: string, type: RealmRecord['type']) {
    realms[id] = { id, name, type, status: 'ONLINE' };
    Logger.info('Realm registered', { id, name, type });
  },

  setStatus(id: string, status: RealmRecord['status']) {
    if (realms[id]) {
      realms[id].status = status;
      Logger.info('Realm status updated', { id, status });
    }
  },

  list() {
    return Object.values(realms);
  },
};

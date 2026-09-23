const { ipcMain } = require('electron');

let nextSessionId = 1;

function createRealm(realmId, { policy }) {
  if (realms[realmId]) {
    return { ok: false, error: 'Realm already exists', realmId };
  }
  const realm = startRealm(realmId, policy);
  realms[realmId] = realm;
  policies[realmId] = policy;
  return { ok: true, realmId, policy };
}

// FIXED: return ONLY serializable data
ipcMain.handle('realm:list', async () => {
  const summary = Object.keys(realms).map(id => ({
    id,
    policy: policies[id]
  }));
  return summary;
});

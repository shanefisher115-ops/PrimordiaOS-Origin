export const RealmSyncAdapter = {
    adapt(realm, data) {
        return {
            realm,
            receivedAt: new Date().toISOString(),
            payload: data
        };
    }
};

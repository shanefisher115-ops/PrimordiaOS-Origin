export const RealmSyncAdapter = {
  adapt(realm: string, data: any) {
    return {
      realm,
      receivedAt: new Date().toISOString(),
      payload: data
    };
  }
};

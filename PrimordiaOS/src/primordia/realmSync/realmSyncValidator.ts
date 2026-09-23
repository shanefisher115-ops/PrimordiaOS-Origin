export const RealmSyncValidator = {
  validate(realm: string, data: any) {
    return {
      valid: true,
      realm,
      data
    };
  }
};

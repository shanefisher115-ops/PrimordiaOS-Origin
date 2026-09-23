export const RealmSyncValidator = {
    validate(realm, data) {
        return {
            valid: true,
            realm,
            data
        };
    }
};

export const LoggerUtil = {
    pretty(obj) {
        return JSON.stringify(obj, null, 2);
    },
    compact(obj) {
        return JSON.stringify(obj);
    },
    maskSecrets(obj) {
        const clone = { ...obj };
        for (const key of Object.keys(clone)) {
            if (key.toLowerCase().includes('key') || key.toLowerCase().includes('secret')) {
                clone[key] = '***';
            }
        }
        return clone;
    },
};

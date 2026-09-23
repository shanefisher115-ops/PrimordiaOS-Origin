export const LoggerUtil = {
  pretty(obj: any): string {
    return JSON.stringify(obj, null, 2);
  },

  compact(obj: any): string {
    return JSON.stringify(obj);
  },

  maskSecrets(obj: any): any {
    const clone = { ...obj };
    for (const key of Object.keys(clone)) {
      if (key.toLowerCase().includes('key') || key.toLowerCase().includes('secret')) {
        clone[key] = '***';
      }
    }
    return clone;
  },
};

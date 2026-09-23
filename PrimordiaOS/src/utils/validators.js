export const Validators = {
    isEmail(value) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
    },
    isUrl(value) {
        try {
            new URL(value);
            return true;
        }
        catch {
            return false;
        }
    },
};

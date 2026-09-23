import crypto from 'crypto';
export const Crypto = {
    hashSha256(input) {
        return crypto.createHash('sha256').update(input).digest('hex');
    },
    randomBytes(length) {
        return crypto.randomBytes(length).toString('hex');
    },
};

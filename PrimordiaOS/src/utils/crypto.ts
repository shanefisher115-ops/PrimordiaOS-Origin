import crypto from 'crypto';

export const Crypto = {
  hashSha256(input: string): string {
    return crypto.createHash('sha256').update(input).digest('hex');
  },

  randomBytes(length: number): string {
    return crypto.randomBytes(length).toString('hex');
  },
};

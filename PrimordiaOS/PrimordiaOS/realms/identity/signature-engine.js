import crypto from "node:crypto";

/**
 * Signature Engine: Sovereign verification & HMAC signature checks.
 */
export class SignatureEngine {
  constructor(secret = "REDACTED") {
    this.secret = secret;
  }

  signPayload(payload) {
    const serialized = typeof payload === "string" ? payload : JSON.stringify(payload);
    return crypto.createHmac("sha256", this.secret).update(serialized).digest("hex");
  }

  verifySignature(payload, signature) {
    const expected = this.signPayload(payload);
    return expected === signature;
  }
}

export const signatureEngine = new SignatureEngine();

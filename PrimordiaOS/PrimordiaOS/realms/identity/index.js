import { osmiumLedger } from "./osmium-ledger.js";
import { memoryLedger } from "./memory-ledger.js";
import { signatureEngine } from "./signature-engine.js";

export const IdentityRealm = {
  id: "identity_realm",
  name: "Osmium Immutable Ledger & Sovereign Identity Realm",
  osmium: osmiumLedger,
  memory: memoryLedger,
  signatures: signatureEngine,
  async init() {
    await osmiumLedger.init();
  }
};

export default IdentityRealm;

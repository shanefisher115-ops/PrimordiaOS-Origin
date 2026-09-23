// security/security-bootstrap.js
// ESM version — security subsystem initializer

import { securityAuth } from "./security-auth.js";
import { securityGuard } from "./security-guard.js";

export async function startSecurity() {
    console.log("[Security] Starting security subsystem…");

    securityAuth.start();
    securityGuard.start();

    console.log("[Security] Security subsystem active.");
}

# PrimordiaOS Constitutional Signature System

The Constitutional Signature System acts as the tamper-proof seal over the government of PrimordiaOS. It enforces the **Zero Drift Law**, ensuring that no critical policy, core realm logic, or immutable log is silently modified.

## Trust Model
- The system generates an RSA keypair on initialization.
- The private key (`keys/priv.key`) is stored securely and never exposed to the Cockpit or other realms.
- All configured artifacts (see `constitution-config.json`) are hashed and cryptographically signed.

## Components
- **constitution-engine.cjs**: The main controller that bootstraps the signature system.
- **constitution-keys.cjs**: Key generation and loading.
- **constitution-sign.cjs**: Signs files and maintains `signatures.json`.
- **constitution-verify.cjs**: Validates file hashes against stored cryptographic signatures.
- **constitution-watch.cjs**: Actively watches artifacts for unauthorized modifications.
- **constitution-log.cjs**: Maintains an append-only, immutable record of verification events in `logs.jsonl`.
- **constitution-adapters.cjs**: Exposes explicit verification capabilities to the Court, Guardian, Autonomy, and Kernel realms.

## Enforcement Rules
If an unauthorized change (signature mismatch) is detected:
1. The Guardian may **quarantine** the affected source file.
2. The Guardian may trigger a system-wide **SAFE MODE**.
3. A `COURT_DRIFT_ALERT` is emitted to the Court realm for judicial review.
4. The event is permanently etched into the signature log.

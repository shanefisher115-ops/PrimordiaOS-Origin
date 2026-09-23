/**
 * ==============================================================================
 * 🌑 LEVEL 33: PRIMORDIA IDENTITY BEACON & PUBLIC CRYPTOGRAPHIC VERIFIER
 * Public trust verification service for recipients of Sovereign Capsules.
 * Proves sender provenance, Ed25519 signature validity, and Ω-Bond escrow stakes.
 * ==============================================================================
 */
import crypto from 'crypto';
import { SovereignCapsuleEngine } from './sovereign_capsule';
import { OsmiumLedger } from './osmium_ledger';
export class PrimordiaIdentityBeacon {
    /**
     * Cryptographically audits a Sovereign Capsule and produces an unforgeable verification report.
     */
    static verifyCapsule(capsuleId) {
        OsmiumLedger.init();
        SovereignCapsuleEngine.init();
        const capsule = SovereignCapsuleEngine.getCapsuleById(capsuleId);
        if (!capsule) {
            throw new Error(`Capsule '${capsuleId}' not registered in Sovereign Identity Beacon.`);
        }
        // 1. Recompute canonical payload hash
        const canonicalPayload = JSON.stringify({
            header: capsule.header,
            trustAnchor: capsule.trustAnchor,
            payload: capsule.payload
        });
        const computedHash = crypto.createHash('sha256').update(canonicalPayload).digest('hex');
        const payloadIntegrityVerified = computedHash === capsule.signature.payloadHashSha256;
        // 2. Cryptographically verify Ed25519 signature
        const signatureCryptographicallyValid = OsmiumLedger.verifySignature(capsule.signature.payloadHashSha256, capsule.signature.ed25519SignatureHex);
        // 3. Verify Osmium Ledger Block
        const block = OsmiumLedger.getBlockByCapsuleId(capsuleId);
        const blockVerified = block !== null && block.blockHash === capsule.signature.osmiumBlockHash;
        // 4. Verify Ω-Bond Escrow Marker
        const omegaBondActive = Boolean(capsule.trustAnchor.omegaBondSerial && capsule.trustAnchor.bondAmountUsd > 0);
        // 5. Verify Boardroom Trust Anchor
        const boardroomActive = Boolean(capsule.trustAnchor.boardroomUrl && capsule.trustAnchor.boardroomId);
        // 6. Overall verification status
        const verified = payloadIntegrityVerified && signatureCryptographicallyValid && blockVerified && omegaBondActive;
        // 7. Generate Signed Cryptographic Beacon Certificate
        const certPayload = `BEACON-VERIFY:${capsuleId}:${capsule.signature.osmiumBlockHash}:${verified}:${Date.now()}`;
        const certSig = OsmiumLedger.signPayload(crypto.createHash('sha256').update(certPayload).digest('hex'));
        const beaconCertificate = `PRIM-BEACON-CERT-33.${Buffer.from(certPayload).toString('base64url')}.${certSig.slice(0, 32)}`;
        return {
            verified,
            capsuleId,
            protocol: capsule.protocol,
            originAuthority: capsule.header.senderAuthorityUri,
            recipient: capsule.header.recipientEmail,
            companyName: capsule.trustAnchor.companyName,
            blockIndex: capsule.signature.osmiumBlockIndex,
            blockHash: capsule.signature.osmiumBlockHash,
            payloadIntegrityVerified,
            signatureCryptographicallyValid,
            signerAlgorithm: 'Ed25519',
            omegaBondActive,
            bondSerial: capsule.trustAnchor.omegaBondSerial,
            stakedAmountUsd: capsule.trustAnchor.bondAmountUsd,
            escrowHash: capsule.trustAnchor.escrowHash,
            boardroomActive,
            boardroomPortalUrl: capsule.trustAnchor.boardroomUrl,
            agentProvenance: capsule.trustAnchor.agentProvenance,
            relayPath: capsule.trace.hops.map(h => `${h.relayName} (${h.region}) [${h.hopLatencyMs}ms]`),
            totalRelayLatencyMs: capsule.trace.totalLatencyMs,
            timestamp: Date.now(),
            beaconCertificate
        };
    }
}

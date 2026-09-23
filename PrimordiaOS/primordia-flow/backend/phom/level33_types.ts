/**
 * ==============================================================================
 * 🌑 LEVEL 33 — SOVEREIGN OUTBOUND REALITY ENGINE (SORE)
 * PSM/33 PROTOCOL TYPE DEFINITIONS (2026 Sovereign Substrate)
 * ==============================================================================
 */

export type PsmProtocolVersion = 'PSM/33' | 'PSM/33.1';

export type PsmPacketType = 
  | 'PSM-HELLO' 
  | 'PSM-SIGN' 
  | 'PSM-DELIVER' 
  | 'PSM-TRACE' 
  | 'PSM-RECEIPT';

export interface PsmHelloPacket {
  type: 'PSM-HELLO';
  protocol: PsmProtocolVersion;
  originAuthority: string;
  targetAuthority: string;
  publicKeyHex: string;
  sessionNonce: string;
  timestamp: number;
}

export interface PsmSignPacket {
  type: 'PSM-SIGN';
  capsuleId: string;
  osmiumBlockIndex: number;
  osmiumBlockHash: string;
  payloadHashSha256: string;
  ed25519SignatureHex: string;
  signerPublicKeyHex: string;
  omegaBondSerial: string;
  stakeAmountUsd: number;
  timestamp: number;
}

export interface PsmDeliverPacket {
  type: 'PSM-DELIVER';
  capsuleId: string;
  protocol: PsmProtocolVersion;
  header: SovereignCapsuleHeader;
  trustAnchor: SovereignTrustAnchor;
  payload: SovereignCapsulePayload;
  signature: PsmSignPacket;
  timestamp: number;
}

export interface PsmRelayHop {
  relayId: string;
  relayName: string;
  region: string;
  ingressTimestamp: number;
  egressTimestamp: number;
  hopLatencyMs: number;
  relaySignatureHex: string;
}

export interface PsmTracePacket {
  type: 'PSM-TRACE';
  capsuleId: string;
  hops: PsmRelayHop[];
  totalLatencyMs: number;
  routeStatus: 'in_flight' | 'delivered' | 'relayed' | 'quarantined';
  lastUpdated: number;
}

export interface PsmReceiptPacket {
  type: 'PSM-RECEIPT';
  receiptId: string;
  capsuleId: string;
  terminusNodeId: string;
  recipientVerificationHash: string;
  deliveredTimestamp: number;
  cryptographicProofHex: string;
  verifiedByBeacon: boolean;
}

export interface SovereignCapsuleHeader {
  capsuleId: string;
  protocol: PsmProtocolVersion;
  senderAuthorityUri: string;
  recipientDomain: string;
  recipientEmail: string;
  recipientName: string;
  createdEpoch: number;
  trustTier: 'LEVEL_33_SOVEREIGN';
}

export interface SovereignTrustAnchor {
  boardroomId: string;
  boardroomUrl: string;
  companyName: string;
  domain: string;
  omegaBondSerial: string;
  bondAmountUsd: number;
  escrowHash: string;
  agentProvenance: string;
  verifiedMx: boolean;
}

export interface SovereignCapsulePayload {
  subject: string;
  executiveBriefing: string;
  voiceScript: string;
  projectedMonthlySavingsUsd: number;
  p99LatencyReductionMs: number;
  modeledEfficiencyPct: number;
  customOutboundCopy?: string;
  actionCtaUrl: string;
  actionCtaText: string;
}

export interface SovereignCapsule {
  capsuleId: string;
  protocol: PsmProtocolVersion;
  version: string;
  header: SovereignCapsuleHeader;
  trustAnchor: SovereignTrustAnchor;
  payload: SovereignCapsulePayload;
  signature: PsmSignPacket;
  trace: PsmTracePacket;
  receipt?: PsmReceiptPacket;
  deliveryStatus: 'minted' | 'signed' | 'relaying' | 'delivered' | 'verified';
  createdAt: number;
}

export interface OsmiumBlock {
  index: number;
  prevHash: string;
  blockHash: string;
  timestamp: number;
  capsuleId: string;
  payloadHash: string;
  signatureHex: string;
  signerPublicKeyHex: string;
  omegaBondSerial: string;
  bondAmountUsd: number;
  minerAgent: string;
  nonce: number;
}

export interface RelayNodeInfo {
  relayId: string;
  name: string;
  region: string;
  status: 'online' | 'routing' | 'standby';
  currentLoad: number;
  latencyMs: number;
  publicKeyHex: string;
  packetsRoutedCount: number;
}

export interface IdentityBeaconVerificationReport {
  verified: boolean;
  capsuleId: string;
  protocol: PsmProtocolVersion;
  originAuthority: string;
  recipient: string;
  companyName: string;
  blockIndex: number;
  blockHash: string;
  payloadIntegrityVerified: boolean;
  signatureCryptographicallyValid: boolean;
  signerAlgorithm: 'Ed25519';
  omegaBondActive: boolean;
  bondSerial: string;
  stakedAmountUsd: number;
  escrowHash: string;
  boardroomActive: boolean;
  boardroomPortalUrl: string;
  agentProvenance: string;
  relayPath: string[];
  totalRelayLatencyMs: number;
  timestamp: number;
  beaconCertificate: string;
}
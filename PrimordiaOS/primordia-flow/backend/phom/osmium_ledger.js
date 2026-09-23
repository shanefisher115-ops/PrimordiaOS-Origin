/**
 * ==============================================================================
 * 🌑 LEVEL 33: OSMIUM LEDGER & CRYPTOGRAPHIC IDENTITY SUBSTRATE
 * Sovereign Blockchain Ledger & Real Ed25519 Signature Engine.
 * Replaces legacy SPF/DKIM/DMARC with unforgeable mathematical certainty.
 * ==============================================================================
 */
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { db } from '../db';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const KEYS_DIR = path.resolve(__dirname, '..', 'osmium_keys');
if (!fs.existsSync(KEYS_DIR)) {
    fs.mkdirSync(KEYS_DIR, { recursive: true });
}
const PRIVATE_KEY_PATH = path.join(KEYS_DIR, 'shane_ed25519_private.pem');
const PUBLIC_KEY_PATH = path.join(KEYS_DIR, 'shane_ed25519_public.pem');
export class OsmiumLedger {
    static privateKeyPem;
    static publicKeyPem;
    static publicKeyHex;
    static initialized = false;
    /**
     * Initializes SQLite tables, Ed25519 cryptographic keys, and Genesis Block.
     */
    static init() {
        if (this.initialized)
            return;
        // 1. Initialize SQLite schema
        db.exec(`
      CREATE TABLE IF NOT EXISTS osmium_blocks (
        block_index INTEGER PRIMARY KEY,
        prev_hash TEXT NOT NULL,
        block_hash TEXT NOT NULL,
        timestamp INTEGER NOT NULL,
        capsule_id TEXT NOT NULL,
        payload_hash TEXT NOT NULL,
        signature_hex TEXT NOT NULL,
        signer_pubkey_hex TEXT NOT NULL,
        bond_serial TEXT NOT NULL,
        stake_amount_usd REAL NOT NULL,
        miner_agent TEXT NOT NULL,
        nonce INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_osmium_capsule_id ON osmium_blocks(capsule_id);
      CREATE INDEX IF NOT EXISTS idx_osmium_hash ON osmium_blocks(block_hash);
    `);
        // 2. Load or generate Ed25519 sovereign keypair
        this.ensureKeypair();
        this.initialized = true;
        // 3. Ensure Genesis Block exists
        this.ensureGenesisBlock();
        console.log('[Osmium Ledger] Level 33 Sovereign Cryptographic Ledger Initialized.');
    }
    static ensureKeypair() {
        if (fs.existsSync(PRIVATE_KEY_PATH) && fs.existsSync(PUBLIC_KEY_PATH)) {
            this.privateKeyPem = fs.readFileSync(PRIVATE_KEY_PATH, 'utf8');
            this.publicKeyPem = fs.readFileSync(PUBLIC_KEY_PATH, 'utf8');
        }
        else {
            console.log('[Osmium Ledger] Generating Sovereign Ed25519 Master Keypair...');
            const { privateKey, publicKey } = crypto.generateKeyPairSync('ed25519', {
                privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
                publicKeyEncoding: { type: 'spki', format: 'pem' }
            });
            this.privateKeyPem = privateKey;
            this.publicKeyPem = publicKey;
            fs.writeFileSync(PRIVATE_KEY_PATH, this.privateKeyPem, 'utf8');
            fs.writeFileSync(PUBLIC_KEY_PATH, this.publicKeyPem, 'utf8');
        }
        // Derive raw public key hex from SPKI for protocol beacon
        const pubKeyObj = crypto.createPublicKey(this.publicKeyPem);
        const rawPubBuffer = pubKeyObj.export({ type: 'spki', format: 'der' });
        this.publicKeyHex = rawPubBuffer.toString('hex');
    }
    static ensureGenesisBlock() {
        const countRow = db.prepare('SELECT COUNT(*) as count FROM osmium_blocks').get();
        if (countRow && countRow.count > 0)
            return;
        console.log('[Osmium Ledger] Minting Genesis Block 0 (OSMIUM-GENESIS-33)...');
        const genesisPayload = 'PRIMORDIA SOVEREIGN OUTBOUND REALITY ENGINE LEVEL 33 GENESIS ORIGIN';
        const payloadHash = crypto.createHash('sha256').update(genesisPayload).digest('hex');
        const signatureHex = this.signPayload(payloadHash);
        const prevHash = '0000000000000000000000000000000000000000000000000000000000000000';
        const timestamp = 1773000000000; // Primordia Origin Epoch
        const nonce = 33033;
        const blockHash = this.calculateBlockHash(0, prevHash, timestamp, payloadHash, signatureHex, 'PRIM-OMEGA-GENESIS', nonce);
        db.prepare(`
      INSERT INTO osmium_blocks (
        block_index, prev_hash, block_hash, timestamp, capsule_id,
        payload_hash, signature_hex, signer_pubkey_hex, bond_serial,
        stake_amount_usd, miner_agent, nonce
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(0, prevHash, blockHash, timestamp, 'CAPSULE-33-GENESIS', payloadHash, signatureHex, this.publicKeyHex, 'PRIM-OMEGA-GENESIS', 100000, 'SovereigntyKernel', nonce);
    }
    static getPublicKeyHex() {
        if (!this.initialized)
            this.init();
        return this.publicKeyHex;
    }
    static getPublicKeyPem() {
        if (!this.initialized)
            this.init();
        return this.publicKeyPem;
    }
    /**
     * Signs a SHA-256 hash using the sovereign Ed25519 private key.
     */
    static signPayload(payloadHashSha256) {
        if (!this.initialized)
            this.init();
        const signBuffer = Buffer.from(payloadHashSha256, 'utf8');
        const signature = crypto.sign(null, signBuffer, this.privateKeyPem);
        return signature.toString('hex');
    }
    /**
     * Verifies an Ed25519 signature against a payload hash.
     */
    static verifySignature(payloadHashSha256, signatureHex, pubkeyPem) {
        if (!this.initialized)
            this.init();
        try {
            const signBuffer = Buffer.from(payloadHashSha256, 'utf8');
            const sigBuffer = Buffer.from(signatureHex, 'hex');
            const keyToUse = pubkeyPem || this.publicKeyPem;
            return crypto.verify(null, signBuffer, keyToUse, sigBuffer);
        }
        catch (err) {
            console.error('[Osmium Ledger Verification Error]:', err);
            return false;
        }
    }
    static calculateBlockHash(index, prevHash, timestamp, payloadHash, signatureHex, bondSerial, nonce) {
        const raw = `${index}:${prevHash}:${timestamp}:${payloadHash}:${signatureHex}:${bondSerial}:${nonce}`;
        return crypto.createHash('sha256').update(raw).digest('hex');
    }
    /**
     * Mines and permanently records an Osmium Block committing a Sovereign Capsule to the chain.
     */
    static mineBlock(capsuleId, payloadHash, bondSerial, stakeAmountUsd, minerAgent = 'SovereignOutboundAgent') {
        if (!this.initialized)
            this.init();
        // Get latest block
        const latest = db.prepare('SELECT * FROM osmium_blocks ORDER BY block_index DESC LIMIT 1').get();
        const newIndex = latest ? latest.block_index + 1 : 1;
        const prevHash = latest ? latest.block_hash : '0000000000000000000000000000000000000000000000000000000000000000';
        const timestamp = Date.now();
        // Cryptographic Ed25519 Signature
        const signatureHex = this.signPayload(payloadHash);
        // Proof-of-friction nonce calculation (bounded safety limit to prevent runaway loops)
        let nonce = 0;
        let blockHash = '';
        const maxMiningIterations = 5000;
        for (nonce = 0; nonce <= maxMiningIterations; nonce++) {
            blockHash = this.calculateBlockHash(newIndex, prevHash, timestamp, payloadHash, signatureHex, bondSerial, nonce);
            if (blockHash.startsWith('00'))
                break;
        }
        db.prepare(`
      INSERT INTO osmium_blocks (
        block_index, prev_hash, block_hash, timestamp, capsule_id,
        payload_hash, signature_hex, signer_pubkey_hex, bond_serial,
        stake_amount_usd, miner_agent, nonce
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(newIndex, prevHash, blockHash, timestamp, capsuleId, payloadHash, signatureHex, this.publicKeyHex, bondSerial, stakeAmountUsd, minerAgent, nonce);
        return {
            index: newIndex,
            prevHash,
            blockHash,
            timestamp,
            capsuleId,
            payloadHash,
            signatureHex,
            signerPublicKeyHex: this.publicKeyHex,
            omegaBondSerial: bondSerial,
            bondAmountUsd: stakeAmountUsd,
            minerAgent,
            nonce
        };
    }
    /**
     * Retrieves latest chain blocks.
     */
    static getChain(limit = 50) {
        if (!this.initialized)
            this.init();
        const rows = db.prepare('SELECT * FROM osmium_blocks ORDER BY block_index DESC LIMIT ?').all(limit);
        return rows.map(r => ({
            index: r.block_index,
            prevHash: r.prev_hash,
            blockHash: r.block_hash,
            timestamp: r.timestamp,
            capsuleId: r.capsule_id,
            payloadHash: r.payload_hash,
            signatureHex: r.signature_hex,
            signerPublicKeyHex: r.signer_pubkey_hex,
            omegaBondSerial: r.bond_serial,
            bondAmountUsd: r.stake_amount_usd,
            minerAgent: r.miner_agent,
            nonce: r.nonce
        }));
    }
    static getBlockByCapsuleId(capsuleId) {
        if (!this.initialized)
            this.init();
        const r = db.prepare('SELECT * FROM osmium_blocks WHERE capsule_id = ?').get(capsuleId);
        if (!r)
            return null;
        return {
            index: r.block_index,
            prevHash: r.prev_hash,
            blockHash: r.block_hash,
            timestamp: r.timestamp,
            capsuleId: r.capsule_id,
            payloadHash: r.payload_hash,
            signatureHex: r.signature_hex,
            signerPublicKeyHex: r.signer_pubkey_hex,
            omegaBondSerial: r.bond_serial,
            bondAmountUsd: r.stake_amount_usd,
            minerAgent: r.miner_agent,
            nonce: r.nonce
        };
    }
}

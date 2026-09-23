import crypto from "node:crypto";
import { eventBus } from "../../kernel/event-bus.js";

/**
 * Osmium Immutable Ledger Adapter for Identity Realm.
 * Implements a cryptographic SHA-256 hash-chain ledger.
 */
export class OsmiumLedgerAdapter {
  constructor() {
    this.realmId = "identity_realm";
    const genesisData = { sovereign: "Shane", status: "primordial_genesis" };
    const genesisPrevHash = "0000000000000000000000000000000000000000000000000000000000000000";
    const genesisTimestamp = 1725235200000;
    const genesisHash = this.calculateHash(0, genesisTimestamp, genesisPrevHash, genesisData);

    this.chain = [
      {
        index: 0,
        timestamp: genesisTimestamp,
        event: "GENESIS_BLOCK",
        data: genesisData,
        previousHash: genesisPrevHash,
        hash: genesisHash
      }
    ];
  }

  calculateHash(index, timestamp, previousHash, data) {
    return crypto
      .createHash("sha256")
      .update(index + timestamp + previousHash + JSON.stringify(data))
      .digest("hex");
  }

  async init() {
    console.log(`[Identity Realm] Initializing Osmium Cryptographic Ledger (Height: ${this.chain.length})...`);
    eventBus.emitRealmEvent("IDENTITY_REALM_READY", {
      height: this.chain.length,
      genesis_hash: this.chain[0].hash
    }, this.realmId);
  }

  appendBlock(eventOrData, maybeData = {}) {
    let event = "BLOCK_COMMITTED";
    let data = {};
    if (typeof eventOrData === "string") {
      event = eventOrData;
      data = maybeData || {};
    } else if (typeof eventOrData === "object" && eventOrData !== null) {
      data = eventOrData;
      event = eventOrData.event || eventOrData.type || "BLOCK_COMMITTED";
    }

    const prevBlock = this.getLatestBlock();
    const newIndex = prevBlock.index + 1;
    const timestamp = Date.now();
    const hash = this.calculateHash(newIndex, timestamp, prevBlock.hash, data);

    const newBlock = {
      index: newIndex,
      timestamp,
      event,
      data,
      previousHash: prevBlock.hash,
      hash
    };

    this.chain.push(newBlock);
    eventBus.emitRealmEvent("LEDGER_BLOCK_COMMITTED", { index: newIndex, hash, event, block: newBlock }, this.realmId);
    eventBus.emit("LEDGER_BLOCK_COMMITTED", { index: newIndex, hash, event, block: newBlock });
    return newBlock;
  }

  verifyChain() {
    if (!this.chain || this.chain.length === 0) return false;

    // Verify genesis block
    const genesis = this.chain[0];
    if (genesis.index !== 0) return false;
    if (genesis.previousHash !== "0000000000000000000000000000000000000000000000000000000000000000") return false;
    if (genesis.hash !== this.calculateHash(genesis.index, genesis.timestamp, genesis.previousHash, genesis.data)) return false;

    // Verify all subsequent blocks
    for (let i = 1; i < this.chain.length; i++) {
      const current = this.chain[i];
      const prev = this.chain[i - 1];

      if (current.index !== i) return false;
      if (current.previousHash !== prev.hash) return false;
      if (current.hash !== this.calculateHash(current.index, current.timestamp, current.previousHash, current.data)) return false;
    }
    return true;
  }

  getBlock(index) {
    return this.chain.find(b => b.index === index) || null;
  }

  getLatestBlock() {
    return this.chain[this.chain.length - 1];
  }

  getHistory() {
    return [...this.chain];
  }
}

export const osmiumLedger = new OsmiumLedgerAdapter();

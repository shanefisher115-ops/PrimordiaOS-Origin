import { osmiumLedger } from "../realms/identity/osmium-ledger.js";

/**
 * Osmium Immutable Core Engine.
 */
export class OsmiumCore {
  constructor() {
    this.ledger = osmiumLedger;
  }

  getGenesisBlock() {
    return this.ledger.chain[0];
  }

  getLatestBlock() {
    return this.ledger.chain[this.ledger.chain.length - 1];
  }

  commitEvent(event, data) {
    return this.ledger.appendBlock(event, data);
  }
}

export const osmiumCore = new OsmiumCore();

/**
 * Transaction Logic: Handles value routing, commissions, and ledger receipts.
 */
export class TransactionLogic {
  constructor() {
    this.transactions = [];
  }

  recordTransaction(tx) {
    const record = {
      id: `tx_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp: Date.now(),
      ...tx
    };
    this.transactions.push(record);
    return record;
  }
}

export const transactionLogic = new TransactionLogic();

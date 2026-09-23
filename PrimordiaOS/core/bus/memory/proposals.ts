import { Database } from 'sqlite3';

export interface PolicyRule {
  proposalType: 'FACT' | 'DECISION' | 'FAILURE' | 'DEPRECATION';
  autoApproveIfRole?: string[];
  maxSensitivity: 'public' | 'internal' | 'restricted';
}

export class ProposalPolicyEngine {
  private db: Database;

  constructor(db: Database) {
    this.db = db;
  }

  // Evaluate incoming proposals against rules
  public async evaluateProposal(proposalId: string, agentRole: string, sensitivity: 'public' | 'internal' | 'restricted'): Promise<'APPROVED' | 'PENDING'> {
    // Auto-approve runtime failure logs and basic operational facts
    if (sensitivity === 'public' || sensitivity === 'internal') {
      await this.approveProposal(proposalId, 'auto_policy_engine');
      return 'APPROVED';
    }

    return 'PENDING';
  }

  public async approveProposal(proposalId: string, reviewerId: string): Promise<void> {
    const query = `
      UPDATE memory_proposals
      SET status = 'APPROVED', reviewed_by = ?
      WHERE proposal_id = ?;
    `;

    return new Promise((resolve, reject) => {
      this.db.run(query, [reviewerId, proposalId], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }
}
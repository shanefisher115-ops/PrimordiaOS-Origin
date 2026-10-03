// Simple in-memory + file-backed token vault for PrimordiaOS

import fs from 'fs';
import path from 'path';

const VAULT_PATH = path.resolve(process.cwd(), '.primordia-token-vault.json');

class TokenVault {
  constructor() {
    this.tokens = {};
    this.load();
  }

  load() {
    try {
      if (fs.existsSync(VAULT_PATH)) {
        const raw = fs.readFileSync(VAULT_PATH, 'utf8');
        this.tokens = JSON.parse(raw);
        console.log('[TokenVault] Loaded from disk');
      }
    } catch (err) {
      console.error('[TokenVault] Failed to load:', err);
      this.tokens = {};
    }
  }

  save() {
    try {
      fs.writeFileSync(VAULT_PATH, JSON.stringify(this.tokens, null, 2), 'utf8');
      console.log('[TokenVault] Saved to disk');
    } catch (err) {
      console.error('[TokenVault] Failed to save:', err);
    }
  }

  set(providerName, session) {
    this.tokens[providerName] = {
      ...session,
      updatedAt: Date.now(),
    };
    this.save();
  }

  get(providerName) {
    return this.tokens[providerName] || null;
  }

  list() {
    return Object.keys(this.tokens).map(name => ({
      name,
      session: this.tokens[name],
    }));
  }
}

export const tokenVault = new TokenVault();

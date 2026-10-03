// Central credential + token manager for PrimordiaOS

import { tokenVault } from './tokenVault.js';

export class CredentialGateway {
  constructor() {
    this.providers = new Map();   // name -> provider module
  }

  registerProvider(name, provider) {
    this.providers.set(name, provider);
    console.log('[CredentialGateway] Registered provider:', name);
  }

  async login(name, credentials) {
    const provider = this.providers.get(name);
    if (!provider) {
      throw new Error(`No provider registered for ${name}`);
    }

    console.log('[CredentialGateway] Logging in to', name);

    const session = await provider.login(credentials);

    tokenVault.set(name, session);
    console.log('[CredentialGateway] Session stored in vault for', name);

    return session;
  }

  getSession(name) {
    return tokenVault.get(name);
  }

  async ensureFreshToken(name) {
    const provider = this.providers.get(name);
    const session = tokenVault.get(name);

    if (!provider || !session) return null;

    if (provider.refresh && session.refreshToken) {
      const refreshed = await provider.refresh(session);
      tokenVault.set(name, refreshed);
      return refreshed;
    }

    return session;
  }

  listSessions() {
    return tokenVault.list();
  }
}

export const credentialGateway = new CredentialGateway();

// Simple status panel for auth state

import { credentialGateway } from './gateway.js';

export async function printAuthStatus() {
  const sessions = credentialGateway.listSessions();

  console.log('=== PrimordiaOS Auth Status ===');
  if (sessions.length === 0) {
    console.log('No providers authenticated yet.');
    return;
  }

  for (const { name, session } of sessions) {
    console.log(
      `Provider: ${name} | accessToken: ${session.accessToken ? 'SET' : 'MISSING'} | updatedAt: ${new Date(
        session.updatedAt,
      ).toISOString()}`,
    );
  }
}

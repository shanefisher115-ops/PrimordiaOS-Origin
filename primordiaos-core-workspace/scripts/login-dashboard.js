// Minimal CLI login dashboard for PrimordiaOS auth

import readline from 'readline';
import { credentialGateway } from '../src/auth/gateway.js';
import { twitterProvider } from '../src/auth/providers/twitter.js';
import { redditProvider } from '../src/auth/providers/reddit.js';
import { youtubeProvider } from '../src/auth/providers/youtube.js';
import { instagramProvider } from '../src/auth/providers/instagram.js';
import { tiktokProvider } from '../src/auth/providers/tiktok.js';
import { printAuthStatus } from '../src/auth/statusPanel.js';

credentialGateway.registerProvider('twitter', twitterProvider);
credentialGateway.registerProvider('reddit', redditProvider);
credentialGateway.registerProvider('youtube', youtubeProvider);
credentialGateway.registerProvider('instagram', instagramProvider);
credentialGateway.registerProvider('tiktok', tiktokProvider);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function ask(question) {
  return new Promise(resolve => rl.question(question, answer => resolve(answer)));
}

async function main() {
  console.log('=== PrimordiaOS Auth Login Dashboard ===');
  await printAuthStatus();

  const provider = await ask('Provider (twitter/reddit/youtube/instagram/tiktok): ');
  const username = await ask('Username: ');

  const session = await credentialGateway.login(provider.trim(), { username: username.trim() });

  console.log('Session stored:', session);
  await printAuthStatus();

  rl.close();
}

main().catch(err => {
  console.error(err);
  rl.close();
});

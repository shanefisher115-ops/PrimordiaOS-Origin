// config.js
const fs = require('fs');
const path = require('path');

const TOKEN_PATH = path.join(__dirname, 'ENABLE_TOKEN.txt');

function readLocalToken() {
  try {
    return fs.readFileSync(TOKEN_PATH, 'utf8').trim();
  } catch (e) {
    return null;
  }
}

function isDangerAllowed() {
  const env = process.env.PRIMORDIAL_ALLOW_DANGEROUS === 'true';
  const envToken = process.env.PRIMORDIAL_ENABLE_TOKEN || '';
  const fileToken = readLocalToken();
  return env && envToken && fileToken && envToken === fileToken;
}

// Called from UI to verify token (UI must still set env var)
function verifyEnableToken(token) {
  const fileToken = readLocalToken();
  if (!fileToken) return { ok: false, reason: 'No local token file found' };
  if (token === fileToken && process.env.PRIMORDIAL_ALLOW_DANGEROUS === 'true') {
    return { ok: true };
  }
  return { ok: false, reason: 'Token mismatch or environment flag not set' };
}

module.exports = { isDangerAllowed, verifyEnableToken, TOKEN_PATH };

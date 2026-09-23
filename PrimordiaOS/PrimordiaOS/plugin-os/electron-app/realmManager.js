// realmManager.js — Realm engine + worker threads

const { Worker } = require('worker_threads');
const path = require('path');
const fs = require('fs');

const DATA_DIR = path.join(__dirname, 'data');
const AUDIT_LOG = path.join(DATA_DIR, 'audit.log');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function audit(entry) {
  const line = `[${new Date().toISOString()}] ${entry}\n`;
  try {
    fs.appendFileSync(AUDIT_LOG, line);
  } catch {}
}

function startRealm(realmId, policy) {
  const workerPath = path.join(__dirname, 'agentWorker.js');

  const worker = new Worker(workerPath, {
    workerData: { realmId, policy }
  });

  worker.on('message', (msg) => {
    audit(`REALM_MSG realm=${realmId} ${JSON.stringify(msg)}`);
  });

  worker.on('error', (err) => {
    audit(`REALM_ERROR realm=${realmId} ${String(err)}`);
  });

  worker.on('exit', (code) => {
    audit(`REALM_EXIT realm=${realmId} code=${code}`);
  });

  function run(action, payload) {
    return new Promise((resolve, reject) => {
      const req = { action, payload };
      worker.postMessage(req);
      const onMessage = (msg) => {
        if (msg.type === 'result') {
          worker.off('message', onMessage);
          resolve(msg.data);
        }
      };
      worker.on('message', onMessage);
      setTimeout(() => {
        worker.off('message', onMessage);
        reject(new Error('Realm timeout'));
      }, 10000);
    });
  }

  audit(`REALM_STARTED realm=${realmId}`);
  return { run };
}

module.exports = {
  startRealm
};

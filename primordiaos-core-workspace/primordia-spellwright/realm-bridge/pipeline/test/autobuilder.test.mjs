import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { configFromEnv, parseResultLine, startAutobuilder } from '../autobuilder/server.mjs';
import { api, tempDir } from './helpers.mjs';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Stand-in scripts with the real scripts' interface: output lines, then PRIMORDIA_RESULT. */
function fakeScripts(dir) {
  const scripts = join(dir, 'scripts');
  mkdirSync(scripts, { recursive: true });
  writeFileSync(join(scripts, 'Build-PrimordiaModules.ps1'), `
param([string]$Mode, [string]$EngineRoot, [string]$ProjectPath, [string]$PluginPath, [string]$Configuration, [string]$Target)
Write-Output "building $Mode $Configuration"
if ($ProjectPath -like '*fail*') { Write-Output 'error C2065: undeclared identifier'; Write-Output 'PRIMORDIA_RESULT {"ok":false,"summary":"compile error"}'; exit 1 }
Write-Output ('PRIMORDIA_RESULT {"ok":true,"summary":"' + $Mode + ' built"}')
exit 0
`);
  writeFileSync(join(scripts, 'Install-PrimordiaModules.ps1'), `
param([string]$Source, [string]$ProjectPath)
Write-Output 'PRIMORDIA_RESULT {"ok":true,"summary":"installed"}'
exit 0
`);
  return scripts;
}

async function waitBuild(port, id) {
  for (let i = 0; i < 200; i++) {
    const { body } = await api(port, `/builds/${id}`);
    if (body.build.status === 'succeeded' || body.build.status === 'failed') return body.build;
    await sleep(100);
  }
  throw new Error('build never finished');
}

test('result lines are parsed from script output', () => {
  assert.deepEqual(parseResultLine(['x', 'PRIMORDIA_RESULT {"ok":true,"summary":"s"}', 'trailing']), { ok: true, summary: 's' });
  assert.equal(parseResultLine(['nothing']), null);
});

test('autobuilder: builds run one at a time, report results, require reasons', async () => {
  const dir = tempDir('ab-');
  const ab = await startAutobuilder({
    ...configFromEnv({}),
    port: 0,
    scriptsDir: fakeScripts(dir),
    boltUrl: 'http://127.0.0.1:1',
    quiet: true,
  });
  try {
    assert.equal((await api(ab.port, '/build', { method: 'POST', body: { mode: 'plugin' } })).status, 400, 'no reason');
    assert.equal((await api(ab.port, '/build', { method: 'POST', body: { reason: 'r', mode: 'sideways' } })).status, 400);
    assert.equal((await api(ab.port, '/build', { method: 'POST', body: { reason: 'r', project: 'C:/x.txt' } })).status, 400);

    const a = await api(ab.port, '/build', { method: 'POST', body: { reason: 'first', mode: 'plugin', project: 'C:/p/A.uproject' } });
    const b = await api(ab.port, '/build', { method: 'POST', body: { reason: 'second', mode: 'project', project: 'C:/p/fail.uproject' } });
    const d = await api(ab.port, '/deploy', { method: 'POST', body: { reason: 'deploy', project: 'C:/p/A.uproject' } });
    assert.equal(a.status, 202);

    const status = await api(ab.port, '/status');
    assert.equal(status.body.server, 'autobuilder');

    const ra = await waitBuild(ab.port, a.body.build.id);
    const rb = await waitBuild(ab.port, b.body.build.id);
    const rd = await waitBuild(ab.port, d.body.build.id);
    assert.equal(ra.status, 'succeeded');
    assert.equal(ra.summary, 'Plugin built'); // the server passes -Mode Plugin, as the real script expects
    assert.equal(rb.status, 'failed');
    assert.equal(rb.summary, 'compile error');
    assert.ok(rb.log.some((l) => l.includes('C2065')));
    assert.equal(rd.status, 'succeeded');
    // One at a time: b started after a finished.
    assert.ok(Date.parse(rb.startedAt) >= Date.parse(ra.finishedAt));
  } finally {
    await ab.close();
  }
});

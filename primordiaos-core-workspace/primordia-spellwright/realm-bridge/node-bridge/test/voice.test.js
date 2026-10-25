// Voice path: speak / converse, sentence streaming, actions, voice packets.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createBridge } from '../src/server.js';
import { validatePacket } from '../src/schemas.js';
import { extractSay, normalizeAction, normalizeActions } from '../src/voice/director.js';
import { createSentenceStream, splitSentences, floatToPcm16 } from '../src/voice/tts.js';
import { fakeOllama, fakeTtsFactory, session } from './helpers.js';

const quiet = () => {};
const doneAck = (command) => (p) => p.type === 'ack' && p.payload.command === command && (p.payload.status === 'done' || p.payload.status === 'failed');

test('say is read out of JSON that is still streaming', () => {
  assert.equal(extractSay('{"sa'), null);
  assert.deepEqual(extractSay('{"say": "The storm ri'), { text: 'The storm ri', closed: false });
  assert.deepEqual(extractSay('{"say":"He said \\"go\\".\\nNow", "action"'), { text: 'He said "go". Now', closed: true });
  assert.deepEqual(extractSay('{"say":"cut \\'), { text: 'cut ', closed: false });
});

test('sentences are released as soon as they are complete', () => {
  const s = createSentenceStream();
  assert.deepEqual(s.push('Yes'), []);
  assert.deepEqual(s.push('Yes. The sto'), ['Yes.']);
  assert.deepEqual(s.push('Yes. The storm rises! It is yours'), ['The storm rises!']);
  assert.deepEqual(s.flush(), ['It is yours']);
  assert.deepEqual(splitSentences('One. Two! Three?'), ['One.', 'Two!', 'Three?']);
});

test('actions are whitelisted and clamped', () => {
  assert.deepEqual(normalizeAction({ type: 'perturb', key: 'entropy', value: 7 }), { type: 'perturb', key: 'entropy', value: 1 });
  assert.deepEqual(normalizeAction({ type: 'perturb', key: 'heartPulse', value: 1 }), { type: 'none' });
  assert.deepEqual(normalizeAction({ type: 'rm -rf' }), { type: 'none' });
  assert.deepEqual(normalizeAction({ type: 'generate_realm', description: ' a sea ' }), { type: 'generate_realm', description: 'a sea' });
  assert.equal(normalizeAction({ type: 'reseed' }).type, 'reseed');
  assert.equal(normalizeActions({ actions: Array(5).fill({ type: 'evolve_realm' }) }).length, 3);
  assert.deepEqual(normalizeActions({ action: { type: 'evolve_realm' } }), [{ type: 'evolve_realm' }]);
});

test('PCM conversion clips and is little-endian', () => {
  const b = floatToPcm16(new Float32Array([0, 1, -1, 2]));
  assert.deepEqual([b.readInt16LE(0), b.readInt16LE(2), b.readInt16LE(4), b.readInt16LE(6)], [0, 32767, -32768, 32767]);
});

test('perturb holds against the modules that recompute the scalar', async () => {
  const bridge = await createBridge({ port: 0, log: quiet, evolveSeconds: 0 });
  try {
    await session(bridge.port, [{ type: 'command', name: 'perturb', args: { key: 'entropy', value: 0.97 } }], (p) => p.type === 'ack');
    await new Promise((r) => setTimeout(r, 300)); // ~18 ticks of Omniscience rewriting entropy
    assert.ok(Math.abs(bridge.ctx.state.entropy - 0.97) < 1e-9, `entropy drifted to ${bridge.ctx.state.entropy}`);
  } finally {
    await bridge.close();
  }
});

test('speak streams ordered, valid voice packets then acks done', async () => {
  const bridge = await createBridge({ port: 0, log: quiet, evolveSeconds: 0, ttsFactory: fakeTtsFactory });
  try {
    const packets = await session(bridge.port, [{ type: 'command', name: 'speak', args: { text: 'Antigravity matrix initialized. Sector zero is stable.' } }], doneAck('speak'));
    const voice = packets.filter((p) => p.type === 'voice');
    for (const p of voice) assert.deepEqual(validatePacket(p), [], 'voice packet schema');
    assert.deepEqual(voice.filter((p) => p.payload.text).map((p) => p.payload.text), ['Antigravity matrix initialized.', 'Sector zero is stable.']);
    assert.deepEqual(voice.map((p) => p.payload.chunk), voice.map((_, i) => i), 'chunks in order');
    assert.equal(voice.at(-1).payload.final, true);
    assert.equal(voice[0].id, 'voice:soul');
    const pcmBytes = voice.reduce((n, p) => n + Buffer.from(p.payload.pcm, 'base64').length, 0);
    assert.equal(pcmBytes, ('Antigravity matrix initialized.'.length + 'Sector zero is stable.'.length) * 240 * 2);
    const done = packets.find(doneAck('speak')).payload;
    assert.equal(done.ok, true);
    assert.ok(done.audioSeconds > 0);
  } finally {
    await bridge.close();
  }
});

test('converse speaks while the LLM is still writing, then performs the action', async () => {
  const reply = {
    say: 'The storm rises. I give it to you, traveller.',
    actions: [{ type: 'perturb', key: 'entropy', value: 0.9 }, { type: 'perturb', key: 'coherence', value: 0.1 }, { type: 'none' }],
  };
  const fake = await fakeOllama(reply, { delayMs: 15 });
  const bridge = await createBridge({ port: 0, log: quiet, evolveSeconds: 0, ollamaUrl: fake.url, voiceModel: 'fake:1b', ttsFactory: fakeTtsFactory });
  try {
    const packets = await session(bridge.port, [{ type: 'command', name: 'converse', args: { input: 'Make it stormy.' } }], doneAck('converse'));
    const voice = packets.filter((p) => p.type === 'voice' && p.payload.text);
    assert.deepEqual(voice.map((p) => p.payload.text), ['The storm rises.', 'I give it to you, traveller.']);
    const done = packets.find(doneAck('converse')).payload;
    assert.equal(done.ok, true, done.error);
    assert.equal(done.say, reply.say);
    assert.deepEqual(done.actions, reply.actions.slice(0, 2)); // 'none' dropped
    assert.deepEqual(done.action_results, ['entropy = 0.9', 'coherence = 0.1']);
    assert.ok(done.firstAudioSeconds < done.llm_seconds, `speech started (${done.firstAudioSeconds}s) before the LLM finished (${done.llm_seconds}s)`);
    assert.ok(Math.abs(bridge.ctx.state.entropy - 0.9) < 1e-9);
    assert.ok(Math.abs(bridge.ctx.state.coherence - 0.1) < 1e-9);
    // The model saw the realm's current state.
    assert.match(fake.requests[0].messages[1].content, /Current realm: ".+"/);
    assert.equal(fake.requests[0].format.properties.say.type, 'string');
  } finally {
    await bridge.close();
    fake.server.close();
  }
});

test('one utterance at a time; voice failures are reported', async () => {
  // Hold the failure until the second speak has been refused. A TTS that fails at
  // once can finish the first utterance before the second frame is read, and then
  // the second speak legitimately starts instead of being refused.
  let release;
  const refused = new Promise((r) => (release = r));
  const broken = async () => { await refused; throw new Error('Kokoro TTS is not installed'); };
  const bridge = await createBridge({ port: 0, log: quiet, evolveSeconds: 0, ttsFactory: broken });
  try {
    const packets = await session(bridge.port, [
      { type: 'command', name: 'speak', args: { text: 'Hello there.' } },
      { type: 'command', name: 'speak', args: { text: 'Second.' } },
    ], (p) => {
      if (p.type === 'ack' && p.payload.error === 'already speaking') release();
      return doneAck('speak')(p);
    });
    const acks = packets.filter((p) => p.type === 'ack').map((p) => p.payload.status ?? p.payload.error);
    assert.deepEqual(acks, ['started', 'already speaking', 'failed']);
    assert.match(packets.at(-1).payload.error, /not installed/);
  } finally {
    await bridge.close();
  }
});

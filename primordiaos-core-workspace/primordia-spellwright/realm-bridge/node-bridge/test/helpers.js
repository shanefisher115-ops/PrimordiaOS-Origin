// Shared test doubles: a fake Ollama (/api/chat NDJSON stream) and a fake TTS.
import http from 'node:http';
import WebSocket from 'ws';

/** Streams `reply` in 7-char chunks, `delayMs` apart, then a done line. */
export function fakeOllama(reply, { status = 200, error, delayMs = 0 } = {}) {
  const requests = [];
  const server = http.createServer((req, res) => {
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', async () => {
      requests.push(JSON.parse(body));
      res.writeHead(status, { 'Content-Type': 'application/x-ndjson' });
      if (error) return res.end(JSON.stringify({ error }) + '\n');
      const text = typeof reply === 'string' ? reply : JSON.stringify(reply);
      for (let i = 0; i < text.length; i += 7) {
        res.write(JSON.stringify({ message: { role: 'assistant', content: text.slice(i, i + 7) }, done: false }) + '\n');
        if (delayMs) await new Promise((r) => setTimeout(r, delayMs));
      }
      res.end(JSON.stringify({ done: true, done_reason: 'stop', eval_count: 61, eval_duration: 8.5e9, prompt_eval_count: 230, prompt_eval_duration: 1e9, load_duration: 0 }) + '\n');
    });
  });
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve({ server, requests, url: `http://127.0.0.1:${server.address().port}` })));
}

/** 10 ms of a 440 Hz tone per character, at 24 kHz. */
export const fakeTtsFactory = async () => ({
  voice: 'fake',
  sampleRate: 24000,
  listVoices: () => ['fake'],
  async synthesize(text) {
    const samples = new Float32Array(text.length * 240);
    for (let i = 0; i < samples.length; i++) samples[i] = 0.5 * Math.sin((2 * Math.PI * 440 * i) / 24000);
    return { samples, sampleRate: 24000 };
  },
});

/** Connects, sends `messages`, collects packets until `until(packet)` is true. */
export function session(port, messages, until, timeoutMs = 10000) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(`ws://127.0.0.1:${port}`);
    const packets = [];
    const timer = setTimeout(() => { ws.close(); reject(new Error('session timed out')); }, timeoutMs);
    ws.on('error', reject);
    ws.on('open', () => messages.forEach((m) => ws.send(JSON.stringify(m))));
    ws.on('message', (raw) => {
      const p = JSON.parse(raw);
      packets.push(p);
      if (until(p)) { clearTimeout(timer); ws.close(); resolve(packets); }
    });
  });
}

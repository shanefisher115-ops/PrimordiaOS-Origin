// Minimal streaming client for Ollama's /api/chat.
// Uses node:http rather than fetch: fetch gives up if response headers take
// longer than 300 s (a cold model load on a CPU-only machine can), while here
// the only timeout is inactivity, reset by every received chunk.
import http from 'node:http';
import https from 'node:https';

export const DEFAULT_OLLAMA_URL = 'http://127.0.0.1:11434';

/**
 * @returns {Promise<{ text: string, stats: { model: string, promptTokens: number, genTokens: number,
 *   tokensPerSecond: number, promptTokensPerSecond: number, loadSeconds: number, seconds: number } }>}
 */
export function chat({
  url = DEFAULT_OLLAMA_URL,
  model,
  messages,
  format,
  options = {},
  keepAlive = '15m',
  onToken,
  idleTimeoutMs = 300_000,
  signal,
}) {
  const body = JSON.stringify({ model, messages, format, options, stream: true, think: false, keep_alive: keepAlive });
  const target = new URL('/api/chat', url);
  const lib = target.protocol === 'https:' ? https : http;
  const started = Date.now();

  return new Promise((resolve, reject) => {
    const req = lib.request(target, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) } }, (res) => {
      let pending = Buffer.alloc(0);
      let text = '';
      let done = null;
      let error = null;
      res.on('data', (chunk) => {
        req.setTimeout(idleTimeoutMs); // any data is activity
        pending = Buffer.concat([pending, chunk]);
        let nl;
        // Split on raw newline bytes before decoding so multi-byte UTF-8 is never cut.
        while ((nl = pending.indexOf(0x0a)) >= 0) {
          const line = pending.subarray(0, nl).toString('utf8').trim();
          pending = pending.subarray(nl + 1);
          if (!line) continue;
          let obj;
          try { obj = JSON.parse(line); } catch { continue; }
          if (obj.error) { error = obj.error; continue; }
          const delta = obj.message?.content ?? '';
          if (delta) { text += delta; onToken?.(delta, text); }
          if (obj.done) done = obj;
        }
      });
      res.on('end', () => {
        if (error || res.statusCode !== 200) {
          const hint = String(error).includes('not found') ? ` (run: ollama pull ${model})` : '';
          return reject(new Error(`Ollama ${res.statusCode}: ${error ?? 'request failed'}${hint}`));
        }
        const ns = (v) => (v ?? 0) / 1e9;
        resolve({
          text,
          stats: {
            model,
            promptTokens: done?.prompt_eval_count ?? 0,
            genTokens: done?.eval_count ?? 0,
            tokensPerSecond: done?.eval_duration ? done.eval_count / ns(done.eval_duration) : 0,
            promptTokensPerSecond: done?.prompt_eval_duration ? done.prompt_eval_count / ns(done.prompt_eval_duration) : 0,
            loadSeconds: ns(done?.load_duration),
            seconds: (Date.now() - started) / 1000,
          },
        });
      });
      res.on('error', reject);
    });
    req.setTimeout(idleTimeoutMs, () => req.destroy(new Error(`Ollama sent nothing for ${idleTimeoutMs / 1000}s`)));
    req.on('error', (err) => {
      reject(err.code === 'ECONNREFUSED' ? new Error(`Cannot reach Ollama at ${url}. Is it running? (ollama serve)`) : err);
    });
    signal?.addEventListener('abort', () => req.destroy(new Error('cancelled')));
    req.end(body);
  });
}

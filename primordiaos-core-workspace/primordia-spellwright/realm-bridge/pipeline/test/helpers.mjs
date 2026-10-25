import { createHash, randomBytes } from 'node:crypto';
import { connect } from 'node:net';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

export const tempDir = (prefix = 'primordia-') => mkdtempSync(join(tmpdir(), prefix));

/** A raw WebSocket client (masked frames), so tests exercise our server without a library. */
export function wsConnect(port, path = '/events', headers = {}) {
  return new Promise((resolve, reject) => {
    const socket = connect(port, '127.0.0.1');
    const key = randomBytes(16).toString('base64');
    const messages = [];
    const waiters = [];
    let handshake = '';
    let buffer = Buffer.alloc(0);
    let open = false;

    const deliver = (text) => {
      const msg = JSON.parse(text);
      const i = waiters.findIndex((w) => w.pred(msg));
      if (i >= 0) waiters.splice(i, 1)[0].resolve(msg);
      else messages.push(msg);
    };
    const parse = () => {
      while (buffer.length >= 2) {
        let len = buffer[1] & 0x7f;
        let off = 2;
        if (len === 126) {
          if (buffer.length < 4) return;
          len = buffer.readUInt16BE(2);
          off = 4;
        } else if (len === 127) {
          if (buffer.length < 10) return;
          len = Number(buffer.readBigUInt64BE(2));
          off = 10;
        }
        if (buffer.length < off + len) return;
        const opcode = buffer[0] & 0x0f;
        const payload = buffer.subarray(off, off + len);
        buffer = buffer.subarray(off + len);
        if (opcode === 1) deliver(payload.toString('utf8'));
        if (opcode === 9) send(payload, 0xa);
      }
    };
    const send = (payload, opcode = 1) => {
      const data = Buffer.isBuffer(payload) ? payload : Buffer.from(payload);
      const mask = randomBytes(4);
      const header = data.length < 126 ? Buffer.from([0x80 | opcode, 0x80 | data.length]) : Buffer.from([0x80 | opcode, 0x80 | 126, data.length >> 8, data.length & 255]);
      const masked = Buffer.from(data.map((b, i) => b ^ mask[i & 3]));
      socket.write(Buffer.concat([header, mask, masked]));
    };

    socket.on('connect', () => {
      const extra = Object.entries(headers).map(([k, v]) => `${k}: ${v}\r\n`).join('');
      socket.write(`GET ${path} HTTP/1.1\r\nHost: 127.0.0.1\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Key: ${key}\r\nSec-WebSocket-Version: 13\r\n${extra}\r\n`);
    });
    socket.on('data', (chunk) => {
      if (!open) {
        handshake += chunk.toString('latin1');
        const end = handshake.indexOf('\r\n\r\n');
        if (end < 0) return;
        const status = handshake.split('\r\n')[0];
        if (!status.includes('101')) {
          socket.destroy();
          reject(new Error(status));
          return;
        }
        const expected = createHash('sha1').update(key + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11').digest('base64');
        if (!handshake.includes(`Sec-WebSocket-Accept: ${expected}`)) {
          reject(new Error('bad accept key'));
          return;
        }
        open = true;
        buffer = Buffer.from(chunk.toString('latin1').slice(end + 4 - (handshake.length - chunk.length)), 'latin1');
        resolve(client);
        parse();
        return;
      }
      buffer = Buffer.concat([buffer, chunk]);
      parse();
    });
    socket.on('error', reject);

    const client = {
      send: (obj) => send(JSON.stringify(obj)),
      /** Resolves with the first message (already received or future) matching pred. */
      waitFor(pred, timeoutMs = 5000) {
        const i = messages.findIndex(pred);
        if (i >= 0) return Promise.resolve(messages.splice(i, 1)[0]);
        return new Promise((res, rej) => {
          const w = { pred, resolve: res };
          waiters.push(w);
          setTimeout(() => {
            const k = waiters.indexOf(w);
            if (k >= 0) {
              waiters.splice(k, 1);
              rej(new Error('timed out waiting for a message'));
            }
          }, timeoutMs).unref();
        });
      },
      close: () => socket.destroy(),
    };
  });
}

export async function api(port, path, { method = 'GET', body, headers = {} } = {}) {
  const res = await fetch(`http://127.0.0.1:${port}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: res.status, body: await res.json() };
}

// Minimal RFC 6455 WebSocket server: handshake, text/binary/continuation frames, ping/pong, close.
// Enough for the Bolt event stream (server -> many clients, small JSON messages); no extensions.

import { createHash } from 'node:crypto';
import { EventEmitter } from 'node:events';

const GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';
const MAX_MESSAGE = 4 * 1024 * 1024;

export function acceptKey(key) {
  return createHash('sha1').update(key + GUID).digest('base64');
}

/** Encodes one unmasked server frame. */
export function encodeFrame(opcode, payload = Buffer.alloc(0)) {
  const len = payload.length;
  let header;
  if (len < 126) {
    header = Buffer.from([0x80 | opcode, len]);
  } else if (len < 65536) {
    header = Buffer.alloc(4);
    header[0] = 0x80 | opcode;
    header[1] = 126;
    header.writeUInt16BE(len, 2);
  } else {
    header = Buffer.alloc(10);
    header[0] = 0x80 | opcode;
    header[1] = 127;
    header.writeBigUInt64BE(BigInt(len), 2);
  }
  return Buffer.concat([header, payload]);
}

/**
 * Incremental frame parser. Feed it bytes; it returns complete frames
 * ({fin, opcode, payload}) and keeps any partial frame for the next call.
 */
export class FrameParser {
  constructor() {
    this.buffer = Buffer.alloc(0);
  }

  push(chunk) {
    this.buffer = this.buffer.length ? Buffer.concat([this.buffer, chunk]) : chunk;
    const frames = [];
    for (;;) {
      const b = this.buffer;
      if (b.length < 2) break;
      const fin = (b[0] & 0x80) !== 0;
      const opcode = b[0] & 0x0f;
      const masked = (b[1] & 0x80) !== 0;
      let len = b[1] & 0x7f;
      let offset = 2;
      if (len === 126) {
        if (b.length < 4) break;
        len = b.readUInt16BE(2);
        offset = 4;
      } else if (len === 127) {
        if (b.length < 10) break;
        const big = b.readBigUInt64BE(2);
        if (big > BigInt(MAX_MESSAGE)) throw new Error('frame too large');
        len = Number(big);
        offset = 10;
      }
      if (len > MAX_MESSAGE) throw new Error('frame too large');
      const maskLen = masked ? 4 : 0;
      if (b.length < offset + maskLen + len) break;
      let payload = b.subarray(offset + maskLen, offset + maskLen + len);
      if (masked) {
        const mask = b.subarray(offset, offset + 4);
        const out = Buffer.alloc(len);
        for (let i = 0; i < len; i++) out[i] = payload[i] ^ mask[i & 3];
        payload = out;
      } else {
        payload = Buffer.from(payload);
      }
      frames.push({ fin, opcode, masked, payload });
      this.buffer = b.subarray(offset + maskLen + len);
    }
    return frames;
  }
}

/** One accepted connection. Emits 'message' (string), 'close' (code, reason). */
export class WebSocketConnection extends EventEmitter {
  constructor(socket, request) {
    super();
    this.socket = socket;
    this.request = request;
    this.parser = new FrameParser();
    this.fragments = [];
    this.fragmentOpcode = 0;
    this.open = true;
    this.alive = true;
    this.topics = null; // null = everything

    socket.setNoDelay(true);
    socket.on('data', (chunk) => this.#onData(chunk));
    socket.on('close', () => this.#closed(1006, 'connection lost'));
    socket.on('error', () => this.#closed(1006, 'socket error'));
  }

  #onData(chunk) {
    let frames;
    try {
      frames = this.parser.push(chunk);
    } catch (err) {
      this.close(1009, err.message);
      return;
    }
    for (const f of frames) {
      if (!f.masked) {
        // RFC 6455 5.1: clients must mask.
        this.close(1002, 'client frames must be masked');
        return;
      }
      switch (f.opcode) {
        case 0x0: // continuation
        case 0x1: // text
        case 0x2: // binary
          if (f.opcode !== 0x0) this.fragmentOpcode = f.opcode;
          this.fragments.push(f.payload);
          if (f.fin) {
            const data = Buffer.concat(this.fragments);
            this.fragments = [];
            if (this.fragmentOpcode === 0x1) this.emit('message', data.toString('utf8'));
            else this.emit('binary', data);
          }
          break;
        case 0x8: { // close
          const code = f.payload.length >= 2 ? f.payload.readUInt16BE(0) : 1005;
          const reason = f.payload.length > 2 ? f.payload.subarray(2).toString('utf8') : '';
          this.close(code === 1005 ? 1000 : code, reason);
          break;
        }
        case 0x9: // ping
          this.#write(encodeFrame(0xa, f.payload));
          break;
        case 0xa: // pong
          this.alive = true;
          break;
        default:
          this.close(1003, 'unsupported opcode');
      }
    }
  }

  #write(buf) {
    if (this.open && !this.socket.destroyed) this.socket.write(buf);
  }

  send(text) {
    this.#write(encodeFrame(0x1, Buffer.from(String(text), 'utf8')));
  }

  ping() {
    this.#write(encodeFrame(0x9));
  }

  close(code = 1000, reason = '') {
    if (!this.open) return;
    const r = Buffer.from(String(reason).slice(0, 120), 'utf8');
    const payload = Buffer.alloc(2 + r.length);
    payload.writeUInt16BE(code, 0);
    r.copy(payload, 2);
    this.#write(encodeFrame(0x8, payload));
    this.socket.end();
    this.#closed(code, reason);
  }

  #closed(code, reason) {
    if (!this.open) return;
    this.open = false;
    this.emit('close', code, reason);
  }
}

/**
 * Attaches a WebSocket endpoint to an http.Server. `authorize(request)` may return false to refuse.
 * Returns an EventEmitter that emits 'connection' (WebSocketConnection) and offers broadcast().
 */
export function attachWebSocketServer(httpServer, { path = '/', authorize = () => true, heartbeatMs = 30000 } = {}) {
  const hub = new EventEmitter();
  hub.clients = new Set();

  httpServer.on('upgrade', (request, socket) => {
    socket.on('error', () => socket.destroy());
    let url;
    try {
      const p = String(request.url || '/');
      url = new URL(`http://localhost${p.startsWith('/') ? p : `/${p}`}`);
    } catch {
      socket.end('HTTP/1.1 400 Bad Request\r\nConnection: close\r\n\r\n');
      return;
    }
    const key = request.headers['sec-websocket-key'];
    const upgrade = (request.headers.upgrade || '').toLowerCase();
    if (upgrade !== 'websocket' || !key || (path !== '*' && url.pathname !== path)) {
      socket.end('HTTP/1.1 400 Bad Request\r\nConnection: close\r\n\r\n');
      return;
    }
    if (!authorize(request)) {
      socket.end('HTTP/1.1 401 Unauthorized\r\nConnection: close\r\n\r\n');
      return;
    }
    socket.write(
      'HTTP/1.1 101 Switching Protocols\r\n' +
        'Upgrade: websocket\r\n' +
        'Connection: Upgrade\r\n' +
        `Sec-WebSocket-Accept: ${acceptKey(key)}\r\n\r\n`,
    );
    const conn = new WebSocketConnection(socket, request);
    hub.clients.add(conn);
    conn.on('close', () => hub.clients.delete(conn));
    hub.emit('connection', conn);
  });

  const beat = setInterval(() => {
    for (const c of hub.clients) {
      if (!c.alive) {
        c.close(1001, 'no pong');
        continue;
      }
      c.alive = false;
      c.ping();
    }
  }, heartbeatMs);
  beat.unref();

  hub.broadcast = (message, topic) => {
    const text = typeof message === 'string' ? message : JSON.stringify(message);
    for (const c of hub.clients) {
      if (!topic || !c.topics || c.topics.has(topic)) c.send(text);
    }
  };
  hub.close = () => {
    clearInterval(beat);
    for (const c of hub.clients) c.close(1001, 'server shutting down');
  };
  return hub;
}

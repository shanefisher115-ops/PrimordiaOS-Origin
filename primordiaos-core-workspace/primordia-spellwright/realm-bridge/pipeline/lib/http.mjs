// Tiny JSON HTTP helpers shared by the Bolt and Autobuilder servers.

export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export function sendJson(res, status, body) {
  const text = JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(text),
    'Cache-Control': 'no-store',
  });
  res.end(text);
}

export function readJson(req, limit = 8 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (c) => {
      size += c.length;
      if (size > limit) {
        reject(new HttpError(413, `body larger than ${limit} bytes`));
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on('end', () => {
      if (size === 0) return resolve({});
      try {
        const value = JSON.parse(Buffer.concat(chunks).toString('utf8'));
        if (value === null || typeof value !== 'object' || Array.isArray(value)) {
          reject(new HttpError(400, 'body must be a JSON object'));
        } else {
          resolve(value);
        }
      } catch (err) {
        reject(new HttpError(400, `invalid JSON: ${err.message}`));
      }
    });
    req.on('error', reject);
  });
}

/**
 * Route table: [[method, /pattern/:param, handler(req, res, params, url)]]. Handlers may return a
 * value (sent as 200 JSON) or throw HttpError.
 */
export function createRouter(routes, { authorize = () => true, log = () => {} } = {}) {
  const compiled = routes.map(([method, pattern, handler]) => {
    const names = [];
    const re = new RegExp(
      '^' + pattern.replace(/\/:([a-zA-Z_]+)/g, (_, n) => (names.push(n), '/([^/]+)')) + '$',
    );
    return { method, re, names, handler };
  });
  return async (req, res) => {
    // Paths like "//" are protocol-relative to new URL(path, base); prefixing the origin never throws on them.
    let url;
    try {
      url = parseRequestUrl(req.url);
    } catch {
      sendJson(res, 400, { error: `bad request path ${JSON.stringify(req.url)}` });
      return;
    }
    try {
      if (!authorize(req)) throw new HttpError(401, 'unauthorized');
      let pathMatched = false;
      for (const r of compiled) {
        const m = url.pathname.match(r.re);
        if (!m) continue;
        pathMatched = true;
        if (r.method !== req.method) continue;
        const params = Object.fromEntries(r.names.map((n, i) => [n, decodeURIComponent(m[i + 1])]));
        const result = await r.handler(req, res, params, url);
        // Handlers may set res.statusCode (201, 202...) before returning their body.
        if (!res.headersSent && result !== undefined) sendJson(res, res.statusCode || 200, result);
        return;
      }
      throw new HttpError(pathMatched ? 405 : 404, pathMatched ? 'method not allowed' : `no route for ${url.pathname}`);
    } catch (err) {
      const status = err instanceof HttpError ? err.status : 500;
      if (status >= 500) log(`error ${req.method} ${url.pathname}: ${err.stack || err}`);
      if (!res.headersSent) sendJson(res, status, { error: err.message });
    }
  };
}

/** A request target as a URL. Throws on garbage; never misreads "//x" as a host. */
export function parseRequestUrl(path) {
  const p = String(path || '/');
  return new URL(`http://localhost${p.startsWith('/') ? p : `/${p}`}`);
}

/** Matches "cadcam.*", "blender.render", "*" (case-insensitive). */
export function wildcardMatch(pattern, text) {
  const re = new RegExp(
    '^' + String(pattern).split('*').map((s) => s.replace(/[.+?^${}()|[\]\\]/g, '\\$&')).join('.*') + '$',
    'i',
  );
  return re.test(text);
}

export async function fetchJson(url, { method = 'GET', body, headers = {}, timeoutMs = 10000 } = {}) {
  const res = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json', ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(timeoutMs),
  });
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text };
  }
  return { status: res.status, ok: res.ok, json };
}

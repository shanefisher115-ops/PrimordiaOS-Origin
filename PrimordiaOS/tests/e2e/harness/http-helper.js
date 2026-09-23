import http from "node:http";
import https from "node:https";

/**
 * Robust HTTP client helper for E2E tests without external dependencies.
 */
export async function httpRequest(url, options = {}) {
  const parsed = new URL(url);
  const isHttps = parsed.protocol === "https:";
  const client = isHttps ? https : http;

  const method = (options.method || "GET").toUpperCase();
  const headers = options.headers || {};
  let body = options.body;

  if (body && typeof body === "object" && !Buffer.isBuffer(body) && !(body instanceof Uint8Array)) {
    body = JSON.stringify(body);
    if (!headers["Content-Type"]) {
      headers["Content-Type"] = "application/json";
    }
  }

  if (body) {
    headers["Content-Length"] = Buffer.byteLength(body);
  }

  const reqOptions = {
    hostname: parsed.hostname,
    port: parsed.port || (isHttps ? 443 : 80),
    path: parsed.pathname + parsed.search,
    method,
    headers,
    timeout: options.timeout || 10000
  };

  return new Promise((resolve, reject) => {
    const req = client.request(reqOptions, (res) => {
      const chunks = [];
      res.on("data", (chunk) => chunks.push(chunk));
      res.on("end", () => {
        const rawBody = Buffer.concat(chunks).toString("utf8");
        let json = null;
        try {
          json = JSON.parse(rawBody);
        } catch {
          // not JSON
        }
        resolve({
          status: res.statusCode,
          headers: res.headers,
          body: rawBody,
          json
        });
      });
    });

    req.on("error", (err) => reject(err));
    req.on("timeout", () => {
      req.destroy();
      reject(new Error(`Request to ${url} timed out after ${reqOptions.timeout}ms`));
    });

    if (body) {
      req.write(body);
    }
    req.end();
  });
}

export async function get(url, options = {}) {
  return httpRequest(url, { ...options, method: "GET" });
}

export async function post(url, body, options = {}) {
  return httpRequest(url, { ...options, method: "POST", body });
}

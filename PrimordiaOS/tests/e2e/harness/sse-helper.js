import http from "node:http";

/**
 * SSE Helper to connect to an SSE endpoint, collect events, and support timeout or event count limits.
 */
export class SseClient {
  constructor(url) {
    this.url = url;
    this.events = [];
    this.rawLines = [];
    this.req = null;
    this.connected = false;
    this.closed = false;
  }

  connect() {
    const parsed = new URL(this.url);
    return new Promise((resolve, reject) => {
      const options = {
        hostname: parsed.hostname,
        port: parsed.port || 80,
        path: parsed.pathname + parsed.search,
        method: "GET",
        headers: {
          Accept: "text/event-stream",
          "Cache-Control": "no-cache"
        }
      };

      this.req = http.request(options, (res) => {
        if (res.statusCode !== 200) {
          reject(new Error(`SSE connection failed with status code ${res.statusCode}`));
          return;
        }

        const contentType = res.headers["content-type"] || "";
        if (!contentType.includes("text/event-stream")) {
          reject(new Error(`Invalid content-type for SSE: ${contentType}`));
          return;
        }

        this.connected = true;
        resolve({
          statusCode: res.statusCode,
          headers: res.headers
        });

        let buffer = "";
        res.on("data", (chunk) => {
          buffer += chunk.toString("utf8");
          const lines = buffer.split("\n");
          buffer = lines.pop(); // keep remainder

          for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.length > 0) {
              this.rawLines.push(trimmed);
            }
            if (trimmed.startsWith("data:")) {
              const payload = trimmed.slice(5).trim();
              try {
                const parsedData = JSON.parse(payload);
                this.events.push(parsedData);
              } catch {
                this.events.push({ raw: payload });
              }
            }
          }
        });

        res.on("end", () => {
          this.connected = false;
          this.closed = true;
        });
      });

      this.req.on("error", (err) => {
        this.connected = false;
        if (!this.closed) reject(err);
      });

      this.req.end();
    });
  }

  async waitForEvents(count, timeoutMs = 5000) {
    const startTime = Date.now();
    while (this.events.length < count) {
      if (Date.now() - startTime > timeoutMs) {
        throw new Error(`Timeout waiting for ${count} SSE events (Received ${this.events.length} in ${timeoutMs}ms)`);
      }
      await new Promise((r) => setTimeout(r, 50));
    }
    return this.events.slice(0, count);
  }

  async waitForEventType(type, timeoutMs = 5000) {
    const startTime = Date.now();
    while (true) {
      const match = this.events.find((e) => e.type === type);
      if (match) return match;
      if (Date.now() - startTime > timeoutMs) {
        throw new Error(`Timeout waiting for SSE event type "${type}" (Received ${this.events.length} events)`);
      }
      await new Promise((r) => setTimeout(r, 50));
    }
  }

  close() {
    this.closed = true;
    this.connected = false;
    if (this.req) {
      this.req.destroy();
    }
  }
}

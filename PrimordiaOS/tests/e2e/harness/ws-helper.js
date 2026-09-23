import WebSocket from "ws";

/**
 * WebSocket test client helper for Port 17800 simulation bridge testing.
 */
export class WsTestClient {
  constructor(url = "ws://localhost:17800") {
    this.url = url;
    this.ws = null;
    this.messages = [];
    this.connected = false;
    this.closed = false;
  }

  connect(timeoutMs = 5000) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        if (!this.connected) {
          if (this.ws) this.ws.terminate();
          reject(new Error(`WebSocket connection to ${this.url} timed out after ${timeoutMs}ms`));
        }
      }, timeoutMs);

      try {
        this.ws = new WebSocket(this.url);

        this.ws.on("open", () => {
          clearTimeout(timer);
          this.connected = true;
          resolve();
        });

        this.ws.on("message", (data) => {
          try {
            const parsed = JSON.parse(data.toString("utf8"));
            this.messages.push(parsed);
          } catch {
            this.messages.push({ raw: data.toString("utf8") });
          }
        });

        this.ws.on("error", (err) => {
          clearTimeout(timer);
          if (!this.connected) reject(err);
        });

        this.ws.on("close", () => {
          this.connected = false;
          this.closed = true;
        });
      } catch (err) {
        clearTimeout(timer);
        reject(err);
      }
    });
  }

  send(data) {
    if (!this.connected || !this.ws) {
      throw new Error("Cannot send on closed WebSocket");
    }
    const payload = typeof data === "string" ? data : JSON.stringify(data);
    this.ws.send(payload);
  }

  async waitForMessage(predicate, timeoutMs = 5000) {
    const startTime = Date.now();
    while (true) {
      for (let i = 0; i < this.messages.length; i++) {
        const msg = this.messages[i];
        if (typeof predicate === "string" && msg.type === predicate) {
          return msg;
        }
        if (typeof predicate === "function" && predicate(msg)) {
          return msg;
        }
      }
      if (Date.now() - startTime > timeoutMs) {
        throw new Error(`Timeout waiting for WebSocket message matching predicate (Received ${this.messages.length} messages)`);
      }
      await new Promise((r) => setTimeout(r, 50));
    }
  }

  close() {
    this.closed = true;
    this.connected = false;
    if (this.ws) {
      this.ws.terminate();
    }
  }
}

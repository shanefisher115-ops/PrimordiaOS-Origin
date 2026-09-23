import WebSocket from "ws";
import { buildMessage, UnrealTelemetry } from "./unrealCommands";

interface UnrealConfig {
  enabled: boolean;
  wsUrl: string;
  telemetryEnabled?: boolean;
}

type TelemetryHandler = (t: UnrealTelemetry) => void;

export class UnrealBridge {
  private config: UnrealConfig;
  private ws?: WebSocket;
  private telemetryHandler?: TelemetryHandler;

  constructor(config: UnrealConfig) {
    this.config = config;
    if (this.config.enabled) {
      this.connect();
    }
  }

  private connect() {
    console.log("[UnrealBridge] Connecting to Unreal at", this.config.wsUrl);
    this.ws = new WebSocket(this.config.wsUrl);
    this.ws.on("open", () => console.log("[UnrealBridge] Connected."));
    this.ws.on("error", (err) => console.error("[UnrealBridge] Error:", err));
    this.ws.on("close", () => console.log("[UnrealBridge] Disconnected."));
    this.ws.on("message", (data) => this.handleMessage(data.toString()));
  }

  private handleMessage(raw: string) {
    if (!this.config.telemetryEnabled) return;
    try {
      const parsed = JSON.parse(raw);
      if (parsed.type === "primordia_telemetry") {
        this.telemetryHandler && this.telemetryHandler(parsed as UnrealTelemetry);
      }
    } catch (e) {
      console.error("[UnrealBridge] Failed to parse telemetry:", e);
    }
  }

  onTelemetry(handler: TelemetryHandler) {
    this.telemetryHandler = handler;
  }

  private send(command: ReturnType<typeof buildMessage>) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    this.ws.send(JSON.stringify(command));
  }

  sendReactorPulse(intensity: number, energy: number, state: string) {
    this.send(buildMessage("reactor_pulse", { intensity, energy, state }));
  }

  sendAscensionBegin() {
    this.send(buildMessage("ascension_begin", {}));
  }

  sendAscensionEnd() {
    this.send(buildMessage("ascension_end", {}));
  }
}

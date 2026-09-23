export type PrimordiaCommand =
  | "reactor_pulse"
  | "reactor_overload"
  | "reactor_dim"
  | "ascension_begin"
  | "ascension_end";

export interface CommandPayload {
  intensity?: number;
  energy?: number;
  state?: string;
}

export interface PrimordiaMessage {
  type: "primordia_command";
  source: "PrimordiaOS";
  realm: "LIVE_CHAMBER";
  command: PrimordiaCommand;
  payload: CommandPayload;
  timestamp: number;
}

export function buildMessage(
  command: PrimordiaCommand,
  payload: CommandPayload = {}
): PrimordiaMessage {
  return {
    type: "primordia_command",
    source: "PrimordiaOS",
    realm: "LIVE_CHAMBER",
    command,
    payload,
    timestamp: Date.now()
  };
}

export interface UnrealTelemetry {
  type: "primordia_telemetry";
  source: "UnrealChamber";
  realm: "LIVE_CHAMBER";
  metrics: {
    reactor_charge: number;
    glyph_stability: number;
    storm_intensity: number;
  };
  timestamp: number;
}

export type CommEvent =
  | { type: "MESSAGE_SENT"; from: string; to: string; sizeKB: number; timestamp: number }
  | { type: "BROADCAST"; from: string; channel: string; timestamp: number }
  | { type: "RPC_CALL"; from: string; to: string; method: string; timestamp: number }
  | { type: "SHARED_MEMORY_UPDATE"; key: string; timestamp: number };

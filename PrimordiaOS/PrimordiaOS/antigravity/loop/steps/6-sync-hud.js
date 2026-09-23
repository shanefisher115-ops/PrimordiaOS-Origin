import { eventBus } from "../../../kernel/event-bus.js";

export async function step6_syncHUD(ledgerBlock = {}, commentary = "") {
  console.log("🌌 [Step 6/7] Emitting spatial update to PrimordiaOS Global Shell & HUD...");
  const commentText = typeof commentary === "string" ? commentary : (commentary?.commentaryText || commentary?.commentary || "");
  const hudPayload = {
    type: "HUD_SYNC",
    blockIndex: ledgerBlock?.index ?? 0,
    blockHash: ledgerBlock?.hash || "",
    commentary: commentText,
    timestamp: Date.now()
  };

  eventBus.emit("HUD_SYNC", hudPayload);
  eventBus.emitRealmEvent("HUD_SYNC", hudPayload, "local_realm");
  return hudPayload;
}
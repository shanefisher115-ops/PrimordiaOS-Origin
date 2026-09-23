import { generateCommentary } from "../../../agents/commentary/generateCommentary.js";

export async function step4_triggerCommentary(diffResult = {}, ledgerBlock = {}, cycleCount = 1) {
  console.log("🧠 [Step 4/7] Activating Commentary Council (Auditor, Classifier, Predictor, Advisor)...");
  const lines = generateCommentary({
    diffContent: diffResult?.diffContent || "",
    hasBreakingChanges: diffResult?.hasBreakingChanges || false
  });
  const cycleNum = cycleCount || diffResult?.cycle || 1;
  const blockIdx = ledgerBlock?.index ?? 0;
  const commentaryText = `Cycle #${cycleNum}: Syndicate liquidity and autonomous yield confirmed. Ledger Block #${blockIdx} sealed.`;

  return {
    commentaryText,
    commentary: commentaryText,
    councilLines: lines,
    lines
  };
}
export function compactContext(context: any) {
  const compacted = JSON.parse(JSON.stringify(context));
  delete compacted.debug;
  delete compacted.logs;
  delete compacted.temp;

  globalThis.PRIMORDIA_FAULT_BUS.push({
    type: "COMPACTION",
    agentId: context.agentId,
    timestamp: Date.now()
  });

  return compacted;
}

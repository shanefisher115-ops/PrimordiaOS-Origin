const sharedMemory: Record<string, any> = {};

export function setShared(key: string, value: any) {
  sharedMemory[key] = value;

  globalThis.PRIMORDIA_COMM_BUS.push({
    type: "SHARED_MEMORY_UPDATE",
    key,
    timestamp: Date.now()
  });
}

export function getShared(key: string) {
  return sharedMemory[key];
}

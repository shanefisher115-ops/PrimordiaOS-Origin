export const FaultRegistry = {
  bus: [] as any[],
  listeners: [] as ((event: any) => void)[],

  emit(event: any) {
    this.bus.push(event);
    this.listeners.forEach(fn => fn(event));
  },

  on(fn: (event: any) => void) {
    this.listeners.push(fn);
  }
};

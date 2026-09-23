type RealmName = "live" | "monetization" | "amo" | "analytics";
type RealmFn = () => void | Promise<void>;

interface KernelConfig {
  realms: Record<string, boolean>;
}

export class PrimordiaKernel {
  private realms = new Map<RealmName, RealmFn>();
  private running = false;
  private config: KernelConfig;
  private tickCount = 0;

  constructor(config: KernelConfig) {
    this.config = config;
  }

  registerRealm(name: RealmName, fn: RealmFn) {
    if (!this.config.realms[name]) return;
    this.realms.set(name, fn);
    console.log(`[Kernel] Registered realm: ${name}`);
  }

  async start() {
    this.running = true;
    console.log("[Kernel] Starting realms loop (10 Hz)...");
    this.loop();
  }

  private async loop() {
    while (this.running) {
      const start = Date.now();
      this.tickCount++;

      for (const [name, fn] of this.realms.entries()) {
        try {
          await fn();
        } catch (err) {
          console.error(`[Kernel] Error in realm ${name}:`, err);
        }
      }

      const elapsed = Date.now() - start;
      const targetFrameMs = 1000 / 10;
      const sleep = Math.max(0, targetFrameMs - elapsed);
      await new Promise((res) => setTimeout(res, sleep));
    }
  }

  getTickCount() {
    return this.tickCount;
  }
}

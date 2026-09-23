import { emitSignal } from "../core/signals";

export interface UbuntuProcess {
  id: string;
  name: string;
  cpu: number;
  mem: number;
  state: "running" | "sleeping" | "zombie";
}

export class UbuntuRealm {
  processes: UbuntuProcess[] = [];

  constructor() {
    this.spawn("init");
  }

  spawn(name: string) {
    const proc: UbuntuProcess = {
      id: `proc_${Date.now()}`,
      name,
      cpu: Math.random() * 5,
      mem: Math.random() * 10,
      state: "running"
    };

    this.processes.push(proc);

    emitSignal("ubuntu.spawn", proc);
    return proc;
  }

  tick(depth: number, revenue: number) {
    // CPU + MEM pressure influenced by organism revenue
    this.processes = this.processes.map(p => ({
      ...p,
      cpu: p.cpu + revenue * 0.05,
      mem: p.mem + depth * 0.03,
      state: Math.random() > 0.95 ? "sleeping" : "running"
    }));

    emitSignal("ubuntu.tick", {
      depth,
      revenue,
      processes: this.processes
    });
  }
}

export const ubuntuRealm = new UbuntuRealm();

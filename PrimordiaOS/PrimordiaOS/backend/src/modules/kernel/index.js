// modules/kernel/index.js
// PrimordiaOS Kernel Module

let kernelState = {
  running: false,
  started_at: null
};

export function start() {
  if (kernelState.running) {
    console.log("Kernel already running.");
    return;
  }

  kernelState.running = true;
  kernelState.started_at = new Date().toISOString();

  console.log("PrimordiaOS Kernel STARTED.");
  console.log(`  started_at: ${kernelState.started_at}`);
}

export function stop() {
  if (!kernelState.running) {
    console.log("Kernel is not running.");
    return;
  }

  kernelState.running = false;

  console.log("PrimordiaOS Kernel STOPPED.");
}

export function status() {
  console.log("PrimordiaOS Kernel STATUS:");
  console.log(`  running: ${kernelState.running}`);
  console.log(`  started_at: ${kernelState.started_at}`);
}

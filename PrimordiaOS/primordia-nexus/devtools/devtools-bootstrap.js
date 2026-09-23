// devtools/devtools-bootstrap.ts
// PrimordiaOS Developer Tools Bootstrap — full implementation
// Starts debug console, inspector, hot reload, and dev telemetry
import { debugConsole } from "./debug-console";
import { hotReload } from "./hot-reload";
import { devTelemetry } from "./dev-telemetry";
export async function startDevTools() {
    console.log("[DevTools] Starting developer tools…");
    debugConsole.start();
    devTelemetry.start();
    // Watch core directories for hot reload
    hotReload.watch("primordia-core");
    hotReload.watch("primordia-nexus");
    console.log("[DevTools] Developer tools active.");
}
export async function stopDevTools() {
    console.log("[DevTools] Stopping developer tools…");
    debugConsole.stop();
    hotReload.stop();
    console.log("[DevTools] Developer tools stopped.");
}

import { PrimordiaCoreRuntime } from "../core/runtime/core-runtime.js";
const core = new PrimordiaCoreRuntime();
export async function bootstrap() {
    await core.start();
    console.log("[PrimordiaOS] Core booted and ready.");
}
bootstrap().catch(err => {
    console.error("[PrimordiaOS] Boot error:", err);
});

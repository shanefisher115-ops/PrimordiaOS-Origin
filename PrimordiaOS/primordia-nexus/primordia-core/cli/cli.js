// cli/cli.ts
// PrimordiaOS CLI Entrypoint — full implementation
import { startCommand } from "./commands/start";
import { stopCommand } from "./commands/stop";
import { restartCommand } from "./commands/restart";
import { statusCommand } from "./commands/status";
import { emitCommand } from "./commands/emit";
const args = process.argv.slice(2);
const command = args[0];
async function main() {
    switch (command) {
        case "start":
            await startCommand();
            break;
        case "stop":
            await stopCommand();
            break;
        case "restart":
            await restartCommand();
            break;
        case "status":
            await statusCommand();
            break;
        case "emit":
            await emitCommand(args.slice(1));
            break;
        default:
            console.log("PrimordiaOS CLI");
            console.log("Usage:");
            console.log("  primordia start");
            console.log("  primordia stop");
            console.log("  primordia restart");
            console.log("  primordia status");
            console.log("  primordia emit <topic> <json>");
    }
}
main().catch((err) => {
    console.error("[CLI] Fatal error:", err);
});

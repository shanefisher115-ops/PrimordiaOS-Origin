import { Kernel } from "../kernel/src/primordia.kernel";
import { executeRituals } from "../kernel/rituals/ritual_runner";
import { generateScaffold } from "../kernel/rituals/ritual_6_scaffolding";
export async function runCLI() {
    const args = process.argv.slice(2);
    const verb = args[0];
    if (!verb) {
        console.log("=========================================");
        console.log("         PrimordiaOS CLI v1.0");
        console.log("=========================================");
        console.log("Usage:");
        console.log("  npx ts-node cli/primordia.ts ritual <1-7|all>");
        console.log("  npx ts-node cli/primordia.ts gen <type> <name>");
        console.log("  npx ts-node cli/primordia.ts state");
        console.log("=========================================");
        return;
    }
    if (verb === "ritual") {
        const ritualNum = args[1] || "all";
        await executeRituals(ritualNum);
    }
    else if (verb === "gen") {
        const type = args[1];
        const name = args[2];
        if (!type || !name) {
            console.log("Usage: primordia gen <type> <name>");
            return;
        }
        await generateScaffold(type, name);
    }
    else {
        const res = await Kernel.command({ verb, args: args.slice(1) });
        console.log(res);
    }
}
if (typeof require !== 'undefined' && require.main === module) {
    runCLI();
}
else {
    runCLI();
}

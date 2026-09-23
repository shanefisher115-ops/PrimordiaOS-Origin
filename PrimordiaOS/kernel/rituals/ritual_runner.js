"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.executeRituals = executeRituals;
const ritual_1_canonicalization_1 = require("./ritual_1_canonicalization");
const ritual_2_resurrection_1 = require("./ritual_2_resurrection");
const ritual_3_unreal_descriptor_1 = require("./ritual_3_unreal_descriptor");
const ritual_4_module_scan_1 = require("./ritual_4_module_scan");
const ritual_5_purge_rebuild_1 = require("./ritual_5_purge_rebuild");
const ritual_6_scaffolding_1 = require("./ritual_6_scaffolding");
const ritual_7_kernel_sync_1 = require("./ritual_7_kernel_sync");
async function executeRituals(selection = "all") {
    console.log("=======================================================");
    console.log("   PRIMORDIAOS KERNEL RITUALS v1 EXECUTOR");
    console.log("=======================================================");
    const target = selection.toLowerCase();
    if (target === "1" || target === "all") {
        console.log("\n>>> Executing Ritual 1: Path Canonicalization...");
        const res = await (0, ritual_1_canonicalization_1.executeRitual1)();
        res.log.forEach(l => console.log("  ", l));
    }
    if (target === "2" || target === "all") {
        console.log("\n>>> Executing Ritual 2: Missing File Resurrection...");
        const res = await (0, ritual_2_resurrection_1.executeRitual2)();
        res.log.forEach(l => console.log("  ", l));
    }
    if (target === "3" || target === "all") {
        console.log("\n>>> Executing Ritual 3: Unreal Descriptor Regeneration...");
        const res = await (0, ritual_3_unreal_descriptor_1.executeRitual3)();
        res.log.forEach(l => console.log("  ", l));
    }
    if (target === "4" || target === "all") {
        console.log("\n>>> Executing Ritual 4: Module Integrity Scan...");
        const res = await (0, ritual_4_module_scan_1.executeRitual4)();
        res.log.forEach(l => console.log("  ", l));
    }
    if (target === "5" || target === "all") {
        console.log("\n>>> Executing Ritual 5: Purge and Rebuild...");
        const res = await (0, ritual_5_purge_rebuild_1.executeRitual5)();
        res.log.forEach(l => console.log("  ", l));
    }
    if (target === "6" || target === "all") {
        console.log("\n>>> Executing Ritual 6: Scaffolding Invocation...");
        const res = await (0, ritual_6_scaffolding_1.executeRitual6)();
        res.log.forEach(l => console.log("  ", l));
    }
    if (target === "7" || target === "all") {
        console.log("\n>>> Executing Ritual 7: Kernel Sync...");
        const res = await (0, ritual_7_kernel_sync_1.executeRitual7)();
        res.log.forEach(l => console.log("  ", l));
    }
    console.log("\n=======================================================");
    console.log("   ALL SELECTED RITUALS EXECUTED SUCCESSFULLY");
    console.log("=======================================================");
}
if (typeof require !== 'undefined' && require.main === module) {
    const selection = process.argv[2] || "all";
    executeRituals(selection);
}
else {
    const selection = process.argv[2] || "all";
    executeRituals(selection);
}

#!/usr/bin/env node
// Primordia-cad gothic kernel CLI. Needs Node >= 22.18 (runs the TypeScript sources directly).
//   node gothic.mjs spire --height 40 --sides 8 --out spire.glb
//   node gothic.mjs kit --out kit
import { main } from "./kernel/cli.ts";

try {
    process.exitCode = main(process.argv.slice(2));
} catch (err) {
    console.error(`gothic: ${err instanceof Error ? err.message : err}`);
    process.exitCode = 1;
}

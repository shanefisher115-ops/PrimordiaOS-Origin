import { execSync } from "child_process";

const UAT = `"C:/Program Files/Epic Games/UE_5.8/Engine/Build/BatchFiles/RunUAT.bat"`;
const PROJECT = `"C:/Users/Shane/PrimordiaWorldProject/PrimordiaWorld.uproject"`;

// UE 5.8: BuildProject was removed.
// Use BuildCookRun only.

execSync(`${UAT} BuildCookRun -project=${PROJECT} -platform=Win64 -clientconfig=Development -cook -stage -pak -archive`, {
    stdio: "inherit"
});

console.log("PrimordiaOS UAT: Build + Cook + Package complete.");

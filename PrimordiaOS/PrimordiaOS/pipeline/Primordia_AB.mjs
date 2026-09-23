import fs from "fs";
import path from "path";

const RUNTIME_ROOT = "C:/Users/Shane/PrimordiaWorldProject/Source/PrimordiaWorld";

const MODULE = `
#include "PrimordiaRuntime.h"
#include "Modules/ModuleManager.h"

void FPrimordiaRuntime::StartupModule() {
    UE_LOG(LogTemp, Warning, TEXT("Primordia Runtime Initialized"));
}

void FPrimordiaRuntime::ShutdownModule() {}
`;

fs.writeFileSync(path.join(RUNTIME_ROOT, "PrimordiaRuntime.cpp"), MODULE);

console.log("PrimordiaOS AB: Runtime systems installed.");

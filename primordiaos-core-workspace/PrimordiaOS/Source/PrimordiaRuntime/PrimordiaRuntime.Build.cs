using UnrealBuildTool;

public class PrimordiaRuntime : ModuleRules {
    public PrimordiaRuntime(ReadOnlyTargetRules Target) : base(Target) {
        PCHUsage = PCHUsageMode.UseExplicitOrSharedPCHs;
        PublicDependencyModuleNames.AddRange(new string[] {
            \"Core\", \"CoreUObject\", \"Engine\", \"Niagara\"
        });
    }
}
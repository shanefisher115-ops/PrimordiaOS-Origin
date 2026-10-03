using UnrealBuildTool;

public class PrimordiaEditor : ModuleRules {
    public PrimordiaEditor(ReadOnlyTargetRules Target) : base(Target) {
        PCHUsage = PCHUsageMode.UseExplicitOrSharedPCHs;
        PublicDependencyModuleNames.AddRange(new string[] {
            \"Core\", \"CoreUObject\", \"Engine\", \"UnrealEd\", \"Slate\", \"SlateCore\", \"LevelEditor\"
        });
        PrivateDependencyModuleNames.AddRange(new string[] {
            \"PrimordiaRuntime\"
        });
    }
}
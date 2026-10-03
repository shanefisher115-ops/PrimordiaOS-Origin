using UnrealBuildTool;

public class PrimordiaSceneImporter : ModuleRules
{
    public PrimordiaSceneImporter(ReadOnlyTargetRules Target) : base(Target)
    {
        PCHUsage = PCHUsageMode.UseExplicitOrSharedPCHs;

        PublicDependencyModuleNames.AddRange(
            new string[] {
                "Core",
                "CoreUObject",
                "Engine",
                "UnrealEd",
                "EditorSubsystem",
                "Projects",
                "AssetTools"
            }
        );
    }
}

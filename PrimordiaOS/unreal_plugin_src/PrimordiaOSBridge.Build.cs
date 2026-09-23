using UnrealBuildTool;

public class PrimordiaOSBridge : ModuleRules
{
    public PrimordiaOSBridge(ReadOnlyTargetRules Target) : base(Target)
    {
        PCHUsage = PCHUsageMode.UseExplicitOrSharedPCHs;

        PublicDependencyModuleNames.AddRange(
            new string[] { "Core", "CoreUObject", "Engine" }
        );

        PrivateDependencyModuleNames.AddRange(
            new string[] { "WebSockets", "Json", "JsonUtilities" }
        );
    }
}

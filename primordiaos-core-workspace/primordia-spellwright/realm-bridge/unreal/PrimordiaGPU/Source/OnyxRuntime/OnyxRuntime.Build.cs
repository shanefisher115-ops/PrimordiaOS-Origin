using UnrealBuildTool;

// Onyx: GPU telemetry and realm introspection for PrimordiaOS. Loads at PostConfigInit because
// MCPComputeBridge (which must load then, to register its global shaders) depends on it.
public class OnyxRuntime : ModuleRules
{
	public OnyxRuntime(ReadOnlyTargetRules Target) : base(Target)
	{
		PCHUsage = PCHUsageMode.UseExplicitOrSharedPCHs;
		CppStandard = CppStandardVersion.Cpp20;

		PublicDependencyModuleNames.AddRange(new string[]
		{
			"Core",
			"CoreUObject",
			"Engine",
			"RenderCore",
			"RHI",
			"Json",
		});
	}
}

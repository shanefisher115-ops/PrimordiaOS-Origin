using UnrealBuildTool;

// PrimordiaOS realm-bridge bindings for the GPU pipeline: manifests from the realm bridge into
// MCP, Onyx telemetry from Unreal back to PrimordiaOS.
public class PrimordiaRealmGPU : ModuleRules
{
	public PrimordiaRealmGPU(ReadOnlyTargetRules Target) : base(Target)
	{
		PCHUsage = PCHUsageMode.UseExplicitOrSharedPCHs;
		CppStandard = CppStandardVersion.Cpp20;

		PublicDependencyModuleNames.AddRange(new string[]
		{
			"Core",
			"CoreUObject",
			"Engine",
			"PrimordiaOSRealmBridge",
			"MCPComputeBridge",
		});

		PrivateDependencyModuleNames.AddRange(new string[]
		{
			"Json",
			"OnyxRuntime",
		});
	}
}

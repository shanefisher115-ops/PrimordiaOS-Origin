using System.IO;
using UnrealBuildTool;

// MCP on Unreal's render graph: the seven MCP kernels as global shaders (which is why this
// module loads at PostConfigInit), their GPU state, and the game-thread submission API.
public class MCPComputeBridge : ModuleRules
{
	public MCPComputeBridge(ReadOnlyTargetRules Target) : base(Target)
	{
		PCHUsage = PCHUsageMode.UseExplicitOrSharedPCHs;
		CppStandard = CppStandardVersion.Cpp20;

		// The GPU contract (MCPTypes.ush), the behavior-tree compiler and the host math are
		// shared with the standalone Vulkan engine and included from C++ as well as HLSL.
		PublicIncludePaths.Add(Path.Combine(PluginDirectory, "Shaders", "Shared"));

		PublicDependencyModuleNames.AddRange(new string[]
		{
			"Core",
			"CoreUObject",
			"Engine",
			"DeveloperSettings",
			"RenderCore",
			"RHI",
			"OnyxRuntime",
		});

		PrivateDependencyModuleNames.AddRange(new string[]
		{
			"Projects",
		});
	}
}

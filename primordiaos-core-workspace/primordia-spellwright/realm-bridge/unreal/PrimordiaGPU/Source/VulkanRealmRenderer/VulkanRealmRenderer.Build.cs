using UnrealBuildTool;

// The realm renderer inside Unreal: composites the MCP sigil field into the scene through the
// render graph (so it runs on whatever RHI Unreal uses, Vulkan or D3D12), and when the RHI is
// Vulkan, reads the native device (queues, VK_EXT_memory_budget) for Onyx. Loads at
// PostConfigInit because it declares a global shader.
public class VulkanRealmRenderer : ModuleRules
{
	public VulkanRealmRenderer(ReadOnlyTargetRules Target) : base(Target)
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
			"Renderer",
			"MCPComputeBridge",
			"OnyxRuntime",
		});

		bool bVulkan = Target.Platform == UnrealTargetPlatform.Win64 || Target.Platform.IsInGroup(UnrealPlatformGroup.Linux);
		if (bVulkan)
		{
			PrivateDependencyModuleNames.Add("VulkanRHI");
			AddEngineThirdPartyPrivateStaticDependencies(Target, "Vulkan");
		}
		PrivateDefinitions.Add("PRIMORDIA_WITH_VULKAN=" + (bVulkan ? "1" : "0"));
	}
}

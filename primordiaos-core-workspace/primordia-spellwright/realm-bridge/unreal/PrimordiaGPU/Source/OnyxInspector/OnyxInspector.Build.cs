using UnrealBuildTool;

// Editor panel for Onyx: Window > Onyx Inspector.
public class OnyxInspector : ModuleRules
{
	public OnyxInspector(ReadOnlyTargetRules Target) : base(Target)
	{
		PCHUsage = PCHUsageMode.UseExplicitOrSharedPCHs;
		CppStandard = CppStandardVersion.Cpp20;

		PrivateDependencyModuleNames.AddRange(new string[]
		{
			"Core",
			"CoreUObject",
			"Engine",
			"Slate",
			"SlateCore",
			"ToolMenus",
			"OnyxRuntime",
			"VulkanRealmRenderer",
		});
	}
}

using UnrealBuildTool;

public class PrimordiaOSRealmBridgeEditor : ModuleRules
{
	public PrimordiaOSRealmBridgeEditor(ReadOnlyTargetRules Target) : base(Target)
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
			"UnrealEd",
			"DesktopPlatform",
			"Settings",
			"PrimordiaOSRealmBridge",
		});
	}
}

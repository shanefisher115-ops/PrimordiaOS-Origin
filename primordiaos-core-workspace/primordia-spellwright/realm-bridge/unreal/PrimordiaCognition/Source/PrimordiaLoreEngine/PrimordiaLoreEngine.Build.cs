using UnrealBuildTool;

public class PrimordiaLoreEngine : ModuleRules
{
	public PrimordiaLoreEngine(ReadOnlyTargetRules Target) : base(Target)
	{
		PCHUsage = PCHUsageMode.UseExplicitOrSharedPCHs;
		CppStandard = CppStandardVersion.Cpp20;

		PublicDependencyModuleNames.AddRange(new string[]
		{
			"Core",
			"CoreUObject",
			"Engine",
		});

		PrivateDependencyModuleNames.AddRange(new string[]
		{
			"Json",
			"JsonUtilities",
			"Projects", // IPluginManager: locate Resources/Lore
		});
	}
}

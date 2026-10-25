using UnrealBuildTool;

public class PrimordiaDaVinciSubsystem : ModuleRules
{
	public PrimordiaDaVinciSubsystem(ReadOnlyTargetRules Target) : base(Target)
	{
		PCHUsage = PCHUsageMode.UseExplicitOrSharedPCHs;
		CppStandard = CppStandardVersion.Cpp20;

		PublicDependencyModuleNames.AddRange(new string[]
		{
			"Core",
			"CoreUObject",
			"Engine",
			"DeveloperSettings",
			"PrimordiaSpellwright",
		});

		PrivateDependencyModuleNames.AddRange(new string[]
		{
			"Json",
			"JsonUtilities",
			"PrimordiaBoltBridge",
			"PrimordiaLoreEngine",
		});
	}
}

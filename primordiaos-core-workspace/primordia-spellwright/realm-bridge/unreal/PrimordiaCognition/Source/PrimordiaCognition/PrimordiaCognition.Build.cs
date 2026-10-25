using UnrealBuildTool;

public class PrimordiaCognition : ModuleRules
{
	public PrimordiaCognition(ReadOnlyTargetRules Target) : base(Target)
	{
		PCHUsage = PCHUsageMode.UseExplicitOrSharedPCHs;
		CppStandard = CppStandardVersion.Cpp20;

		PublicDependencyModuleNames.AddRange(new string[]
		{
			"Core",
			"CoreUObject",
			"Engine",
			"DeveloperSettings",
			"Json",
			"PrimordiaLoreEngine",
			"PrimordiaSpellwright",
			"PrimordiaJulesSubsystem",
			"PrimordiaBoltBridge",
		});

		PrivateDependencyModuleNames.AddRange(new string[]
		{
			"HTTP",
			"JsonUtilities",
			"PrimordiaCADCAM",
			"PrimordiaBlenderSubsystem",
			"PrimordiaDaVinciSubsystem",
		});
	}
}

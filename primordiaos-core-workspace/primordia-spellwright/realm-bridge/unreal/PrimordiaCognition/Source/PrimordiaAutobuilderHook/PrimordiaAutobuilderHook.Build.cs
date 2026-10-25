using UnrealBuildTool;

public class PrimordiaAutobuilderHook : ModuleRules
{
	public PrimordiaAutobuilderHook(ReadOnlyTargetRules Target) : base(Target)
	{
		PCHUsage = PCHUsageMode.UseExplicitOrSharedPCHs;
		CppStandard = CppStandardVersion.Cpp20;

		PublicDependencyModuleNames.AddRange(new string[]
		{
			"Core",
			"CoreUObject",
			"Engine",
			"DeveloperSettings",
			"EditorSubsystem",
		});

		PrivateDependencyModuleNames.AddRange(new string[]
		{
			"UnrealEd",
			"HTTP",
			"Json",
			"JsonUtilities",
			"Slate",
			"SlateCore",
			"Projects",
			"PrimordiaLoreEngine",
			"PrimordiaSpellwright",
			"PrimordiaJulesSubsystem",
			"PrimordiaBoltBridge",
			"PrimordiaBlenderSubsystem",
		});

		if (Target.Platform == UnrealTargetPlatform.Win64)
		{
			PrivateDependencyModuleNames.Add("LiveCoding");
			PrivateDefinitions.Add("PRIMORDIA_WITH_LIVE_CODING=1");
		}
		else
		{
			PrivateDefinitions.Add("PRIMORDIA_WITH_LIVE_CODING=0");
		}
	}
}

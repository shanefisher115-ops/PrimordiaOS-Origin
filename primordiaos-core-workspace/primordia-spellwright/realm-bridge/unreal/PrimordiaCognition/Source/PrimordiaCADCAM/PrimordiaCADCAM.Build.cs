using UnrealBuildTool;

public class PrimordiaCADCAM : ModuleRules
{
	public PrimordiaCADCAM(ReadOnlyTargetRules Target) : base(Target)
	{
		PCHUsage = PCHUsageMode.UseExplicitOrSharedPCHs;
		CppStandard = CppStandardVersion.Cpp20;

		PublicDependencyModuleNames.AddRange(new string[]
		{
			"Core",
			"CoreUObject",
			"Engine",
			"PrimordiaSpellwright", // ExecuteStep takes and returns Spellwright types
		});

		PrivateDependencyModuleNames.AddRange(new string[]
		{
			"Json",
			"JsonUtilities",
			"PrimordiaBoltBridge",
			"PrimordiaLoreEngine", // FLoreText::SavedDir
		});
	}
}

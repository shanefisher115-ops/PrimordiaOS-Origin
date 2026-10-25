using UnrealBuildTool;

public class PrimordiaSpellwright : ModuleRules
{
	public PrimordiaSpellwright(ReadOnlyTargetRules Target) : base(Target)
	{
		PCHUsage = PCHUsageMode.UseExplicitOrSharedPCHs;
		CppStandard = CppStandardVersion.Cpp20;

		PublicDependencyModuleNames.AddRange(new string[]
		{
			"Core",
			"CoreUObject",
			"Engine",
			"PrimordiaLoreEngine", // the compiler inscribes glyphs and reads realm stability
		});

		PrivateDependencyModuleNames.AddRange(new string[]
		{
			"Json",
			"JsonUtilities",
		});
	}
}

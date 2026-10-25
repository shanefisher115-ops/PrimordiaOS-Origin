using UnrealBuildTool;

public class PrimordiaBoltBridge : ModuleRules
{
	public PrimordiaBoltBridge(ReadOnlyTargetRules Target) : base(Target)
	{
		PCHUsage = PCHUsageMode.UseExplicitOrSharedPCHs;
		CppStandard = CppStandardVersion.Cpp20;

		PublicDependencyModuleNames.AddRange(new string[]
		{
			"Core",
			"CoreUObject",
			"Engine",
			"DeveloperSettings",
			"Json",                 // public: job payloads are FJsonObjects in the native API
			"PrimordiaSpellwright", // SubmitSpell
		});

		PrivateDependencyModuleNames.AddRange(new string[]
		{
			"HTTP",
			"WebSockets",
			"JsonUtilities",
		});
	}
}

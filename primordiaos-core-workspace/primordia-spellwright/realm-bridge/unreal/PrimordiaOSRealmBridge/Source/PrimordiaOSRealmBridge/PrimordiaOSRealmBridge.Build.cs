using UnrealBuildTool;

public class PrimordiaOSRealmBridge : ModuleRules
{
	public PrimordiaOSRealmBridge(ReadOnlyTargetRules Target) : base(Target)
	{
		PCHUsage = PCHUsageMode.UseExplicitOrSharedPCHs;
		CppStandard = CppStandardVersion.Cpp20;

		PublicDependencyModuleNames.AddRange(new string[]
		{
			"Core",
			"CoreUObject",
			"Engine",
			"InputCore",
			"DeveloperSettings",
			"Json",
			"JsonUtilities",
			"Niagara",
		});

		PrivateDependencyModuleNames.AddRange(new string[]
		{
			"WebSockets",
			"NiagaraCore",
			"RenderCore",
		});

		// Editor-viewport camera for glyph billboarding during live editor previews.
		if (Target.bBuildEditor)
		{
			PrivateDependencyModuleNames.Add("UnrealEd");
		}
	}
}

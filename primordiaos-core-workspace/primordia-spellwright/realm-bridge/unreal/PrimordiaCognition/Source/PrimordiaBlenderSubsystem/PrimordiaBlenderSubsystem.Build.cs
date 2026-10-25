using UnrealBuildTool;

public class PrimordiaBlenderSubsystem : ModuleRules
{
	public PrimordiaBlenderSubsystem(ReadOnlyTargetRules Target) : base(Target)
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
			"PrimordiaSpellwright",
		});

		PrivateDependencyModuleNames.AddRange(new string[]
		{
			"HTTP",
			"JsonUtilities",
			"RenderCore",
			"MeshDescription",
			"StaticMeshDescription",
			"PrimordiaBoltBridge",
			"PrimordiaLoreEngine",
		});

		if (Target.bBuildEditor)
		{
			// Importing Blender's exports back as assets.
			PrivateDependencyModuleNames.AddRange(new string[] { "UnrealEd", "AssetTools" });
		}
	}
}

using UnrealBuildTool;

public class PrimordiaOllama : ModuleRules
{
	public PrimordiaOllama(ReadOnlyTargetRules Target) : base(Target)
	{
		PCHUsage = PCHUsageMode.UseExplicitOrSharedPCHs;
		CppStandard = CppStandardVersion.Cpp20;

		PublicDependencyModuleNames.AddRange(new string[]
		{
			"Core",
			"CoreUObject",
			"Engine",
			"DeveloperSettings",
			"PrimordiaOSRealmBridge", // public: FPrimordiaPacketInfo appears in our Blueprint headers
		});

		PrivateDependencyModuleNames.AddRange(new string[]
		{
			"HTTP",
			"Json",
			"JsonUtilities",
			"Projects",               // IPluginManager: locate Resources/Ollama
		});
	}
}

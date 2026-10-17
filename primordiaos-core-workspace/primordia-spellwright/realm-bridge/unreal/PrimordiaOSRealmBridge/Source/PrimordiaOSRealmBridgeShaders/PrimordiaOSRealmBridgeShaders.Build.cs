using UnrealBuildTool;

// Maps the plugin's Shaders/ folder to /Plugin/PrimordiaOSRealmBridge so materials can
// #include "/Plugin/PrimordiaOSRealmBridge/Private/PrimordiaSigil.ush". Shader paths must be
// registered before any material compiles, so this lives in its own PostConfigInit module.
public class PrimordiaOSRealmBridgeShaders : ModuleRules
{
	public PrimordiaOSRealmBridgeShaders(ReadOnlyTargetRules Target) : base(Target)
	{
		PCHUsage = PCHUsageMode.UseExplicitOrSharedPCHs;

		PrivateDependencyModuleNames.AddRange(new string[]
		{
			"Core",
			"RenderCore",
			"Projects",
		});
	}
}

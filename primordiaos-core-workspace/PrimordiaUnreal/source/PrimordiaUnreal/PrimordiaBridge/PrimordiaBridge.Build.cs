using UnrealBuildTool;

public class PrimordiaBridge : ModuleRules
{
public PrimordiaBridge(ReadOnlyTargetRules Target) : base(Target)
{
PCHUsage = ModuleRules.PCHUsageMode.UseExplicitOrSharedPCHs;

PublicDependencyModuleNames.AddRange(
new string[]
{
"Core",
"CoreUObject",
"Engine",
"Projects"
}
);
}
}
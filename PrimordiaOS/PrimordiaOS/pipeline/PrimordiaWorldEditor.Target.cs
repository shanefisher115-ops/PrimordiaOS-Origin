using UnrealBuildTool;

public class PrimordiaWorldEditorTarget : TargetRules
{
    public PrimordiaWorldEditorTarget(TargetInfo Target) : base(Target)
    {
        Type = TargetType.Editor;

        // Allow overriding build settings in installed engine builds
        bOverrideBuildEnvironment = true;

        // Use modern UE 5.8 defaults
        DefaultBuildSettings = BuildSettingsVersion.V7;
        IncludeOrderVersion = EngineIncludeOrderVersion.Unreal5_8;

        ExtraModuleNames.Add("PrimordiaWorld");
    }
}

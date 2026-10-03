using UnrealBuildTool;
using System.Collections.Generic;

public class PrimordiaUnrealEditorTarget : TargetRules
{
    public PrimordiaUnrealEditorTarget(TargetInfo Target) : base(Target)
    {
        Type = TargetType.Editor;
        DefaultBuildSettings = BuildSettingsVersion.V5;
        ExtraModuleNames.AddRange(new string[] { "PrimordiaUnreal", "PrimordiaBridge" });
    }
}

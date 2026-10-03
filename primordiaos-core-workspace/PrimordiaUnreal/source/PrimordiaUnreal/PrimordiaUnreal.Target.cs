using UnrealBuildTool;
using System.Collections.Generic;

public class PrimordiaUnrealTarget : TargetRules
{
    public PrimordiaUnrealTarget(TargetInfo Target) : base(Target)
    {
        Type = TargetType.Game;
        DefaultBuildSettings = BuildSettingsVersion.V5;
        ExtraModuleNames.AddRange(new string[] { "PrimordiaUnreal", "PrimordiaBridge" });
    }
}

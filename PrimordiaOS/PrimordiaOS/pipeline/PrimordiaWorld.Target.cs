using UnrealBuildTool;
using System.Collections.Generic;

public class PrimordiaWorldTarget : TargetRules
{
    public PrimordiaWorldTarget(TargetInfo Target) : base(Target)
    {
        Type = TargetType.Game;
        DefaultBuildSettings = BuildSettingsVersion.V5;
        ExtraModuleNames.Add("PrimordiaWorld");
    }
}

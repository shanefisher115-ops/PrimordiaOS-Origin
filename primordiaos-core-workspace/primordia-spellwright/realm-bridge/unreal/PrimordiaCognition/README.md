# PrimordiaCognition (Unreal 5.4 plugin)

Engine-native cognition for PrimordiaOS. Every cycle (once a second; the executor also advances
every frame) the loop runs:

```
world-state -> memory -> lore -> model proposals -> HTN planning -> Spellwright -> validation
            -> Jules -> intent routing -> action -> Bolt pipeline (CAD/CAM, Blender, Resolve, builds)
```

The pipeline servers it talks to are in `../../pipeline` (see its README).

## Modules

| Module | Type | Key classes |
|---|---|---|
| PrimordiaLoreEngine | Runtime | `FLoreEntry/Realm/Faction/Event/Glyph`, `FLoreCodex` (TF-IDF queries, glyph language), `FLoreQuery`, `FLoreEvolver`, `UPrimordiaLoreSubsystem` |
| PrimordiaSpellwright | Runtime | `FSpellwrightSpell/Step/Intent`, `FSpellwrightCompiler` (DSL + templates), `FSpellwrightValidator`, `FSpellwrightSerializer`, `FSpellwrightOpRegistry`, `UPrimordiaSpellwrightSubsystem` |
| PrimordiaJulesSubsystem | Runtime | `FJulesRule`, `FJulesConstraint`, `FJulesEngine`, `FJulesReport`, `UPrimordiaJulesSubsystem` |
| PrimordiaBoltBridge | Runtime | `UPrimordiaBoltBridgeSubsystem` (REST 7778 + WebSocket 7780, offline queue, polling fallback) |
| PrimordiaCADCAM | Runtime | `FCadGeometry`, `FCadToolpathGenerator`, `FCadGCodeCompiler` (write + read), `FCadFabricationSimulator`, `FCadFabricationJob`, `UPrimordiaCADCAMSubsystem` |
| PrimordiaBlenderSubsystem | Runtime | `FBlenderJob`, `FBlenderRpcClient`, mesh export to Blender space, editor import, `UPrimordiaBlenderSubsystem` |
| PrimordiaDaVinciSubsystem | Runtime | `FDaVinciJob`, timeline assembly from render folders, grade, render, `UPrimordiaDaVinciSubsystem` |
| PrimordiaCognition | Runtime | `UPrimordiaCognitionSubsystem` (tickable world subsystem), `FPrimordiaWorldState`, `FPrimordiaMemory`, `FPrimordiaPlanner`, `FPrimordiaIntentRouter`, `FPrimordiaActionExecutor`, `IPrimordiaModelBridge` (rules, Ollama) |
| PrimordiaAutobuilderHook | Editor | `UPrimordiaAutobuilderHook`: `RequestRebuild` (Live Coding, else the Autobuilder), `RequestDeploy`, startup validation |

Data lives in `Resources/`: `Lore/codex.json` (the founding codex), `Spellwright/templates.spell`
(one template per verb), `Jules/rules.json` and `Jules/bolt.allowlist.json`, `Planner/methods.json`
and `Planner/triggers.json`. Runtime state goes to `<Project>/Saved/Primordia/`: the evolved
codex, memory, G-code and reports, renders. A file in `Saved/Primordia/Jules/rules.json` replaces
the shipped rules; `Saved/Primordia/Spellwright/*.spell` adds or overrides templates.

## Install

```bash
pwsh -File ../../pipeline/scripts/Install-PrimordiaModules.ps1
```

copies the plugin into PrimordiaRealms and enables it. The project has no C++ of its own, so open
it and accept "rebuild modules", or close the editor and run
`Build-PrimordiaModules.ps1 -Mode Project`.

## Using it

**Goals** (Blueprint or C++): `AddGoal("illuminate_realm", {tag: Primordia.Lantern, count: 3, intensity: 6000})`.
The planner picks a method (raise lanterns then light them, or just light the ones standing),
Spellwright writes each step as a spell, Jules judges the whole plan, then the spells run in order.

**Spells** directly: `CastSpell(source)`:

```
spell beacon : illumination {
    realm realm_heart
    world.spawn class=/Script/Engine.PointLight at=0,0,400 tag=Primordia.Beacon as lamp
    world.light Primordia.Beacon intensity=20000 color=0.4,0.8,1 after lamp
}
```

**Verbs** (templates): fabricate, simulate, sculpt, render, animate, edit, film, manifest,
illuminate, unmake, chronicle, evolve, inscribe, rebuild, deploy.

**Triggers** (the deterministic model) propose goals by themselves: an unstable realm gets
warded, actors tagged `Primordia.Lantern` get lit, actors tagged `Primordia.Fabricate` get a plate
milled (or simulated while the pipeline is offline), and after ten minutes of play the realm's
chronicle is kept. Set Project Settings > Plugins > PrimordiaOS Cognition > Model Backend to
`Ollama` to let a local model propose goals too (it can only name known tasks; Jules still
judges everything), or `None` for no proposals at all.

## Jules, briefly

Spells are rejected when they break a realm's law (forbidden schools or ops in the codex), an
influential faction's law, the machine envelope (stock up to 600 x 400 x 120 mm, tools 0.5-25 mm),
rate limits (6 renders a minute, 2 builds per 10 minutes), the pipeline allow-list, or when they
write into system folders. The planner and the model can never destroy actors; a user-cast spell
can, where the Lattice Wardens do not rule.

## Tests

Session Frontend > Automation > "Primordia", or headless:

```
UnrealEditor-Cmd.exe <project>.uproject -ExecCmds="Automation RunTests Primordia;Quit" -unattended -nullrhi -nosplash
```
